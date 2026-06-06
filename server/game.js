// ============================================================
// game.js — Game State, Player Model & Serialization
// السحارة (Al-Sahara)
// ============================================================

const { v4: uuidv4 } = require('uuid');
const {
  MIN_PLAYERS,
  MAX_PLAYERS,
  TRIAL_AT_RED_CARDS,
  PHASES,
  TEAMS,
} = require('../shared/constants');
const { getCardDef, getTrialDef } = require('../shared/cards');

/**
 * Create a new player object.
 */
function createPlayer(id, name, connected = true, isBot = false) {
  return {
    id,
    name,
    alive: true,
    connected,
    isBot,
    characterCardId: null,
    trialCards: [], // { uid, kind, revealed }
    hand: [], // { uid, cardId }
    inFront: [], // { uid, cardId, placedBy }
    linkedTo: null, // playerId
    hasGreatness: false,
    lastWords: null,
    hasSpoken: false, // once eliminated and last words submitted
  };
}

/**
 * Create a new game instance.
 */
function createGame(hostId, hostName) {
  const gameId = uuidv4().slice(0, 8).toUpperCase();
  return {
    id: gameId,
    phase: PHASES.LOBBY,
    round: 0,
    hostId,
    players: [createPlayer(hostId, hostName)],
    drawPile: [],
    discardPile: [],
    currentTurnPlayerId: null,
    turnOrder: [], // ordered list of player ids
    nightActions: { witchVotes: {}, sheikhTargetId: null },
    pendingEvent: null, // { type, ... } e.g. trial, conspiracy, attack_response
    winner: null,
    log: [],
  };
}

/**
 * Add a player to the lobby (or reconnect).
 */
function addPlayer(game, playerId, playerName) {
  if (game.phase !== PHASES.LOBBY) {
    return { success: false, error: 'بدأت اللعبة بالفعل' };
  }
  if (game.players.length >= MAX_PLAYERS) {
    return { success: false, error: `اكتمل العدد (الحد الأقصى ${MAX_PLAYERS} لاعبين)` };
  }

  const existing = game.players.find((p) => p.id === playerId);
  if (existing) {
    existing.connected = true;
    existing.name = playerName;
    return { success: true, reconnect: true };
  }

  const nameTaken = game.players.find(
    (p) => p.name.toLowerCase() === playerName.toLowerCase()
  );
  if (nameTaken) {
    return { success: false, error: 'الاسم مستخدم بالفعل' };
  }

  game.players.push(createPlayer(playerId, playerName));
  return { success: true };
}

const BOT_NAMES = [
  'بوت سالم', 'بوت نجمة', 'بوت زهرة', 'بوت كريم', 'بوت ليلى',
  'بوت فؤاد', 'بوت ريم', 'بوت جابر', 'بوت سعاد', 'بوت مراد', 'بوت هند',
];
let _botCounter = 0;

/**
 * Add a bot player to the lobby (for testing / filling seats).
 */
function addBot(game) {
  if (game.phase !== PHASES.LOBBY) {
    return { success: false, error: 'بدأت اللعبة بالفعل' };
  }
  if (game.players.length >= MAX_PLAYERS) {
    return { success: false, error: `اكتمل العدد (الحد الأقصى ${MAX_PLAYERS} لاعبين)` };
  }
  _botCounter += 1;
  const id = `bot_${Date.now()}_${_botCounter}`;
  const used = new Set(game.players.map((p) => p.name));
  let name = BOT_NAMES.find((n) => !used.has(n)) || `بوت ${_botCounter}`;
  game.players.push(createPlayer(id, name, true, true));
  return { success: true, botId: id };
}

/**
 * Remove a bot from the lobby by id.
 */
function removeBot(game, botId) {
  if (game.phase !== PHASES.LOBBY) {
    return { success: false, error: 'بدأت اللعبة بالفعل' };
  }
  const bot = game.players.find((p) => p.id === botId && p.isBot);
  if (!bot) return { success: false, error: 'البوت غير موجود' };
  game.players = game.players.filter((p) => p.id !== botId);
  return { success: true };
}

/**
 * Remove a player. In lobby they leave entirely; mid-game they go offline.
 */
function removePlayer(game, playerId) {
  if (game.phase !== PHASES.LOBBY) {
    const player = game.players.find((p) => p.id === playerId);
    if (player) player.connected = false;
    return;
  }
  game.players = game.players.filter((p) => p.id !== playerId);
}

// ─────────────────────────────────────
// TEAM / ROLE RESOLUTION (from trial cards)
// ─────────────────────────────────────

function hasTrialKind(player, kind) {
  return player.trialCards.some((t) => t.kind === kind);
}

function isWitch(player) {
  return hasTrialKind(player, 'sahara');
}

function isMasterWitch(player) {
  return hasTrialKind(player, 'sahara') && hasTrialKind(player, 'sahir');
}

function isSheikh(player) {
  // A player who is also a witch belongs to the Sahara team; their protector
  // role is void (otherwise the night would wait on a protect they never cast).
  return hasTrialKind(player, 'sheikh') && !isWitch(player);
}

function getTeam(player) {
  return isWitch(player) ? TEAMS.SAHARA : TEAMS.CITIZEN;
}

function getAlivePlayers(game) {
  return game.players.filter((p) => p.alive);
}

function getAliveWitches(game) {
  return game.players.filter((p) => p.alive && isWitch(p));
}

function getAliveNonWitches(game) {
  return game.players.filter((p) => p.alive && !isWitch(p));
}

function getAliveSheikh(game) {
  return game.players.find((p) => p.alive && isSheikh(p)) || null;
}

function getRedCount(player) {
  return player.inFront.filter((c) => {
    const def = getCardDef(c.cardId);
    return def && def.type === 'red';
  }).length;
}

/**
 * Win check.
 * Citizens win when no witches remain alive.
 * Sahara win when witches >= non-witches alive (parity / domination).
 */
function checkWinCondition(game) {
  const witches = getAliveWitches(game).length;
  const others = getAliveNonWitches(game).length;
  if (witches === 0) return TEAMS.CITIZEN;
  if (witches >= others) return TEAMS.SAHARA;
  return null;
}

// ─────────────────────────────────────
// SERIALIZATION
// ─────────────────────────────────────

function serializeInFront(player) {
  return player.inFront.map((c) => ({
    uid: c.uid,
    card: getCardDef(c.cardId),
    placedBy: c.placedBy,
  }));
}

function serializeRevealedTrials(player, revealAll) {
  return player.trialCards
    .filter((t) => revealAll || t.revealed)
    .map((t) => ({ uid: t.uid, kind: t.kind, card: getTrialDef(t.kind) }));
}

/**
 * Public view of a single player (safe for everyone).
 */
function publicPlayer(game, player, revealAll) {
  return {
    id: player.id,
    name: player.name,
    alive: player.alive,
    connected: player.connected,
    isBot: player.isBot,
    isHost: player.id === game.hostId,
    characterCard: player.characterCardId ? getCardDef(player.characterCardId) || null : null,
    trialCount: player.trialCards.length,
    revealedTrials: serializeRevealedTrials(player, revealAll),
    inFront: serializeInFront(player),
    redCount: getRedCount(player),
    handCount: player.hand.length,
    linkedTo: player.linkedTo,
    hasGreatness: player.hasGreatness,
    lastWords: player.lastWords,
  };
}

function getPublicState(game) {
  const ended = game.phase === PHASES.ENDED;
  return {
    id: game.id,
    phase: game.phase,
    round: game.round,
    hostId: game.hostId,
    currentTurnPlayerId: game.currentTurnPlayerId,
    drawPileCount: game.drawPile.length,
    discardCount: game.discardPile.length,
    pendingEvent: serializePendingEvent(game),
    winner: game.winner,
    log: game.log,
    players: game.players.map((p) => publicPlayer(game, p, ended)),
  };
}

/**
 * Pending events are public in shape but never leak hidden trial kinds
 * until resolved.
 */
function serializePendingEvent(game) {
  if (!game.pendingEvent) return null;
  const e = game.pendingEvent;
  if (e.type === 'attack_response') {
    return { type: e.type, victimId: e.victimId };
  }
  if (e.type === 'trial') {
    return { type: e.type, accusedId: e.accusedId, accuserId: e.accuserId };
  }
  if (e.type === 'last_words') {
    return { type: e.type, playerId: e.playerId };
  }
  if (e.type === 'conspiracy') {
    return { type: e.type, drawerId: e.drawerId };
  }
  return { type: e.type };
}

/**
 * Personalized state for one player (adds private hand/trials/team).
 */
function getPlayerState(game, playerId) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return null;

  const state = getPublicState(game);
  const ended = game.phase === PHASES.ENDED;
  const witch = isWitch(player);

  // Fellow witches are known to a witch (they identify each other at night).
  const witchTeammates =
    witch && (game.phase === PHASES.NIGHT || ended)
      ? game.players
          .filter((p) => p.id !== player.id && isWitch(p))
          .map((p) => ({ id: p.id, name: p.name }))
      : [];

  return {
    ...state,
    me: {
      id: player.id,
      alive: player.alive,
      team: getTeam(player),
      isWitch: witch,
      isMasterWitch: isMasterWitch(player),
      isSheikh: isSheikh(player),
      hand: player.hand.map((c) => ({ uid: c.uid, card: getCardDef(c.cardId) })),
      trials: player.trialCards.map((t) => ({
        uid: t.uid,
        kind: t.kind,
        card: getTrialDef(t.kind),
        revealed: t.revealed,
      })),
      witchTeammates,
      hasGreatness: player.hasGreatness,
      isMyTurn: game.currentTurnPlayerId === player.id,
    },
  };
}

module.exports = {
  MIN_PLAYERS,
  MAX_PLAYERS,
  TRIAL_AT_RED_CARDS,
  createGame,
  createPlayer,
  addPlayer,
  addBot,
  removeBot,
  removePlayer,
  hasTrialKind,
  isWitch,
  isMasterWitch,
  isSheikh,
  getTeam,
  getAlivePlayers,
  getAliveWitches,
  getAliveNonWitches,
  getAliveSheikh,
  getRedCount,
  checkWinCondition,
  getPublicState,
  getPlayerState,
};
