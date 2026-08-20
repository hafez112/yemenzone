// ═══════════════════════════════════════════════════════════════
//  🧠 مكتبة يمن زون للذكاء الاصطناعي المحلي — قاعدة المعرفة
//  تصنيفات المنتجات + كلمات كشف النشاط + إعدادات الأنشطة الأربعة
//  + اقتراحات الأصناف + قوالب الوصف والنصائح
// ═══════════════════════════════════════════════════════════════

// تصنيفات المنتجات الستة المعتمدة
export const PRODUCT_CATEGORIES = [
  { id: 'electronics', name: 'إلكترونيات', icon: '📱', color: '#0EA5E9' },
  { id: 'food',        name: 'مواد غذائية', icon: '🛒', color: '#F59E0B' },
  { id: 'clothing',    name: 'ملابس',       icon: '👕', color: '#E11D48' },
  { id: 'accessories', name: 'إكسسوارات',   icon: '⌚', color: '#8B5CF6' },
  { id: 'spices',      name: 'بهارات',      icon: '🌶️', color: '#DC2626' },
  { id: 'nuts',        name: 'مكسرات',      icon: '🥜', color: '#92400E' },
] as const;

export type ProductCategoryInfo = (typeof PRODUCT_CATEGORIES)[number];

export const categoryById = (id: string): ProductCategoryInfo | undefined =>
  PRODUCT_CATEGORIES.find((c) => c.id === id);

// قاعدة معرفة: كلمات مفتاحية → نشاط تجاري (للكشف التلقائي من اسم النشاط)
export const ACTIVITY_KEYWORDS: Record<string, string[]> = {
  electronics: ['جوال', 'هاتف', 'كمبيوتر', 'لابتوب', 'شاشة', 'ساعة ذكية', 'سماعة', 'إلكترون', 'تقني', 'موبايل'],
  food:        ['غذائي', 'مواد', 'بقالة', 'سوبرماركت', 'تموين', 'أكل', 'طعام', 'مشروبات', 'مطعم', 'مشويات', 'مندي', 'بيتزا', 'برجر', 'شاورما', 'كافيه', 'قهوة'],
  clothing:    ['ملابس', 'أزياء', 'فساتين', 'قميص', 'عباية', 'بوتيك', 'أطفال', 'رجالي', 'نسائي'],
  accessories: ['إكسسوار', 'ساعات', 'نظارات', 'عطور', 'مجوهرات', 'حقائب', 'شنط'],
  spices:      ['بهار', 'توابل', 'عطارة', 'حناء', 'زعفران'],
  nuts:        ['مكسر', 'لوز', 'عين جمل', 'فستق', 'زبيب', 'مكسرات'],
};

// إعدادات ذكية لكل نوع من أنواع المنصة الأربعة (وحدات اللوحة + إجراءات + مصطلحات)
export const KIND_PRESETS: Record<string, {
  modules: string[];
  quickActions: string[];
  terms: { item: string; items: string; order: string; addNew: string };
}> = {
  products: {
    modules: ['products', 'orders', 'customers', 'coupons', 'analytics', 'wallet'],
    quickActions: ['➕ إضافة منتج', '📦 الطلبات الجديدة', '🎟️ إنشاء كوبون', '📊 مبيعات اليوم'],
    terms: { item: 'منتج', items: 'المنتجات', order: 'طلب', addNew: 'إضافة منتج جديد' },
  },
  rentals: {
    modules: ['rentals', 'bookings', 'customers', 'analytics', 'wallet'],
    quickActions: ['➕ إضافة وحدة', '📅 الحجوزات', '📆 التقويم', '📊 إيرادات الشهر'],
    terms: { item: 'وحدة', items: 'الوحدات', order: 'حجز', addNew: 'إضافة وحدة إيجار' },
  },
  hotel: {
    modules: ['rooms', 'bookings', 'customers', 'analytics', 'wallet'],
    quickActions: ['➕ إضافة غرفة', '🛎️ الحجوزات النشطة', '📆 الإشغال', '📊 إيرادات الليلة'],
    terms: { item: 'غرفة', items: 'الغرف', order: 'حجز', addNew: 'إضافة غرفة' },
  },
  services: {
    modules: ['services', 'requests', 'customers', 'analytics', 'wallet'],
    quickActions: ['➕ إضافة خدمة', '📋 الطلبات الواردة', '⭐ التقييمات', '📊 دخل الأسبوع'],
    terms: { item: 'خدمة', items: 'الخدمات', order: 'طلب خدمة', addNew: 'إضافة خدمة' },
  },
  restaurants: {
    modules: ['products', 'orders', 'customers', 'coupons', 'analytics', 'wallet'],
    quickActions: ['➕ إضافة صنف للمنيو', '📦 الطلبات الجديدة', '🎟️ إنشاء كوبون', '🔥 مبيعات اليوم'],
    terms: { item: 'صنف', items: 'المنيو', order: 'طلب', addNew: 'إضافة صنف جديد للمنيو' },
  },
  malls: {
    modules: ['products', 'categories', 'orders', 'customers', 'coupons', 'analytics', 'wallet'],
    quickActions: ['➕ إضافة منتج', '🗂️ إدارة الأصناف', '🏷️ العروض والتخفيضات', '🔥 الأكثر مبيعاً'],
    terms: { item: 'منتج', items: 'المنتجات', order: 'طلب', addNew: 'إضافة منتج جديد للمول' },
  },
};

// أصناف مقترحة جاهزة حسب النشاط
export const CATEGORY_SUGGESTIONS: Record<string, { name: string; icon: string }[]> = {
  electronics: [
    { name: 'جوالات', icon: '📱' }, { name: 'لابتوبات', icon: '💻' },
    { name: 'سماعات وصوتيات', icon: '🎧' }, { name: 'ساعات ذكية', icon: '⌚' },
    { name: 'شواحن وكابلات', icon: '🔌' }, { name: 'شاشات', icon: '🖥️' },
  ],
  food: [
    { name: 'معلبات', icon: '🥫' }, { name: 'مشروبات', icon: '🥤' },
    { name: 'حلويات وسكاكر', icon: '🍬' }, { name: 'أرز ودقيق', icon: '🌾' },
    { name: 'زيوت وسمن', icon: '🫒' }, { name: 'مكرونة وشعيرية', icon: '🍝' },
    { name: 'مياه صحية', icon: '💧' }, { name: 'بقوليات', icon: '🫘' },
  ],
  clothing: [
    { name: 'رجالي', icon: '👔' }, { name: 'نسائي', icon: '👗' },
    { name: 'أطفال', icon: '🧒' }, { name: 'عبايات', icon: '🧕' },
    { name: 'أحذية', icon: '👟' }, { name: 'ملابس رياضية', icon: '🏃' },
  ],
  accessories: [
    { name: 'ساعات', icon: '⌚' }, { name: 'نظارات', icon: '🕶️' },
    { name: 'عطور', icon: '🌸' }, { name: 'حقائب', icon: '👜' },
    { name: 'محافظ', icon: '👛' }, { name: 'إكسسوارات جوال', icon: '📲' },
  ],
  spices: [
    { name: 'بهارات مشكلة', icon: '🌶️' }, { name: 'كمون وفلفل', icon: '🫙' },
    { name: 'كركم وزنجبيل', icon: '🧡' }, { name: 'هيل وقرفة', icon: '🌿' },
    { name: 'زعفران', icon: '🌺' }, { name: 'خلطات خاصة', icon: '✨' },
  ],
  nuts: [
    { name: 'لوز', icon: '🌰' }, { name: 'فستق', icon: '🥜' },
    { name: 'كاجو', icon: '🥠' }, { name: 'عين جمل', icon: '🌰' },
    { name: 'زبيب', icon: '🍇' }, { name: 'تمر مجفف', icon: '🌴' },
  ],
  rentals: [
    { name: 'شقق', icon: '🏢' }, { name: 'فلل', icon: '🏡' },
    { name: 'محلات تجارية', icon: '🏪' }, { name: 'مكاتب', icon: '🏢' },
  ],
  hotel: [
    { name: 'غرف مفردة', icon: '🛏️' }, { name: 'غرف مزدوجة', icon: '🛏️' },
    { name: 'أجنحة', icon: '👑' }, { name: 'غرف عائلية', icon: '👨‍👩‍👧' },
  ],
  services: [
    { name: 'صيانة', icon: '🔧' }, { name: 'تصميم', icon: '🎨' },
    { name: 'برمجة', icon: '💻' }, { name: 'استشارات', icon: '💼' },
  ],
  restaurants: [
    { name: 'الأطباق الرئيسية', icon: '🍽️' }, { name: 'المشويات', icon: '🍢' },
    { name: 'الإفطار', icon: '🍳' }, { name: 'المشروبات', icon: '🥤' },
    { name: 'الحلويات', icon: '🍰' },
  ],
  malls: [
    { name: 'إلكترونيات', icon: '📱' }, { name: 'أزياء وملابس', icon: '👗' },
    { name: 'عطور وتجميل', icon: '🌸' }, { name: 'أجهزة منزلية', icon: '🏠' },
    { name: 'سوبر ماركت', icon: '🛒' }, { name: 'رياضة ولياقة', icon: '🏋️' },
    { name: 'أطفال وألعاب', icon: '🧸' }, { name: 'كتب وقرطاسية', icon: '📚' },
  ],
};

// اختيار القالب حسب تصنيف المنتجات
export const CATEGORY_TEMPLATE_MAP: Record<string, string> = {
  electronics: 'modern', food: 'default', clothing: 'elegant',
  accessories: 'elegant', spices: 'default', nuts: 'default',
};

// القالب الافتراضي لكل نشاط
export const KIND_TEMPLATE_MAP: Record<string, string> = {
  products: 'default', rentals: 'modern', hotel: 'elegant', services: 'modern', restaurants: 'modern',
  malls: 'elegant',
};

// قوالب الوصف التسويقي لكل نشاط (name = اسم النشاط، cat = اسم التصنيف)
export const STORE_DESCRIPTION_TEMPLATES: Record<string, (name: string, cat: string) => string> = {
  restaurants: (name) => `${name} — أشهى الأطباق تُحضّر طازجة لحظة طلبك وتوصلك ساخنة 🍽️ اطلب من المنيو الآن`,
  malls: (name) => `${name} — مولك الإلكتروني الشامل 🏬 كل ما تحتاجه من إلكترونيات وأزياء وعطور وأجهزة في مكان واحد بأسعار منافسة وتوصيل سريع`,
  products: (name, cat) => `${name} — وجهتك الأولى لأفضل ${cat} في اليمن بجودة عالية وأسعار منافسة 🌟`,
  rentals:  (name) => `${name} — وحدات إيجار مميزة بمواقع استراتيجية وأسعار تنافسية. احجز وحدتك بسهولة 🏠`,
  hotel:    (name) => `${name} — إقامة راقية وخدمة استثنائية. غرف مريحة بأفضل الأسعار 🏨`,
  services: (name) => `${name} — خدمات احترافية بجودة مضمونة والتزام بالمواعيد 🛠️`,
};

// قوالب وصف المنتجات التسويقية
export const PRODUCT_DESCRIPTION_TEMPLATES: ((name: string, cat: string) => string)[] = [
  (name, cat) => `${name} — جودة أصلية مضمونة ✅ وسعر منافس. اطلبه الآن من قسم ${cat} ويصلك بسرعة!`,
  (name, cat) => `${name} الأفضل في ${cat} 🌟 — منتج مميز بمواصفات عالية، كمية محدودة سارع بالطلب!`,
  (name, cat) => `احصل على ${name} الآن 🔥 — اختيار عملائنا الأذكياء في قسم ${cat}. توصيل سريع ودفع عند الاستلام`,
];

// نصائح ذكية لكل نشاط (تُعرض بعد الإنشاء وفي الرؤى)
export const KIND_TIPS: Record<string, string[]> = {
  products: [
    '💡 أضف صوراً واضحة لكل منتج — الصور ترفع المبيعات 40%',
    '💡 فعّل زر طلبات واتساب لتصلك الطلبات فوراً',
  ],
  rentals: ['💡 حدّث تقويم الحجوزات يومياً لتجنب التعارض', '💡 أضف صوراً من زوايا مختلفة لكل وحدة'],
  hotel: ['💡 اعرض مميزات كل غرفة بوضوح (إطلالة/إفطار/واي فاي)', '💡 فعّل التقييمات لبناء الثقة'],
  services: ['💡 حدّد مدة تنفيذ كل خدمة بوضوح', '💡 اطلب من عملائك التقييم بعد كل خدمة'],
  restaurants: ['💡 صوّر كل صنف وهو ساخن وطازج — الصورة الشهية تبيع قبل الوصف', '💡 قسّم منيوك لأقسام واضحة (رئيسية/مشروبات/حلويات) ليجد العميل صنفه بسرعة'],
  malls: ['💡 نظّم مولك بأصناف رئيسية وفرعية — العميل يشتري أسرع حين يجد طريقه بسهولة', '💡 ميّز منتجاتك الأقوى بعلامة «متميز» وفعّل العروض — أقسام الواجهة تبيع نيابة عنك', '💡 اكتب وصفاً مختصراً وكلمات مفتاحية لكل منتج — محرك البحث داخل المول يعتمد عليها'],
};
