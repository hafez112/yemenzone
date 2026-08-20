// ═══════════════════════════════════════════════════════════
//  تعريفات الأنشطة التجارية — المصدر الوحيد للحقيقة في الواجهة
//  تقود: الأشرطة الخاصة بكل متجر + نماذج البائع + عرض المواصفات
// ═══════════════════════════════════════════════════════════

export type StoreKind = 'products' | 'rentals' | 'hotel' | 'services' | 'restaurants' | 'malls';

// هوية كل نشاط: اسمه وأيقونته ومصطلحاته
// ⚠️ كل نشاط يُسمّى باسمه — الفندق «فندق» لا «متجر»، والإيجارات «عقارات»، والخدمات «مركز خدمات»
export const KIND_INFO: Record<StoreKind, {
  label: string; icon: string; item: string; items: string; cta: string;
  noun: string;      // اسم النشاط مفرداً: متجر / فندق / معرض إيجارات / مركز خدمات
  nounPlural: string;// الجمع: المتاجر / الفنادق / العقارات / مراكز الخدمات
  yours: string;     // بصيغة الملكية: متجرك / فندقك / عقاراتك / خدماتك
  manager: string;   // صفة المالك: التاجر / إدارة الفندق / المؤجّر / مقدم الخدمة
  pageWord: string;  // «صفحة الـ...» في العناوين
  thisNoun: string;  // بصيغة الإشارة: هذا المتجر / هذا الفندق...
}> = {
  products: { label: 'متجر منتجات', icon: '🛍️', item: 'منتج', items: 'المنتجات', cta: 'تسوّق الآن', noun: 'متجر', nounPlural: 'المتاجر', yours: 'متجرك', manager: 'التاجر', pageWord: 'المتجر', thisNoun: 'هذا المتجر' },
  rentals:  { label: 'عقارات للإيجار', icon: '🏠', item: 'وحدة', items: 'الوحدات', cta: 'احجز وحدتك', noun: 'معرض إيجارات', nounPlural: 'العقارات', yours: 'عقاراتك', manager: 'المؤجّر', pageWord: 'الإيجارات', thisNoun: 'معرض الإيجارات هذا' },
  hotel:    { label: 'فندق', icon: '🛎️', item: 'غرفة', items: 'الغرف', cta: 'احجز غرفتك', noun: 'فندق', nounPlural: 'الفنادق', yours: 'فندقك', manager: 'إدارة الفندق', pageWord: 'الفندق', thisNoun: 'هذا الفندق' },
  services: { label: 'مركز خدمات', icon: '🛠️', item: 'خدمة', items: 'الخدمات', cta: 'اطلب خدمتك', noun: 'مركز خدمات', nounPlural: 'مراكز الخدمات', yours: 'خدماتك', manager: 'مقدم الخدمة', pageWord: 'الخدمات', thisNoun: 'مركز الخدمات هذا' },
  restaurants: { label: 'مطعم', icon: '🍽️', item: 'صنف', items: 'المنيو', cta: 'اطلب من المنيو', noun: 'مطعم', nounPlural: 'المطاعم', yours: 'مطعمك', manager: 'إدارة المطعم', pageWord: 'المطعم', thisNoun: 'هذا المطعم' },
  malls: { label: 'مول تجاري', icon: '🏬', item: 'منتج', items: 'المنتجات', cta: 'تسوّق الآن', noun: 'مول', nounPlural: 'المولات', yours: 'مولك', manager: 'إدارة المول', pageWord: 'المول', thisNoun: 'هذا المول' },
};

// جاهز للاستخدام السريع: kindInfo(store) — يرجع هوية النشاط لأي كائن فيه type.kind
export const kindInfo = (store: any) => KIND_INFO[(store?.type?.kind || 'products') as StoreKind] || KIND_INFO.products;

// تسميات مفاتيح المواصفات — تُعرض للزائر بالعربية
export const SPEC_LABELS: Record<string, string> = {
  // مشتركة/منتجات
  brand: 'الماركة', model: 'الموديل', warrantyMonths: 'الضمان (شهر)', color: 'اللون',
  weightGrams: 'الوزن (جم)', expiryDate: 'تاريخ الانتهاء', origin: 'المنشأ',
  material: 'الخامة', gender: 'الفئة', season: 'الموسم', grind: 'درجة الطحن', roast: 'التحميص',
  // إيجارات
  floor: 'الطابق', furnished: 'مفروشة', parking: 'موقف سيارة', elevator: 'مصعد',
  // فنادق
  bathrooms: 'عدد الحمامات', wifi: 'واي فاي', ac: 'مكيّف',
  // خدمات
  includes: 'يشمل', workLocation: 'مكان التنفيذ', experience: 'سنوات الخبرة',
  // مطاعم
  spiceLevel: 'درجة الحار', calories: 'السعرات الحرارية', servingSize: 'حجم الحصة', prepMinutes: 'وقت التحضير (دقيقة)',
};

// مخططات مواصفات المنتجات حسب نوع المنتج الفرعي
export interface SpecField { key: string; label: string; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; placeholder?: string }
export const PRODUCT_KINDS: { id: string; name: string; icon: string; fields: SpecField[] }[] = [
  { id: 'electronics', name: 'إلكترونيات', icon: '📱', fields: [
    { key: 'brand', label: 'الماركة', placeholder: 'سامسونج، آبل...' },
    { key: 'model', label: 'الموديل', placeholder: 'Galaxy S24' },
    { key: 'warrantyMonths', label: 'الضمان (بالأشهر)', type: 'number' },
    { key: 'color', label: 'اللون' },
  ]},
  { id: 'food', name: 'مواد غذائية', icon: '🛒', fields: [
    { key: 'weightGrams', label: 'الوزن (جم)', type: 'number' },
    { key: 'expiryDate', label: 'تاريخ الانتهاء', type: 'date' },
    { key: 'origin', label: 'بلد المنشأ' },
  ]},
  { id: 'clothing', name: 'ملابس', icon: '👕', fields: [
    { key: 'material', label: 'الخامة', placeholder: 'قطن، حرير...' },
    { key: 'gender', label: 'الفئة', type: 'select', options: ['رجالي', 'نسائي', 'أطفال', 'للجميع'] },
    { key: 'season', label: 'الموسم', type: 'select', options: ['صيفي', 'شتوي', 'كل المواسم'] },
  ]},
  { id: 'accessories', name: 'إكسسوارات', icon: '⌚', fields: [
    { key: 'material', label: 'الخامة', placeholder: 'جلد، ستانلس...' },
    { key: 'color', label: 'اللون' },
    { key: 'brand', label: 'الماركة' },
  ]},
  { id: 'spices', name: 'بهارات', icon: '🌶️', fields: [
    { key: 'weightGrams', label: 'الوزن (جم)', type: 'number' },
    { key: 'grind', label: 'درجة الطحن', type: 'select', options: ['مطحون ناعم', 'مطحون خشن', 'حب كامل'] },
    { key: 'origin', label: 'المنشأ' },
  ]},
  { id: 'nuts', name: 'مكسرات', icon: '🥜', fields: [
    { key: 'weightGrams', label: 'الوزن (جم)', type: 'number' },
    { key: 'roast', label: 'التحميص', type: 'select', options: ['نيء', 'محمص', 'محمص مملح'] },
    { key: 'origin', label: 'المنشأ' },
  ]},
  { id: 'dishes', name: 'أطباق ومأكولات', icon: '🍽️', fields: [
    { key: 'spiceLevel', label: 'درجة الحار', type: 'select', options: ['عادي', 'حار خفيف', 'حار', 'حار جداً'] },
    { key: 'servingSize', label: 'حجم الحصة', placeholder: 'شخص واحد، يكفي شخصين...' },
    { key: 'prepMinutes', label: 'وقت التحضير (دقيقة)', type: 'number' },
    { key: 'calories', label: 'السعرات الحرارية', type: 'number' },
  ]},
  { id: 'drinks', name: 'مشروبات وعصائر', icon: '🥤', fields: [
    { key: 'servingSize', label: 'الحجم', placeholder: 'كوب كبير 500مل...' },
    { key: 'calories', label: 'السعرات الحرارية', type: 'number' },
  ]},
  { id: 'desserts', name: 'حلويات', icon: '🍰', fields: [
    { key: 'servingSize', label: 'حجم الحصة', placeholder: 'قطعة، صحن...' },
    { key: 'calories', label: 'السعرات الحرارية', type: 'number' },
  ]},
  { id: 'other', name: 'أخرى', icon: '📦', fields: [
    { key: 'brand', label: 'الماركة' },
    { key: 'origin', label: 'المنشأ' },
  ]},
];

export const productKindInfo = (id?: string | null) => PRODUCT_KINDS.find(k => k.id === id) || null;

// مخططات المواصفات الإضافية لعناصر الحجز (وحدة/غرفة/خدمة)
export const BOOKING_SPEC_FIELDS: Record<'rentals' | 'hotel' | 'services', SpecField[]> = {
  rentals: [
    { key: 'floor', label: 'الطابق', type: 'number' },
    { key: 'furnished', label: 'مفروشة؟', type: 'select', options: ['مفروشة', 'غير مفروشة', 'نصف مفروشة'] },
    { key: 'parking', label: 'موقف سيارة', type: 'select', options: ['يوجد', 'لا يوجد'] },
    { key: 'elevator', label: 'مصعد', type: 'select', options: ['يوجد', 'لا يوجد'] },
  ],
  hotel: [
    { key: 'bathrooms', label: 'عدد الحمامات', type: 'number' },
    { key: 'wifi', label: 'واي فاي', type: 'select', options: ['مجاني', 'مدفوع', 'لا يوجد'] },
    { key: 'ac', label: 'مكيّف', type: 'select', options: ['يوجد', 'لا يوجد'] },
  ],
  services: [
    { key: 'includes', label: 'يشمل', placeholder: 'النقل، الأدوات...' },
    { key: 'workLocation', label: 'مكان التنفيذ', type: 'select', options: ['في موقع العميل', 'في الورشة/المقر', 'عن بُعد'] },
    { key: 'experience', label: 'سنوات الخبرة', type: 'number' },
  ],
};

// رقائق عرض المواصفات للزائر — يحوّل specs إلى [{icon, text}]
export function specChips(specs: any): string[] {
  if (!specs || typeof specs !== 'object') return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(specs)) {
    if (v === null || v === undefined || v === '') continue;
    const label = SPEC_LABELS[k] || k;
    out.push(`${label}: ${v}`);
  }
  return out;
}
