// ============================================================
// constants.js — Shared game constants (السحارة / Al-Sahara)
// CommonJS module consumed by the authoritative server.
// ============================================================

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 12;

// Number of trial (allegiance) cards each player receives, by player count.
const TRIAL_CARDS_PER_PLAYER = {
  4: 5, 5: 5, 6: 5, 7: 5,
  8: 4, 9: 4,
  10: 3, 11: 3, 12: 3,
};

// Trial-card pool composition by player count (from the rule sheet).
// citizen + sahara + sheikh must equal players * TRIAL_CARDS_PER_PLAYER.
const TRIAL_DISTRIBUTION = {
  4: { citizen: 18, sahara: 1, sheikh: 1 },
  5: { citizen: 23, sahara: 1, sheikh: 1 },
  6: { citizen: 27, sahara: 2, sheikh: 1 },
  7: { citizen: 32, sahara: 2, sheikh: 1 },
  8: { citizen: 29, sahara: 2, sheikh: 1 },
  9: { citizen: 33, sahara: 2, sheikh: 1 },
  10: { citizen: 27, sahara: 2, sheikh: 1 },
  11: { citizen: 30, sahara: 2, sheikh: 1 },
  12: { citizen: 33, sahara: 2, sheikh: 1 },
};

// A player on trial after this many red accusation cards pile up in front of them.
const TRIAL_AT_RED_CARDS = 7;

// Cards drawn when a player chooses to "draw" on their turn.
const DRAW_COUNT = 2;

// Cards a victim must discard to fend off a night attack.
const DEFEND_DISCARD_COUNT = 2;

// Max words an eliminated player may speak.
const LAST_WORDS_LIMIT = 3;

// Phase identifiers.
const PHASES = {
  LOBBY: 'lobby',
  SETUP: 'setup',
  DAY: 'day',
  NIGHT: 'night',
  TRIAL: 'trial',
  CONSPIRACY: 'conspiracy',
  ATTACK_RESPONSE: 'attack_response',
  ENDED: 'ended',
};

// Teams.
const TEAMS = {
  CITIZEN: 'citizen',
  SAHARA: 'sahara',
};

module.exports = {
  MIN_PLAYERS,
  MAX_PLAYERS,
  TRIAL_CARDS_PER_PLAYER,
  TRIAL_DISTRIBUTION,
  TRIAL_AT_RED_CARDS,
  DRAW_COUNT,
  DEFEND_DISCARD_COUNT,
  LAST_WORDS_LIMIT,
  PHASES,
  TEAMS,
};
