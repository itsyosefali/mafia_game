// ============================================================
// red.js — Red cards (accusations / knives)
// Each red card placed in front of a player counts toward their trial.
// Reaching TRIAL_AT_RED_CARDS triggers a trial.
// ============================================================

const RED_CARDS = [
  {
    id: 'tuhma',
    name: 'تهمة',
    nameEn: 'Accusation',
    type: 'red',
    icon: '🔪',
    desc: 'ضعها أمام لاعب. عند تجمّع سبع تهم تبدأ محاكمته.',
    target: 'player',
    effect: 'accuse',
    count: 18,
  },
];

module.exports = { RED_CARDS };
