// ============================================================
// blue.js — Blue cards (persistent; stay in front of a player)
// ============================================================

const BLUE_CARDS = [
  {
    id: 'greatness',
    name: 'العظمة',
    nameEn: 'Greatness',
    type: 'blue',
    icon: '👑',
    desc: 'يمنع اللاعبين من وضع أي كرت أمام حاملها. يُزال بكرت فاروق أو الحصان أو الفيل.',
    target: 'self',
    effect: 'greatness',
    count: 1,
  },
  {
    id: 'link',
    name: 'الربط',
    nameEn: 'The Link',
    type: 'blue',
    icon: '🔗',
    desc: 'يربطك بلاعب آخر. إذا مات أحدكما مات الآخر.',
    target: 'player',
    effect: 'link',
    count: 2,
  },
  {
    id: 'hirz',
    name: 'الحِرز',
    nameEn: 'The Ward',
    type: 'blue',
    icon: '🪬',
    desc: 'قريباً.',
    target: 'self',
    effect: 'placeholder',
    count: 3,
    placeholder: true,
  },
];

module.exports = { BLUE_CARDS };
