// ============================================================
// characters.js — 15 public Character cards (زنقة الزنقة)
// Each player is dealt one face-up character. Abilities marked
// `placeholder: true` are passive until their full rules are wired.
// ============================================================

const CHARACTER_CARDS = [
  { id: 'char_ghoula', name: 'غولة عبدالله المغربي', nameEn: 'The Ghoula', icon: '👹', desc: 'أسطورة طرابلس القديمة.', placeholder: true },
  { id: 'char_majroum', name: 'صاحب زنقة المجروم', nameEn: 'Lord of the Alley', icon: '🗡️', desc: 'سيّد زنقة المجروم.', placeholder: true },
  { id: 'char_attar', name: 'العطّار', nameEn: 'The Apothecary', icon: '⚗️', desc: 'يبيع الأعشاب والتمائم.', placeholder: true },
  { id: 'char_hakim', name: 'الحكيم', nameEn: 'The Healer', icon: '🩺', desc: 'طبيب الحارة.', placeholder: true },
  { id: 'char_haddad', name: 'الحدّاد', nameEn: 'The Blacksmith', icon: '🔨', desc: 'يصنع السكاكين.', placeholder: true },
  { id: 'char_assas', name: 'العسّاس', nameEn: 'The Watchman', icon: '🏮', desc: 'يحرس الحارة ليلاً.', placeholder: true },
  { id: 'char_dallala', name: 'الدلّالة', nameEn: 'The Broker', icon: '💍', desc: 'تعرف أسرار الجميع.', placeholder: true },
  { id: 'char_qari', name: 'القارئ', nameEn: 'The Reader', icon: '📿', desc: 'يقرأ الطالع.', placeholder: true },
  { id: 'char_harami', name: 'الحرامي', nameEn: 'The Thief', icon: '🥷', desc: 'يسرق الكروت.', placeholder: true },
  { id: 'char_qahwaji', name: 'القهوجي', nameEn: 'The Coffee Man', icon: '☕', desc: 'مقهاه ملتقى الحارة.', placeholder: true },
  { id: 'char_muqaddim', name: 'المقدّم', nameEn: 'The Constable', icon: '🎖️', desc: 'يفرض النظام.', placeholder: true },
  { id: 'char_arrafa', name: 'العرّافة', nameEn: 'The Seer', icon: '🌙', desc: 'ترى ما خفي.', placeholder: true },
  { id: 'char_bawwab', name: 'البوّاب', nameEn: 'The Gatekeeper', icon: '🚪', desc: 'يحرس أبواب الحارة.', placeholder: true },
  { id: 'char_naddaha', name: 'الندّاهة', nameEn: 'The Caller', icon: '🌊', desc: 'تنادي في الليل.', placeholder: true },
  { id: 'char_shahid', name: 'الشاهد', nameEn: 'The Witness', icon: '👁️', desc: 'يشهد على ما جرى.', placeholder: true },
];

module.exports = { CHARACTER_CARDS };
