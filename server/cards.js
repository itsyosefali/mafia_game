// ============================================================
// cards.js — Card effect handlers
// Each handler mutates state and returns { success, error?, signals... }.
// `consumedToInFront: true` tells the engine the played card was placed
// in front of a player (persistent); otherwise the engine discards it.
// ============================================================

const { getCardDef } = require('../shared/cards');
const { getRedCount, TRIAL_AT_RED_CARDS } = require('./game');

function findPlayer(game, id) {
  return game.players.find((p) => p.id === id) || null;
}

function canPlaceInFront(target) {
  return !target.hasGreatness;
}

/**
 * Place a red accusation in front of a target. Triggers a trial at the cap.
 */
function accuse(game, actor, instance, payload) {
  const target = findPlayer(game, payload.targetId);
  if (!target) return { success: false, error: 'الهدف غير موجود' };
  if (!target.alive) return { success: false, error: 'لا يمكن اتهام لاعب خارج اللعبة' };
  if (target.id === actor.id) return { success: false, error: 'لا يمكنك اللعب على نفسك' };
  if (!canPlaceInFront(target)) {
    return { success: false, error: 'هذا اللاعب محمي بكرت العظمة' };
  }

  target.inFront.push({ uid: instance.uid, cardId: instance.cardId, placedBy: actor.id });
  game.log.push({ type: 'card', message: `🔪 ${actor.name} وضع تهمة أمام ${target.name}.` });

  const result = { success: true, consumedToInFront: true };
  if (getRedCount(target) >= TRIAL_AT_RED_CARDS) {
    result.trial = { accusedId: target.id, accuserId: actor.id };
  }
  return result;
}

/**
 * Play Greatness in front of yourself.
 */
function greatness(game, actor, instance) {
  if (actor.hasGreatness) return { success: false, error: 'لديك العظمة بالفعل' };
  actor.hasGreatness = true;
  actor.inFront.push({ uid: instance.uid, cardId: instance.cardId, placedBy: actor.id });
  game.log.push({ type: 'card', message: `👑 ${actor.name} يحمل كرت العظمة الآن.` });
  return { success: true, consumedToInFront: true };
}

/**
 * Link two players: if one dies, the other dies too.
 */
function link(game, actor, instance, payload) {
  const target = findPlayer(game, payload.targetId);
  if (!target) return { success: false, error: 'الهدف غير موجود' };
  if (!target.alive) return { success: false, error: 'لا يمكن ربط لاعب خارج اللعبة' };
  if (target.id === actor.id) return { success: false, error: 'لا يمكنك الربط بنفسك' };
  if (!canPlaceInFront(target)) {
    return { success: false, error: 'هذا اللاعب محمي بكرت العظمة' };
  }

  actor.linkedTo = target.id;
  target.linkedTo = actor.id;
  target.inFront.push({ uid: instance.uid, cardId: instance.cardId, placedBy: actor.id });
  game.log.push({ type: 'card', message: `🔗 ${actor.name} ربط مصيره بـ ${target.name}.` });
  return { success: true, consumedToInFront: true };
}

/**
 * Movement cards. Move one red card from the actor to a target. If the actor
 * has no red cards and the target holds Greatness, break the Greatness instead.
 */
function moveCard(game, actor, instance, payload) {
  const target = findPlayer(game, payload.targetId);
  if (!target) return { success: false, error: 'الهدف غير موجود' };
  if (!target.alive) return { success: false, error: 'الهدف خارج اللعبة' };
  if (target.id === actor.id) return { success: false, error: 'لا يمكنك اللعب على نفسك' };

  const myReds = actor.inFront.filter((c) => {
    const def = getCardDef(c.cardId);
    return def && def.type === 'red';
  });

  if (myReds.length === 0) {
    if (target.hasGreatness) {
      target.hasGreatness = false;
      target.inFront = target.inFront.filter((c) => c.cardId !== 'greatness');
      game.log.push({ type: 'card', message: `🃏 ${actor.name} أزال كرت العظمة عن ${target.name}.` });
      return { success: true, consumedToInFront: false };
    }
    return { success: false, error: 'لا توجد تهم أمامك لنقلها' };
  }

  if (!canPlaceInFront(target)) {
    return { success: false, error: 'هذا اللاعب محمي بكرت العظمة' };
  }

  const moved = myReds[0];
  actor.inFront = actor.inFront.filter((c) => c.uid !== moved.uid);
  target.inFront.push({ ...moved, placedBy: actor.id });
  game.log.push({ type: 'card', message: `🐎 ${actor.name} نقل تهمة إلى ${target.name}.` });

  const result = { success: true, consumedToInFront: false };
  if (getRedCount(target) >= TRIAL_AT_RED_CARDS) {
    result.trial = { accusedId: target.id, accuserId: actor.id };
  }
  return result;
}

/**
 * Move all of the actor's red cards onto a target (Elephant).
 */
function moveAllRed(game, actor, instance, payload) {
  const target = findPlayer(game, payload.targetId);
  if (!target) return { success: false, error: 'الهدف غير موجود' };
  if (!target.alive) return { success: false, error: 'الهدف خارج اللعبة' };
  if (target.id === actor.id) return { success: false, error: 'لا يمكنك اللعب على نفسك' };
  if (!canPlaceInFront(target)) {
    return { success: false, error: 'هذا اللاعب محمي بكرت العظمة' };
  }

  const myReds = actor.inFront.filter((c) => {
    const def = getCardDef(c.cardId);
    return def && def.type === 'red';
  });
  if (myReds.length === 0) return { success: false, error: 'لا توجد تهم أمامك لنقلها' };

  actor.inFront = actor.inFront.filter((c) => {
    const def = getCardDef(c.cardId);
    return !(def && def.type === 'red');
  });
  myReds.forEach((c) => target.inFront.push({ ...c, placedBy: actor.id }));
  game.log.push({ type: 'card', message: `🐘 ${actor.name} نقل كل التهم إلى ${target.name}.` });

  const result = { success: true, consumedToInFront: false };
  if (getRedCount(target) >= TRIAL_AT_RED_CARDS) {
    result.trial = { accusedId: target.id, accuserId: actor.id };
  }
  return result;
}

/**
 * Azrael — attack a chosen target (resolved like a night attack).
 */
function azrael(game, actor, instance, payload) {
  const target = findPlayer(game, payload.targetId);
  if (!target) return { success: false, error: 'الهدف غير موجود' };
  if (!target.alive) return { success: false, error: 'الهدف خارج اللعبة' };
  if (target.id === actor.id) return { success: false, error: 'لا يمكنك اللعب على نفسك' };
  game.log.push({ type: 'card', message: `💀 ${actor.name} استدعى عزرائيل على ${target.name}.` });
  return { success: true, consumedToInFront: false, attack: { victimId: target.id } };
}

/**
 * Conspiracy — handled by the engine (affects all players' trial cards).
 */
function conspiracy(game, actor) {
  return { success: true, consumedToInFront: false, conspiracy: { drawerId: actor.id } };
}

/**
 * Shadow — bring on the night phase.
 */
function nightfall() {
  return { success: true, consumedToInFront: false, night: true };
}

function placeholder() {
  return { success: true, consumedToInFront: false };
}

const EFFECTS = {
  accuse,
  greatness,
  link,
  move_card: moveCard,
  move_all_red: moveAllRed,
  azrael,
  conspiracy,
  nightfall,
  placeholder,
};

/**
 * Apply a card's effect. `instance` is the { uid, cardId } drawn from the hand.
 */
function applyCardEffect(game, actor, instance, payload = {}) {
  const def = getCardDef(instance.cardId);
  if (!def) return { success: false, error: 'كرت غير معروف' };
  const handler = EFFECTS[def.effect] || placeholder;
  return handler(game, actor, instance, payload);
}

module.exports = { applyCardEffect, canPlaceInFront };
