// ============================================================
// sockets.js — Socket.IO Event Handlers (السحارة)
// ============================================================

const {
  createGame,
  addPlayer,
  addBot,
  removeBot,
  removePlayer,
  getPlayerState,
  isWitch,
  getAliveSheikh,
} = require('./game');
const { getCardDef } = require('../shared/cards');

const {
  NEXT,
  startGame,
  drawCards,
  playCard,
  endTurn,
  resolveTrial,
  submitWitchVote,
  submitSheikhProtect,
  allNightActionsIn,
  resolveNight,
  resolveAttackResponse,
  submitLastWords,
  healDayTurn,
} = require('./engine');

const { PHASES } = require('../shared/constants');

// In-memory game storage.
const games = {};
const socketMap = {};

// Timer durations (ms) for each waiting state.
const TIMERS = {
  TURN: 90000,
  NIGHT: 60000,
  TRIAL: 40000,
  ATTACK: 40000,
  LAST_WORDS: 25000,
};

const timers = {}; // gameId -> { token, handle }

function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── CREATE GAME ───
    socket.on('create_game', ({ name }, callback) => {
      if (!name || name.trim().length === 0) {
        return callback({ success: false, error: 'الاسم مطلوب' });
      }
      const game = createGame(socket.id, name.trim());
      games[game.id] = game;
      socketMap[socket.id] = { gameId: game.id, playerId: socket.id };
      socket.join(game.id);
      console.log(`[Game] Created ${game.id} by ${name}`);
      callback({ success: true, gameId: game.id });
      broadcastState(io, game);
    });

    // ─── JOIN GAME ───
    socket.on('join_game', ({ gameId, name }, callback) => {
      if (!gameId || !name || name.trim().length === 0) {
        return callback({ success: false, error: 'رمز اللعبة والاسم مطلوبان' });
      }
      const game = games[gameId.toUpperCase()];
      if (!game) return callback({ success: false, error: 'اللعبة غير موجودة' });

      const result = addPlayer(game, socket.id, name.trim());
      if (!result.success) return callback(result);

      socketMap[socket.id] = { gameId: game.id, playerId: socket.id };
      socket.join(game.id);
      console.log(`[Game ${game.id}] ${name} joined`);
      callback({ success: true, gameId: game.id });
      broadcastState(io, game);
    });

    // ─── START GAME (host) ───
    socket.on('start_game', (_, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      if (socket.id !== game.hostId) {
        return callback({ success: false, error: 'المضيف فقط يبدأ اللعبة' });
      }
      const result = startGame(game);
      if (!result.success) return callback(result);
      callback({ success: true });
      afterChange(io, game);
    });

    // ─── ADD BOT (host, lobby) ───
    socket.on('add_bot', (_, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      if (socket.id !== game.hostId) {
        return callback({ success: false, error: 'المضيف فقط يضيف بوتات' });
      }
      const res = addBot(game);
      if (!res.success) return callback(res);
      callback({ success: true });
      broadcastState(io, game);
    });

    // ─── REMOVE BOT (host, lobby) ───
    socket.on('remove_bot', ({ botId }, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      if (socket.id !== game.hostId) {
        return callback({ success: false, error: 'المضيف فقط يزيل بوتات' });
      }
      const res = removeBot(game, botId);
      if (!res.success) return callback(res);
      callback({ success: true });
      broadcastState(io, game);
    });

    // ─── DRAW ───
    socket.on('draw_cards', (_, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      disarmTimer(game);
      const outcome = drawCards(game, socket.id);
      if (!outcome.success) {
        armTimer(io, game);
        return callback(outcome);
      }
      if (outcome.drawnPrivate && outcome.drawnPrivate.length) {
        io.to(socket.id).emit('card_drawn', { cards: outcome.drawnPrivate });
      }
      callback({ success: true });
      afterChange(io, game);
    });

    // ─── PLAY CARD ───
    socket.on('play_card', ({ uid, payload }, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      disarmTimer(game);
      const outcome = playCard(game, socket.id, uid, payload || {});
      if (!outcome.success) {
        armTimer(io, game);
        return callback(outcome);
      }
      callback({ success: true });
      afterChange(io, game);
    });

    // ─── END TURN ───
    socket.on('end_turn', (_, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      disarmTimer(game);
      const outcome = endTurn(game, socket.id);
      if (!outcome.success) {
        armTimer(io, game);
        return callback(outcome);
      }
      callback({ success: true });
      afterChange(io, game);
    });

    // ─── TRIAL REVEAL ───
    socket.on('resolve_trial', ({ trialIndex }, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      disarmTimer(game);
      const outcome = resolveTrial(game, socket.id, trialIndex);
      if (!outcome.success) {
        armTimer(io, game);
        return callback(outcome);
      }
      callback({ success: true });
      afterChange(io, game);
    });

    // ─── NIGHT: WITCH VOTE ───
    socket.on('witch_vote', ({ targetId }, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      const res = submitWitchVote(game, socket.id, targetId);
      if (!res.success) return callback(res);
      callback({ success: true });
      maybeResolveNight(io, game);
    });

    // ─── NIGHT: SHEIKH PROTECT ───
    socket.on('sheikh_protect', ({ targetId }, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      const res = submitSheikhProtect(game, socket.id, targetId);
      if (!res.success) return callback(res);
      callback({ success: true });
      maybeResolveNight(io, game);
    });

    // ─── ATTACK RESPONSE ───
    socket.on('attack_response', ({ defend }, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      disarmTimer(game);
      const outcome = resolveAttackResponse(game, socket.id, { defend: !!defend, staySilent: !defend });
      if (!outcome.success) {
        armTimer(io, game);
        return callback(outcome);
      }
      callback({ success: true });
      afterChange(io, game);
    });

    // ─── LAST WORDS ───
    socket.on('submit_last_words', ({ words }, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      disarmTimer(game);
      const outcome = submitLastWords(game, socket.id, words);
      if (!outcome.success) {
        armTimer(io, game);
        return callback(outcome);
      }
      callback({ success: true });
      afterChange(io, game);
    });

    // ─── DISCONNECT ───
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      const info = socketMap[socket.id];
      if (info) {
        const game = games[info.gameId];
        if (game) {
          removePlayer(game, socket.id);
          broadcastState(io, game);
          const humans = game.players.filter((p) => !p.isBot);
          if (humans.length === 0 || humans.every((p) => !p.connected)) {
            disarmTimer(game);
            disarmBots(game);
            delete games[info.gameId];
            console.log(`[Game] Cleaned up ${info.gameId}`);
          }
        }
        delete socketMap[socket.id];
      }
    });

    // ─── REQUEST STATE (reconnect) ───
    socket.on('request_state', (_, callback) => {
      const game = gameFor(socket, callback);
      if (!game) return;
      callback({ success: true, state: getPlayerState(game, socket.id) });
    });
  });
}

// ─────────────────────────────────────
// HELPERS
// ─────────────────────────────────────

function gameFor(socket, callback) {
  const info = socketMap[socket.id];
  if (!info) {
    callback({ success: false, error: 'لست في لعبة' });
    return null;
  }
  const game = games[info.gameId];
  if (!game) {
    callback({ success: false, error: 'اللعبة غير موجودة' });
    return null;
  }
  return game;
}

function maybeResolveNight(io, game) {
  if (game.phase === PHASES.NIGHT && allNightActionsIn(game)) {
    disarmTimer(game);
    resolveNight(game);
    afterChange(io, game);
  } else {
    broadcastState(io, game);
    armTimer(io, game);
    scheduleBots(io, game);
  }
}

function afterChange(io, game) {
  // Never present a dead player's day turn; advance until it lands on someone
  // alive (or the phase moves on to night/end).
  let safety = 0;
  while (safety++ < 24) {
    const out = healDayTurn(game);
    if (!out) break;
    if (out.next !== NEXT.CONTINUE) break;
  }
  broadcastState(io, game);
  armTimer(io, game);
  scheduleBots(io, game);
}

// ─────────────────────────────────────
// TIMERS (anti-stall defaults)
// ─────────────────────────────────────

function currentWait(game) {
  if (game.phase === PHASES.ENDED) return null;
  const e = game.pendingEvent;
  if (e && e.type === 'trial') return { key: 'trial', duration: TIMERS.TRIAL };
  if (e && e.type === 'attack_response') return { key: 'attack', duration: TIMERS.ATTACK };
  if (e && e.type === 'last_words') return { key: 'last_words', duration: TIMERS.LAST_WORDS };
  if (game.phase === PHASES.NIGHT) return { key: 'night', duration: TIMERS.NIGHT };
  if (game.phase === PHASES.DAY) return { key: 'turn', duration: TIMERS.TURN };
  return null;
}

function armTimer(io, game) {
  disarmTimer(game);
  const wait = currentWait(game);
  if (!wait) return;

  const token = Symbol('timer');
  io.to(game.id).emit('timer_start', { phase: wait.key, duration: wait.duration });

  const handle = setTimeout(() => {
    if (!timers[game.id] || timers[game.id].token !== token) return;
    runTimeoutDefault(io, game, wait.key);
  }, wait.duration);

  timers[game.id] = { token, handle };
}

function disarmTimer(game) {
  if (timers[game.id]) {
    clearTimeout(timers[game.id].handle);
    delete timers[game.id];
  }
}

function runTimeoutDefault(io, game, key) {
  let outcome = { success: true };

  if (key === 'turn') {
    outcome = endTurn(game, game.currentTurnPlayerId);
  } else if (key === 'night') {
    if (game.phase !== PHASES.NIGHT) return;
    outcome = resolveNight(game);
  } else if (key === 'attack') {
    const e = game.pendingEvent;
    if (!e || e.type !== 'attack_response') return;
    outcome = resolveAttackResponse(game, e.victimId, { staySilent: true });
  } else if (key === 'last_words') {
    const e = game.pendingEvent;
    if (!e || e.type !== 'last_words') return;
    outcome = submitLastWords(game, e.playerId, '');
  } else if (key === 'trial') {
    const e = game.pendingEvent;
    if (!e || e.type !== 'trial') return;
    const accused = game.players.find((p) => p.id === e.accusedId);
    const hidden = accused ? accused.trialCards.filter((t) => !t.revealed) : [];
    if (hidden.length === 0) return;
    const idx = Math.floor(Math.random() * hidden.length);
    outcome = resolveTrial(game, e.accuserId, idx);
  }

  if (!outcome || !outcome.success) {
    // Nothing valid to auto-resolve; just re-broadcast.
    broadcastState(io, game);
    return;
  }
  afterChange(io, game);
}

// ─────────────────────────────────────
// BOT AI
// ─────────────────────────────────────

const BOT_DELAY = 1100;
const botTimers = {};

const BOT_LAST_WORDS = ['وداعاً يا حارة', 'لم أكن سحّاراً', 'الحقوني', 'انتقموا لي', 'كنت بريئاً'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const isRed = (cardId) => {
  const def = getCardDef(cardId);
  return def && def.type === 'red';
};

function disarmBots(game) {
  if (botTimers[game.id]) {
    clearTimeout(botTimers[game.id]);
    delete botTimers[game.id];
  }
}

function scheduleBots(io, game) {
  if (game.phase === PHASES.ENDED) {
    disarmBots(game);
    return;
  }
  // If a bot action is already pending, let it fire (it re-validates on its own).
  // Resetting it on every state change would let frequent events starve the bots.
  if (botTimers[game.id]) return;
  if (!nextBotAction(game)) return;
  botTimers[game.id] = setTimeout(() => {
    delete botTimers[game.id];
    const act = nextBotAction(game); // re-validate (state may have moved on)
    if (!act) return;
    performBotAction(io, game, act);
  }, BOT_DELAY);
}

function nextBotAction(game) {
  const player = (id) => game.players.find((p) => p.id === id);
  const e = game.pendingEvent;

  if (e) {
    if (e.type === 'trial') {
      const a = player(e.accuserId);
      return a && a.isBot ? { kind: 'trial' } : null;
    }
    if (e.type === 'attack_response') {
      const v = player(e.victimId);
      return v && v.isBot ? { kind: 'attack' } : null;
    }
    if (e.type === 'last_words') {
      const p = player(e.playerId);
      return p && p.isBot ? { kind: 'last_words' } : null;
    }
    return null;
  }

  if (game.phase === PHASES.NIGHT) {
    const witchBot = game.players.find(
      (p) => p.alive && p.isBot && isWitch(p) && !game.nightActions.witchVotes[p.id]
    );
    if (witchBot) return { kind: 'witch', botId: witchBot.id };
    const sheikh = getAliveSheikh(game);
    if (sheikh && sheikh.isBot && game.nightActions.sheikhTargetId === null) {
      return { kind: 'sheikh', botId: sheikh.id };
    }
    return null;
  }

  if (game.phase === PHASES.DAY) {
    const cur = player(game.currentTurnPlayerId);
    if (cur && cur.alive && cur.isBot) return { kind: 'day', botId: cur.id };
    return null;
  }
  return null;
}

function performBotAction(io, game, act) {
  const player = (id) => game.players.find((p) => p.id === id);
  const e = game.pendingEvent;

  if (act.kind === 'trial' && e) {
    const accused = player(e.accusedId);
    const hidden = accused ? accused.trialCards.filter((t) => !t.revealed) : [];
    if (hidden.length) resolveTrial(game, e.accuserId, Math.floor(Math.random() * hidden.length));
  } else if (act.kind === 'attack' && e) {
    const victim = player(e.victimId);
    const canDefend = victim && victim.hand.length >= 2;
    resolveAttackResponse(game, e.victimId, canDefend && Math.random() < 0.5 ? { defend: true } : { staySilent: true });
  } else if (act.kind === 'last_words' && e) {
    submitLastWords(game, e.playerId, pick(BOT_LAST_WORDS));
  } else if (act.kind === 'witch') {
    const bot = player(act.botId);
    const targets = game.players.filter((p) => p.alive && p.id !== bot.id && !isWitch(p));
    if (targets.length) submitWitchVote(game, bot.id, pick(targets).id);
    if (allNightActionsIn(game)) resolveNight(game);
  } else if (act.kind === 'sheikh') {
    const bot = player(act.botId);
    const targets = game.players.filter((p) => p.alive && p.id !== bot.id);
    if (targets.length) submitSheikhProtect(game, bot.id, pick(targets).id);
    if (allNightActionsIn(game)) resolveNight(game);
  } else if (act.kind === 'day') {
    const bot = player(act.botId);
    const red = bot.hand.find((c) => isRed(c.cardId));
    const targets = game.players.filter((p) => p.alive && p.id !== bot.id && !p.hasGreatness);
    if (red && targets.length) {
      const out = playCard(game, bot.id, red.uid, { targetId: pick(targets).id });
      if (out.success && out.next === NEXT.CONTINUE) endTurn(game, bot.id);
      else if (!out.success) drawCards(game, bot.id);
    } else {
      drawCards(game, bot.id);
    }
  }

  afterChange(io, game);
}

// ─────────────────────────────────────
// BROADCAST
// ─────────────────────────────────────

function broadcastState(io, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit('game_state', getPlayerState(game, player.id));
  });
}

module.exports = { setupSockets };
