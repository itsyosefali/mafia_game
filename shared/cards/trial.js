// ============================================================
// trial.js — Trial (allegiance) card definitions
// These are dealt face-down to players and decide their secret team.
// ============================================================

const TRIAL_CARDS = {
  citizen: {
    kind: 'citizen',
    name: 'مواطن',
    nameEn: 'Citizen',
    icon: '🧍',
    desc: 'من أهل طرابلس. اكشف السحارة قبل فوات الأوان.',
  },
  sahara: {
    kind: 'sahara',
    name: 'سحّارة',
    nameEn: 'Witch',
    icon: '🧙‍♀️',
    desc: 'تقتل المواطنين في الليل دون أن تُكشف.',
  },
  sahir: {
    kind: 'sahir',
    name: 'ساحر',
    nameEn: 'Sorcerer',
    icon: '🔮',
    desc: 'مع كرت السحّارة يصبح حامله كبير السحرة.',
  },
  sheikh: {
    kind: 'sheikh',
    name: 'الشيخ',
    nameEn: 'Sheikh',
    icon: '🛡️',
    desc: 'يحمي لاعباً كل ليلة. إن انكشفت هويته فقد قدرته.',
  },
};

module.exports = { TRIAL_CARDS };
