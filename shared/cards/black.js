// ============================================================
// black.js — Black cards (must be played immediately when drawn)
// ============================================================

const BLACK_CARDS = [
  {
    id: 'conspiracy',
    name: 'المؤامرة',
    nameEn: 'The Conspiracy',
    type: 'black',
    icon: '🩸',
    desc: 'تُكشف ورقة محاكمة من اللاعب على يسار الساحب، ثم تدور أوراق المحاكمة جهة اليسار.',
    target: 'none',
    effect: 'conspiracy',
    count: 3,
  },
  {
    id: 'azrael',
    name: 'عزرائيل',
    nameEn: 'Azrael',
    type: 'black',
    icon: '💀',
    desc: 'كرت الموت. اختر لاعباً ليُهاجَم ما لم يكن محمياً.',
    target: 'player',
    effect: 'azrael',
    count: 2,
  },
  {
    id: 'shadow',
    name: 'عزّ الليل',
    nameEn: 'The Shadow',
    type: 'black',
    icon: '🌑',
    desc: 'يحلّ الظلام وتتحرك السحارة. تبدأ مرحلة الليل.',
    target: 'none',
    effect: 'nightfall',
    count: 2,
  },
  {
    id: 'darkness',
    name: 'العتمة',
    nameEn: 'The Darkness',
    type: 'black',
    icon: '🕯️',
    desc: 'قريباً.',
    target: 'none',
    effect: 'placeholder',
    count: 2,
    placeholder: true,
  },
];

module.exports = { BLACK_CARDS };
