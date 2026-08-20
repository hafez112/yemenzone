// ═══ محرك توليد أنواع المتاجر — الذكاء الاصطناعي المحلي ═══
// يستقبل اسم النوع المطلوب (مثال: «مطاعم») ويولّد إعداداً كاملاً:
// النشاط الأساسي + الأيقونة + اللون + الوصف + المصطلحات + القالب
import { cleanName, normalizeArabic, scoreKeywords } from './text.engine';
import { KIND_PRESETS, KIND_TEMPLATE_MAP } from './knowledge.base';

// كلمات مفتاحية لاكتشاف «النشاط الأساسي» من اسم النوع
export const TYPE_KIND_KEYWORDS: Record<string, string[]> = {
  rentals: [
    'عقار', 'عقارات', 'ايجار', 'إيجار', 'شقق', 'شقه', 'فلل', 'فيلا', 'محلات تجاريه',
    'اراضي', 'أرض', 'مكاتب عقاريه', 'سكن', 'دور', 'عمائر', 'مزارع',
  ],
  hotel: [
    'فندق', 'فنادق', 'شاليه', 'شاليهات', 'استراحه', 'استراحة', 'منتجع', 'اجنحه',
    'أجنحة', 'غرف', 'اقامه', 'إقامة', 'نزل', 'شقق مفروشه', 'مخيم',
  ],
  services: [
    'خدمات', 'صيانة', 'تصميم', 'استشارات', 'استشارة', 'تنظيف', 'نقل', 'تعليم',
    'دورات', 'تدريب', 'خياطة', 'تصوير', 'استوديو', 'طباعة', 'دعاية', 'اعلان',
    'محاماة', 'محاسبة', 'برمجة', 'ترجمة', 'تاجير سيارات', 'تأجير', 'لياقة', 'جيم',
    'رياضي', 'نادي',
    'صالون', 'حلاقة', 'تجميل', 'مغسلة', 'كهرباء', 'سباكة', 'نجارة', 'حدادة', 'ديكور',
  ],
  restaurants: [
    'مطعم', 'مطاعم', 'كافيه', 'قهوة', 'كوفي', 'وجبات', 'مندي', 'مشويات', 'مشاوي',
    'بيتزا', 'برجر', 'شاورما', 'مخبز', 'معجنات', 'حلويات', 'بوفيه', 'عصائر',
    'بروست', 'فلافل', 'سمك', 'مأكولات', 'شعبيات', 'ديوانية', 'كشري', 'فحسة', 'سلتة',
  ],
  malls: [
    'مول', 'مولات', 'مجمع تجاري', 'مجمعات', 'سوق تجاري', 'اسواق', 'أسواق',
    'تسوق', 'هايبر', 'سيتي', 'بلازا', 'جاليري', 'بازار',
  ],
  products: [
    'صيدلية', 'صيدليه',
    'سوبرماركت', 'بقالة', 'ملابس', 'بوتيك', 'ازياء', 'عطور', 'جولات', 'جوالات',
    'الكترونيات', 'إلكترونيات', 'اثاث', 'أثاث', 'سيارات', 'معرض', 'مكتبة', 'قرطاسية',
    'زهور', 'ورود', 'حيوانات', 'مجوهرات', 'ذهب', 'ساعات', 'رياضة', 'اجهزه', 'أجهزة',
    'مواد', 'غذائية', 'لحوم', 'خضار', 'فواكه', 'تمور', 'عسل', 'بهارات', 'رياضية',
  ],
};

// خريطة الأيقونات: أول تطابق يفوز — رتّب من الأكثر تحديداً للأعم
export const TYPE_ICON_MAP: { keywords: string[]; icon: string }[] = [
  { keywords: ['مول', 'مولات', 'مجمع', 'بلازا', 'جاليري'], icon: '🏬' },
  { keywords: ['مطعم', 'مطاعم', 'وجبات', 'اكل', 'أكل'], icon: '🍽️' },
  { keywords: ['كافيه', 'قهوة', 'كوفي'], icon: '☕' },
  { keywords: ['مخبز', 'معجنات'], icon: '🥖' },
  { keywords: ['حلويات', 'كيك'], icon: '🍰' },
  { keywords: ['صيدلية', 'صيدليه', 'ادوية', 'أدوية'], icon: '💊' },
  { keywords: ['سوبرماركت', 'بقالة', 'تموين'], icon: '🛒' },
  { keywords: ['لحوم', 'جزارة'], icon: '🥩' },
  { keywords: ['خضار', 'فواكه'], icon: '🥬' },
  { keywords: ['تمور'], icon: '🌴' },
  { keywords: ['عسل'], icon: '🍯' },
  { keywords: ['بهارات', 'توابل', 'عطارة'], icon: '🌶️' },
  { keywords: ['ملابس', 'ازياء', 'أزياء', 'بوتيك', 'فساتين', 'عبايات'], icon: '👗' },
  { keywords: ['عطور', 'عود', 'بخور'], icon: '🧴' },
  { keywords: ['جولات', 'جوالات', 'هواتف', 'موبايلات'], icon: '📱' },
  { keywords: ['الكترونيات', 'إلكترونيات', 'كمبيوتر', 'لابتوب'], icon: '💻' },
  { keywords: ['اجهزه', 'أجهزة', 'كهربائية', 'منزلية'], icon: '🔌' },
  { keywords: ['اثاث', 'أثاث', 'مفروشات'], icon: '🛋️' },
  { keywords: ['سيارات', 'معرض سيارات'], icon: '🚗' },
  { keywords: ['مجوهرات', 'ذهب', 'ساعات'], icon: '💎' },
  { keywords: ['مكتبة', 'قرطاسية', 'كتب'], icon: '📚' },
  { keywords: ['زهور', 'ورود'], icon: '💐' },
  { keywords: ['حيوانات', 'اليفة', 'أليفة'], icon: '🐾' },
  { keywords: ['رياضة', 'رياضية', 'مكملات'], icon: '🏅' },
  { keywords: ['عقار', 'عقارات', 'ايجار', 'إيجار', 'شقق', 'فلل'], icon: '🏢' },
  { keywords: ['شاليه', 'شاليهات'], icon: '🏖️' },
  { keywords: ['استراحه', 'استراحة', 'منتجع'], icon: '🌴' },
  { keywords: ['فندق', 'فنادق', 'اجنحه', 'أجنحة'], icon: '🏨' },
  { keywords: ['صيانة', 'تكييف', 'تبريد'], icon: '🔧' },
  { keywords: ['كهرباء'], icon: '⚡' },
  { keywords: ['سباكة'], icon: '🚿' },
  { keywords: ['نجارة'], icon: '🪚' },
  { keywords: ['تصميم', 'ديكور', 'هندسة'], icon: '🎨' },
  { keywords: ['تصوير', 'استوديو'], icon: '📷' },
  { keywords: ['طباعة', 'دعاية', 'اعلان'], icon: '🖨️' },
  { keywords: ['استشارات', 'استشارة', 'محاماة', 'محاسبة'], icon: '💼' },
  { keywords: ['برمجة', 'تقنية معلومات'], icon: '👨‍💻' },
  { keywords: ['ترجمة'], icon: '🌐' },
  { keywords: ['تعليم', 'دورات', 'تدريب'], icon: '🎓' },
  { keywords: ['نقل', 'شحن'], icon: '🚚' },
  { keywords: ['تاجير سيارات', 'تأجير'], icon: '🚙' },
  { keywords: ['لياقة', 'جيم', 'نادي', 'رياضي'], icon: '🏋️' },
  { keywords: ['صالون', 'حلاقة', 'تجميل'], icon: '💇' },
  { keywords: ['مغسلة'], icon: '🧺' },
  { keywords: ['خياطة'], icon: '🧵' },
  { keywords: ['تنظيف'], icon: '🧹' },
];

// ألوان مقترحة لكل نشاط أساسي
export const TYPE_KIND_COLORS: Record<string, string> = {
  products: '#6C3DF5',
  rentals: '#0E9F8C',
  hotel: '#B45309',
  services: '#2563EB',
  restaurants: '#EA580C',
  malls: '#7C3AED',
};

// الأيقونة الافتراضية لكل نشاط أساسي
export const TYPE_KIND_ICONS: Record<string, string> = {
  products: '🛍️', rentals: '🏠', hotel: '🏨', services: '🛠️', restaurants: '🍽️',
  malls: '🏬',
};

// أسماء الأنشطة الأساسية للعرض
export const KIND_LABELS: Record<string, string> = {
  products: 'منتجات ومتاجر', rentals: 'إيجارات وعقارات', hotel: 'فنادق وضيافة', services: 'خدمات', restaurants: 'مطاعم ومأكولات',
  malls: 'مولات تجارية',
};

// قوالب وصف النوع (تُعرض للبائع في معالج الإنشاء)
const TYPE_DESCRIPTION_TEMPLATES: Record<string, (name: string) => string> = {
  products: (n) => `${n} — عرض وبيع المنتجات مع الطلبات والتوصيل`,
  rentals: (n) => `${n} — عرض الوحدات للإيجار مع الحجوزات والتقويم`,
  hotel: (n) => `${n} — غرف وحجوزات فندقية مع إدارة الإشغال`,
  services: (n) => `${n} — تقديم الخدمات مع استقبال الحجوزات والطلبات`,
  restaurants: (n) => `${n} — منيو شهي بأصناف مصوّرة مع الطلبات والتوصيل السريع`,
  malls: (n) => `${n} — سوق إلكتروني شامل بأصناف رئيسية وفرعية وعروض وسلة تسوق متكاملة`,
};

export interface GeneratedStoreType {
  kind: string;
  nameAr: string;
  icon: string;
  color: string;
  description: string;
  template: string;
  terms: { item: string; items: string; order: string; addNew: string };
  modules: string[];
  kindLabel: string;
  confidence: 'high' | 'low';
}

// 🤖 التوليد الذكي الكامل لنوع جديد من اسمه فقط
export function generateStoreType(rawName: string): GeneratedStoreType {
  const nameAr = cleanName(rawName || '') || 'نوع جديد';
  const norm = normalizeArabic(nameAr);

  // 1) اكتشاف النشاط الأساسي — كلمات خدمات/فنادق/إيجارات أولاً ثم منتجات افتراضياً
  const { key, scores } = scoreKeywords(nameAr, TYPE_KIND_KEYWORDS);
  const kind = key || 'products';
  const confidence = (scores[kind] || 0) > 0 ? 'high' : 'low';

  // 2) الأيقونة — أول خريطة تتطابق، وإلا أيقونة النشاط
  let icon = TYPE_KIND_ICONS[kind];
  for (const entry of TYPE_ICON_MAP) {
    if (entry.keywords.some((w) => norm.includes(normalizeArabic(w)))) {
      icon = entry.icon;
      break;
    }
  }

  // 3) اللون والقالب والوصف والمصطلحات من قاعدة المعرفة
  return {
    kind,
    nameAr,
    icon,
    color: TYPE_KIND_COLORS[kind],
    description: TYPE_DESCRIPTION_TEMPLATES[kind](nameAr),
    template: KIND_TEMPLATE_MAP[kind] || 'default',
    terms: KIND_PRESETS[kind].terms,
    modules: KIND_PRESETS[kind].modules,
    kindLabel: KIND_LABELS[kind],
    confidence,
  };
}
