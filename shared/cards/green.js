// ============================================================
// green.js — Green cards (one-shot, discarded after use)
// ============================================================

const GREEN_CARDS = [
  {
    id: 'faruq',
    name: 'فاروق',
    nameEn: 'Faruq',
    type: 'green',
    icon: '🃏',
    desc: 'انقل كرتاً موضوعاً أمام لاعب إلى لاعب آخر، أو أزل كرت العظمة.',
    target: 'player',
    effect: 'move_card',
    count: 2,
  },
  {
    id: 'horse',
    name: 'الحصان',
    nameEn: 'The Horse',
    type: 'green',
    icon: '🐎',
    desc: 'انقل كرت تهمة من أمامك إلى لاعب آخر.',
    target: 'player',
    effect: 'move_card',
    count: 2,
  },
  {
    id: 'elephant',
    name: 'الفيل',
    nameEn: 'The Elephant',
    type: 'green',
    icon: '🐘',
    desc: 'انقل كل كروت التهمة من أمامك إلى لاعب آخر.',
    target: 'player',
    effect: 'move_all_red',
    count: 2,
  },
  {
    id: 'taweeza',
    name: 'تميمة',
    nameEn: 'Amulet',
    type: 'green',
    icon: '🧿',
    desc: 'قريباً.',
    target: 'none',
    effect: 'placeholder',
    count: 4,
    placeholder: true,
  },
  {
    id: 'hijab',
    name: 'حجاب',
    nameEn: 'Charm',
    type: 'green',
    icon: '📜',
    desc: 'قريباً.',
    target: 'none',
    effect: 'placeholder',
    count: 4,
    placeholder: true,
  },
];

module.exports = { GREEN_CARDS };
