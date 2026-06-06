// ============================================================
// index.js — Card catalog aggregation + deck/pool builders
// ============================================================

const { TRIAL_CARDS } = require('./trial');
const { CHARACTER_CARDS } = require('./characters');
const { GREEN_CARDS } = require('./green');
const { BLUE_CARDS } = require('./blue');
const { RED_CARDS } = require('./red');
const { BLACK_CARDS } = require('./black');
const { TRIAL_DISTRIBUTION } = require('../constants');

// All playable (draw pile) cards across colors.
const ACTION_CARDS = [...GREEN_CARDS, ...BLUE_CARDS, ...RED_CARDS, ...BLACK_CARDS];

// Fast lookup by card id.
const CARD_INDEX = {};
ACTION_CARDS.forEach((c) => {
  CARD_INDEX[c.id] = c;
});

let _uidCounter = 0;
function nextUid(prefix) {
  _uidCounter += 1;
  return `${prefix}_${_uidCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Get the public-facing definition for an action card id.
 */
function getCardDef(cardId) {
  return CARD_INDEX[cardId] || null;
}

/**
 * Get a trial card definition by kind ('citizen' | 'sahara' | 'sahir' | 'sheikh').
 */
function getTrialDef(kind) {
  return TRIAL_CARDS[kind] || null;
}

/**
 * Build the shuffled draw pile as an array of instances: { uid, cardId }.
 */
function buildDrawPile() {
  const pile = [];
  ACTION_CARDS.forEach((card) => {
    const copies = card.count || 1;
    for (let i = 0; i < copies; i++) {
      pile.push({ uid: nextUid('c'), cardId: card.id });
    }
  });
  return shuffle(pile);
}

/**
 * Build the trial-card pool for a player count and return shuffled instances:
 * { uid, kind }.
 */
function buildTrialPool(playerCount) {
  const dist = TRIAL_DISTRIBUTION[playerCount];
  if (!dist) return [];
  const pool = [];
  Object.entries(dist).forEach(([kind, n]) => {
    for (let i = 0; i < n; i++) {
      pool.push({ uid: nextUid('t'), kind });
    }
  });
  return shuffle(pool);
}

/**
 * Return a shuffled copy of the character cards.
 */
function buildCharacterDeck() {
  return shuffle(CHARACTER_CARDS.map((c) => ({ ...c })));
}

module.exports = {
  TRIAL_CARDS,
  CHARACTER_CARDS,
  ACTION_CARDS,
  CARD_INDEX,
  getCardDef,
  getTrialDef,
  buildDrawPile,
  buildTrialPool,
  buildCharacterDeck,
  shuffle,
  nextUid,
};
