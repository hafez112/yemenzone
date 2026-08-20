// 🌐 ثنائية اللغة — عربي/إنجليزي لواجهة الزائر الأساسية (الجلسة 19)
// الافتراضي عربي RTL — التبديل فوري ويُحفظ في المتصفح
export type Lang = 'ar' | 'en';

const KEY = 'yz_lang';

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  return (localStorage.getItem(KEY) as Lang) === 'en' ? 'en' : 'ar';
}

export function setLang(l: Lang) {
  localStorage.setItem(KEY, l);
  applyDir(l);
  window.dispatchEvent(new Event('yz-lang')); // 🌐 إخطار كل المكونات
}

export function applyDir(l: Lang = getLang()) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'en' ? 'ltr' : 'rtl';
}

const DICT = {
  home: { ar: 'الرئيسية', en: 'Home' },
  explore: { ar: 'استكشاف', en: 'Explore' },
  stores: { ar: 'المتاجر', en: 'Stores' },
  storesGuide: { ar: 'دليل المتاجر', en: 'Stores' },
  services: { ar: 'خدمات', en: 'Services' },
  ourServices: { ar: 'خدماتنا', en: 'Services' },
  trackOrder: { ar: 'تتبع طلبك', en: 'Track order' },
  nearby: { ar: 'القريبة', en: 'Nearby' },
  blog: { ar: 'المدونة', en: 'Blog' },
  myAccount: { ar: 'حسابي', en: 'Account' },
  login: { ar: 'دخول', en: 'Sign in' },
  logout: { ar: 'خروج', en: 'Sign out' },
  createStore: { ar: 'أنشئ متجرك', en: 'Open your store' },
  search: { ar: '🔎 ابحث...', en: '🔎 Search...' },
} as const;

export type DictKey = keyof typeof DICT;

export function t(key: DictKey): string {
  return DICT[key][getLang()];
}
