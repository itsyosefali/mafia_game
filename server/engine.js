// ============================================================
// engine.js — Phase transitions, turn loop & resolution
// السحارة (Al-Sahara)
// ============================================================

const {
  buildDrawPile,
  buildTrialPool,
  buildCharacterDeck,
  getCardDef,
  shuffle,
} = require('../shared/cards');
const {
  MIN_PLAYERS,
  MAX_PLAYERS,
  TRIAL_CARDS_PER_PLAYER,
  DRAW_COUNT,
  DEFEND_DISCARD_COUNT,
  LAST_WORDS_LIMIT,
  PHASES,
  TEAMS,
} = require('../shared/constants');
const {
  isWitch,
  isSheikh,
  getAlivePlayers,
  getAliveWitches,
  getAliveSheikh,
  checkWinCondition,
} = require('./game');
const { applyCardEffect } = require('./cards');

// Outcome codes returned to the socket layer.
const NEXT = {
  CONTINUE: 'continue', // still day, waiting on current player
  AWAIT: 'await', // a pending event needs player input
  NIGHT: 'night', // night phase started
  ENDED: 'ended', // game over
};

// ─────────────────────────────────────
// SETUP
// ─────────────────────────────────────

function startGame(game) {
  if (game.phase !== PHASES.LOBBY) {
    return { success: false, error: 'اللعبة ليست في الردهة' };
  }
  const count = game.players.length;
  if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
    return { success: false, error: `يلزم من ${MIN_PLAYERS} إلى ${MAX_PLAYERS} لاعبين` };
  }

  // 1. Characters (public, one each)
  const characters = buildCharacterDeck();
  game.players.forEach((p, i) => {
    p.characterCardId = characters[i % characters.length].id;
  });

  // 2. Trial cards (hidden allegiance)
  const trialPool = buildTrialPool(count);
  const perPlayer = TRIAL_CARDS_PER_PLAYER[count];
  let idx = 0;
  game.players.forEach((p) => {
    p.trialCards = [];
    for (let i = 0; i < perPlayer; i++) {
      const t = trialPool[idx++];
      p.trialCards.push({ uid: t.uid, kind: t.kind, revealed: false });
    }
  });

  // 3. Draw pile + initial hands of 3
  game.drawPile = buildDrawPile();
  game.discardPile = [];
  game.players.forEach((p) => {
    p.hand = drawN(game, 3);
  });

  // 4. Turn order; the holder of Greatness (if any) begins, else the host.
  game.turnOrder = game.players.map((p) => p.id);
  game.actedThisRound = [];
  const greatnessHolder = game.players.find((p) =>
    p.hand.some((c) => c.cardId === 'greatness')
  );
  game.currentTurnPlayerId = greatnessHolder ? greatnessHolder.id : game.hostId;

  game.phase = PHASES.DAY;
  game.round = 1;
  game.log.push({ type: 'system', message: '🎴 وُزّعت الكروت. لتبدأ السحارة!' });
  game.log.push({
    type: 'phase',
    message: `☀️ نهار ${game.round} — دور ${nameOf(game, game.currentTurnPlayerId)}.`,
  });

  return { success: true };
}

function nameOf(game, id) {
  const p = game.players.find((x) => x.id === id);
  return p ? p.name : '؟';
}

// ─────────────────────────────────────
// DECK HELPERS
// ─────────────────────────────────────

function drawN(game, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (game.drawPile.length === 0) {
      if (game.discardPile.length === 0) break;
      game.drawPile = shuffle(game.discardPile);
      game.discardPile = [];
    }
    drawn.push(game.drawPile.pop());
  }
  return drawn;
}

function discard(game, instance) {
  game.discardPile.push(instance);
}

// ─────────────────────────────────────
// DAY: DRAW
// ─────────────────────────────────────

function drawCards(game, playerId) {
  if (game.phase !== PHASES.DAY) return { success: false, error: 'ليست مرحلة النهار' };
  if (game.pendingEvent) return { success: false, error: 'يوجد حدث قيد الحل' };
  if (game.currentTurnPlayerId !== playerId) return { success: false, error: 'ليس دورك' };

  const player = game.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return { success: false, error: 'لا يمكنك اللعب' };

  const drawn = drawN(game, DRAW_COUNT);
  const kept = [];
  let triggerNight = false;
  let triggerConspiracy = false;

  // Black cards resolve immediately on draw.
  drawn.forEach((inst) => {
    const def = getCardDef(inst.cardId);
    if (def && def.effect === 'conspiracy') {
      triggerConspiracy = true;
      discard(game, inst);
    } else if (def && def.effect === 'nightfall') {
      triggerNight = true;
      discard(game, inst);
    } else {
      kept.push(inst);
    }
  });

  player.hand.push(...kept);
  game.log.push({ type: 'turn', message: `🃏 ${player.name} سحب من الكومة.` });

  if (triggerConspiracy) {
    runConspiracy(game, playerId);
    const win = checkWinCondition(game);
    if (win) return { success: true, next: NEXT.ENDED, winner: win, drawnPrivate: kept };
  }

  if (triggerNight) {
    startNight(game);
    return { success: true, next: NEXT.NIGHT, drawnPrivate: kept };
  }

  // Drawing ends the turn.
  const adv = endTurnInternal(game);
  return { success: true, next: adv.next, winner: adv.winner, drawnPrivate: kept };
}

// ─────────────────────────────────────
// DAY: PLAY A CARD
// ─────────────────────────────────────

function playCard(game, playerId, uid, payload = {}) {
  if (game.phase !== PHASES.DAY) return { success: false, error: 'ليست مرحلة النهار' };
  if (game.pendingEvent) return { success: false, error: 'يوجد حدث قيد الحل' };
  if (game.currentTurnPlayerId !== playerId) return { success: false, error: 'ليس دورك' };

  const player = game.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return { success: false, error: 'لا يمكنك اللعب' };

  const handIdx = player.hand.findIndex((c) => c.uid === uid);
  if (handIdx === -1) return { success: false, error: 'الكرت ليس في يدك' };

  const instance = player.hand[handIdx];
  player.hand.splice(handIdx, 1);

  const res = applyCardEffect(game, player, instance, payload);
  if (!res.success) {
    player.hand.splice(handIdx, 0, instance); // restore on failure
    return res;
  }

  if (!res.consumedToInFront) discard(game, instance);

  // Chained effects.
  if (res.conspiracy) {
    runConspiracy(game, playerId);
    const win = checkWinCondition(game);
    if (win) return { success: true, next: NEXT.ENDED, winner: win };
    return { success: true, next: NEXT.CONTINUE };
  }
  if (res.night) {
    startNight(game);
    return { success: true, next: NEXT.NIGHT };
  }
  if (res.trial) {
    game.pendingEvent = { type: 'trial', accusedId: res.trial.accusedId, accuserId: res.trial.accuserId };
    game.phase = PHASES.TRIAL;
    game.log.push({
      type: 'trial',
      message: `⚖️ تجمّعت التهم على ${nameOf(game, res.trial.accusedId)}. حان وقت المحاكمة!`,
    });
    return { success: true, next: NEXT.AWAIT };
  }
  if (res.attack) {
    beginAttackResponse(game, res.attack.victimId, false);
    return { success: true, next: NEXT.AWAIT };
  }

  // Normal play — player may continue or end their turn.
  return { success: true, next: NEXT.CONTINUE };
}

// ─────────────────────────────────────
// DAY: END TURN
// ─────────────────────────────────────

function endTurn(game, playerId) {
  if (game.phase !== PHASES.DAY) return { success: false, error: 'ليست مرحلة النهار' };
  if (game.pendingEvent) return { success: false, error: 'يوجد حدث قيد الحل' };
  if (game.currentTurnPlayerId !== playerId) return { success: false, error: 'ليس دورك' };
  return endTurnInternal(game);
}

function endTurnInternal(game) {
  const current = game.currentTurnPlayerId;
  if (!game.actedThisRound.includes(current)) game.actedThisRound.push(current);

  const aliveIds = game.turnOrder.filter((id) => {
    const p = game.players.find((x) => x.id === id);
    return p && p.alive;
  });
  const notActed = aliveIds.filter((id) => !game.actedThisRound.includes(id));

  if (notActed.length === 0) {
    // Full round complete → night falls.
    startNight(game);
    return { success: true, next: NEXT.NIGHT };
  }

  // Next un-acted player, in seating order after the current seat.
  const startSeat = game.turnOrder.indexOf(current);
  let nextId = null;
  for (let step = 1; step <= game.turnOrder.length; step++) {
    const candidate = game.turnOrder[(startSeat + step) % game.turnOrder.length];
    if (notActed.includes(candidate)) {
      nextId = candidate;
      break;
    }
  }
  game.currentTurnPlayerId = nextId || notActed[0];
  game.log.push({ type: 'turn', message: `➡️ دور ${nameOf(game, game.currentTurnPlayerId)}.` });
  return { success: true, next: NEXT.CONTINUE };
}

// ─────────────────────────────────────
// TRIAL (7 red cards)
// ─────────────────────────────────────

function resolveTrial(game, accuserId, trialIndex) {
  if (game.phase !== PHASES.TRIAL || !game.pendingEvent || game.pendingEvent.type !== 'trial') {
    return { success: false, error: 'لا توجد محاكمة جارية' };
  }
  if (game.pendingEvent.accuserId !== accuserId) {
    return { success: false, error: 'صاحب التهمة الأخيرة فقط يكشف الورقة' };
  }
  const accused = game.players.find((p) => p.id === game.pendingEvent.accusedId);
  if (!accused) return { success: false, error: 'المتهم غير موجود' };

  const hidden = accused.trialCards.filter((t) => !t.revealed);
  const trial = hidden[trialIndex];
  if (!trial) return { success: false, error: 'اختر ورقة محاكمة غير مكشوفة' };

  trial.revealed = true;
  game.pendingEvent = null;

  if (trial.kind === 'sahara') {
    game.log.push({
      type: 'death',
      message: `⚖️ كُشف عن ${accused.name}: كان سحّارة! تُنفَّذ المحاكمة.`,
    });
    return finishElimination(game, accused.id, `أُعدم ${accused.name} في المحاكمة.`);
  }

  // Innocent of witchcraft — clear the accusations.
  clearRedCards(accused);
  game.phase = PHASES.DAY;
  game.log.push({
    type: 'trial',
    message: `⚖️ ${accused.name} بريء (${trial.kind === 'sheikh' ? 'الشيخ' : 'مواطن'}). أُزيلت التهم.`,
  });
  return { success: true, next: NEXT.CONTINUE };
}

function clearRedCards(player) {
  player.inFront = player.inFront.filter((c) => {
    const def = getCardDef(c.cardId);
    return !(def && def.type === 'red');
  });
}

// ─────────────────────────────────────
// NIGHT
// ─────────────────────────────────────

function startNight(game) {
  game.phase = PHASES.NIGHT;
  game.nightActions = { witchVotes: {}, sheikhTargetId: null };
  game.actedThisRound = [];
  game.log.push({ type: 'phase', message: '🌙 حلّ الظلام... تستيقظ السحارة.' });
  return { success: true };
}

function submitWitchVote(game, playerId, targetId) {
  if (game.phase !== PHASES.NIGHT) return { success: false, error: 'ليست مرحلة الليل' };
  const player = game.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return { success: false, error: 'لا يمكنك التصرّف' };
  if (!isWitch(player)) return { success: false, error: 'لست من السحارة' };

  const target = game.players.find((p) => p.id === targetId);
  if (!target || !target.alive) return { success: false, error: 'هدف غير صالح' };
  if (target.id === playerId) return { success: false, error: 'لا يمكنك استهداف نفسك' };
  if (isWitch(target)) return { success: false, error: 'لا يمكن استهداف ساحرة أخرى' };

  game.nightActions.witchVotes[playerId] = targetId;
  return { success: true };
}

function submitSheikhProtect(game, playerId, targetId) {
  if (game.phase !== PHASES.NIGHT) return { success: false, error: 'ليست مرحلة الليل' };
  const player = game.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return { success: false, error: 'لا يمكنك التصرّف' };
  if (!isSheikh(player)) return { success: false, error: 'لست الشيخ' };

  const target = game.players.find((p) => p.id === targetId);
  if (!target || !target.alive) return { success: false, error: 'هدف غير صالح' };
  if (target.id === playerId) return { success: false, error: 'لا يمكن للشيخ حماية نفسه' };

  game.nightActions.sheikhTargetId = targetId;
  return { success: true };
}

function allNightActionsIn(game) {
  const witches = getAliveWitches(game);
  const allWitchesVoted = witches.every((w) => game.nightActions.witchVotes[w.id]);
  const sheikh = getAliveSheikh(game);
  const sheikhDone = !sheikh || game.nightActions.sheikhTargetId !== null;
  return allWitchesVoted && sheikhDone;
}

function resolveNight(game) {
  // Tally witch votes (majority; first vote breaks ties).
  const tally = {};
  let victimId = null;
  let max = 0;
  for (const tid of Object.values(game.nightActions.witchVotes)) {
    tally[tid] = (tally[tid] || 0) + 1;
    if (tally[tid] > max) {
      max = tally[tid];
      victimId = tid;
    }
  }

  if (!victimId) {
    game.phase = PHASES.DAY;
    game.round += 1;
    game.log.push({ type: 'night', message: '🌅 طلع الفجر ولم تُختر ضحية.' });
    return resumeDayAfterNight(game);
  }

  const protectedNow = game.nightActions.sheikhTargetId === victimId;
  beginAttackResponse(game, victimId, protectedNow);
  return { success: true, next: NEXT.AWAIT };
}

// ─────────────────────────────────────
// ATTACK RESPONSE (defend or stay silent)
// ─────────────────────────────────────

function beginAttackResponse(game, victimId, isProtected) {
  game.pendingEvent = { type: 'attack_response', victimId, protected: isProtected };
  game.phase = PHASES.ATTACK_RESPONSE;
  game.log.push({
    type: 'attack',
    message: `🗡️ هُوجم ${nameOf(game, victimId)}! عليه أن يدافع أو يصمت.`,
  });
}

function resolveAttackResponse(game, playerId, action) {
  if (
    game.phase !== PHASES.ATTACK_RESPONSE ||
    !game.pendingEvent ||
    game.pendingEvent.type !== 'attack_response'
  ) {
    return { success: false, error: 'لا يوجد هجوم لحلّه' };
  }
  if (game.pendingEvent.victimId !== playerId) {
    return { success: false, error: 'الضحية فقط يمكنها الرد' };
  }
  const victim = game.players.find((p) => p.id === playerId);
  if (!victim) return { success: false, error: 'الضحية غير موجودة' };

  const wasProtected = game.pendingEvent.protected;

  if (action && action.defend) {
    if (victim.hand.length < DEFEND_DISCARD_COUNT) {
      return { success: false, error: 'لا تملك كروتاً كافية للدفاع' };
    }
    const toDiscard = victim.hand.splice(0, DEFEND_DISCARD_COUNT);
    toDiscard.forEach((c) => discard(game, c));
    game.pendingEvent = null;
    game.phase = PHASES.DAY;
    game.round += 1;
    game.log.push({
      type: 'attack',
      message: `🛡️ دافع ${victim.name} عن نفسه وتخلّص من كرتين ونجا.`,
    });
    return resumeDayAfterNight(game);
  }

  // Stay silent.
  game.pendingEvent = null;
  if (wasProtected) {
    game.phase = PHASES.DAY;
    game.round += 1;
    game.log.push({ type: 'attack', message: `🛡️ صمت ${victim.name}... وقد حماه الشيخ فنجا!` });
    return resumeDayAfterNight(game);
  }
  game.log.push({ type: 'death', message: `💀 صمت ${victim.name}... ولم يكن محمياً. سقط.` });
  const outcome = finishElimination(game, victim.id, null, /*resumeNight*/ true);
  return outcome;
}

/**
 * After a night attack resolves without ending the game, set up the new day.
 */
function resumeDayAfterNight(game) {
  const win = checkWinCondition(game);
  if (win) {
    endGame(game, win);
    return { success: true, next: NEXT.ENDED, winner: win };
  }
  game.phase = PHASES.DAY;
  game.actedThisRound = [];
  game.currentTurnPlayerId = firstAliveSeat(game);
  game.log.push({
    type: 'phase',
    message: `☀️ نهار ${game.round} — دور ${nameOf(game, game.currentTurnPlayerId)}.`,
  });
  return { success: true, next: NEXT.CONTINUE };
}

/**
 * Self-heal: if the day turn is sitting on a dead/missing player (e.g. they
 * died to a Link or trial chain during their own turn), advance it. Returns
 * the endTurn outcome, or null if nothing needed healing.
 */
function healDayTurn(game) {
  if (game.phase !== PHASES.DAY || game.pendingEvent) return null;
  const cur = game.players.find((p) => p.id === game.currentTurnPlayerId);
  if (cur && cur.alive) return null;
  return endTurnInternal(game);
}

function firstAliveSeat(game) {
  const id = game.turnOrder.find((pid) => {
    const p = game.players.find((x) => x.id === pid);
    return p && p.alive;
  });
  return id || null;
}

// ─────────────────────────────────────
// ELIMINATION, LINK & LAST WORDS
// ─────────────────────────────────────

/**
 * Kill a player, reveal their trial cards, propagate Link deaths, then either
 * open a last-words prompt or resume play. `resumeNight` marks that we came
 * from a night attack (new day should start once last words are done).
 */
function finishElimination(game, playerId, extraLog, resumeNight = false) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return { success: true, next: NEXT.CONTINUE };

  player.alive = false;
  player.trialCards.forEach((t) => (t.revealed = true));
  if (extraLog) game.log.push({ type: 'death', message: extraLog });

  // Link propagation.
  if (player.linkedTo) {
    const partner = game.players.find((p) => p.id === player.linkedTo);
    if (partner && partner.alive) {
      partner.alive = false;
      partner.trialCards.forEach((t) => (t.revealed = true));
      game.log.push({
        type: 'death',
        message: `🔗 سقط ${partner.name} لارتباطه بـ ${player.name}.`,
      });
    }
  }

  const win = checkWinCondition(game);
  if (win) {
    endGame(game, win);
    return { success: true, next: NEXT.ENDED, winner: win };
  }

  // Open last-words prompt for the primary eliminated player.
  game.pendingEvent = { type: 'last_words', playerId, resumeNight };
  game.phase = PHASES.DAY; // visually back to day while they speak
  return { success: true, next: NEXT.AWAIT };
}

function submitLastWords(game, playerId, words) {
  if (!game.pendingEvent || game.pendingEvent.type !== 'last_words') {
    return { success: false, error: 'لا يوجد طلب كلمات أخيرة' };
  }
  if (game.pendingEvent.playerId !== playerId) {
    return { success: false, error: 'ليست كلماتك الأخيرة' };
  }
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'اللاعب غير موجود' };

  const trimmed = String(words || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, LAST_WORDS_LIMIT)
    .join(' ');
  player.lastWords = trimmed || '...';
  player.hasSpoken = true;
  if (trimmed) {
    game.log.push({ type: 'death', message: `🗣️ كلمات ${player.name} الأخيرة: «${trimmed}»` });
  }

  const resumeNight = game.pendingEvent.resumeNight;
  game.pendingEvent = null;

  return finalizeAfterEvent(game, resumeNight);
}

/**
 * Decide what happens once a last-words prompt closes.
 */
function finalizeAfterEvent(game, resumeNight) {
  const win = checkWinCondition(game);
  if (win) {
    endGame(game, win);
    return { success: true, next: NEXT.ENDED, winner: win };
  }

  if (resumeNight) {
    return resumeDayAfterNight(game);
  }

  // Eliminated during the day — if the current turn player is dead, advance.
  const current = game.players.find((p) => p.id === game.currentTurnPlayerId);
  if (!current || !current.alive) {
    return endTurnInternal(game);
  }
  game.phase = PHASES.DAY;
  return { success: true, next: NEXT.CONTINUE };
}

// ─────────────────────────────────────
// CONSPIRACY (role-card rotation)
// ─────────────────────────────────────

function runConspiracy(game, drawerId) {
  const order = game.turnOrder.filter((id) => {
    const p = game.players.find((x) => x.id === id);
    return p; // include all dealt players (alive or not keep counts stable among alive)
  });
  const alive = order.filter((id) => {
    const p = game.players.find((x) => x.id === id);
    return p && p.alive;
  });

  // Reveal one unrevealed trial of the drawer's left neighbour.
  const drawerSeat = alive.indexOf(drawerId);
  if (drawerSeat !== -1 && alive.length > 1) {
    const leftId = alive[(drawerSeat + 1) % alive.length];
    const leftP = game.players.find((p) => p.id === leftId);
    const hidden = leftP.trialCards.filter((t) => !t.revealed);
    if (hidden.length > 0) {
      const pick = hidden[Math.floor(Math.random() * hidden.length)];
      pick.revealed = true;
      game.log.push({
        type: 'trial',
        message: `🩸 المؤامرة! كُشفت ورقة ${leftP.name}.`,
      });
    }
  }

  // Each alive player gives one unrevealed trial to the next (left) player.
  const gifts = alive.map((id) => {
    const p = game.players.find((x) => x.id === id);
    const hiddenIdx = p.trialCards.findIndex((t) => !t.revealed);
    if (hiddenIdx === -1) return null;
    return p.trialCards.splice(hiddenIdx, 1)[0];
  });

  alive.forEach((id, i) => {
    const giver = (i - 1 + alive.length) % alive.length;
    const gift = gifts[giver];
    if (gift) {
      const p = game.players.find((x) => x.id === id);
      p.trialCards.push(gift);
    }
  });

  game.log.push({ type: 'phase', message: '🩸 دارت أوراق المحاكمة بين اللاعبين!' });
}

// ─────────────────────────────────────
// END
// ─────────────────────────────────────

function endGame(game, winner) {
  game.phase = PHASES.ENDED;
  game.winner = winner;
  game.pendingEvent = null;
  game.players.forEach((p) => p.trialCards.forEach((t) => (t.revealed = true)));
  const text = winner === TEAMS.SAHARA ? '🧙‍♀️ فاز فريق السحارة' : '🧍 فاز المواطنون';
  game.log.push({ type: 'system', message: `🏁 انتهت اللعبة! ${text}.` });
  return { success: true };
}

module.exports = {
  NEXT,
  startGame,
  drawCards,
  playCard,
  endTurn,
  healDayTurn,
  resolveTrial,
  startNight,
  submitWitchVote,
  submitSheikhProtect,
  allNightActionsIn,
  resolveNight,
  resolveAttackResponse,
  submitLastWords,
  endGame,
  checkWinCondition,
};
