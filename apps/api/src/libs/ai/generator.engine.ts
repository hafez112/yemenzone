// ═══════════════════════════════════════════════════════════════
//  🧠 مكتبة يمن زون للذكاء الاصطناعي المحلي — محرك التوليد
//  توليد الأوصاف التسويقية + اختيار القوالب والألوان + اقتراح الأسعار
// ═══════════════════════════════════════════════════════════════

import {
  CATEGORY_TEMPLATE_MAP, KIND_TEMPLATE_MAP,
  PRODUCT_DESCRIPTION_TEMPLATES, STORE_DESCRIPTION_TEMPLATES,
  ProductCategoryInfo,
} from './knowledge.base';

// اختيار عنصر عشوائي من قائمة قوالب (تنويع المخرجات)
export function pickOne<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

// توليد وصف تسويقي لنشاط (متجر/فندق/إيجارات/خدمات) حسب نوعه وتصنيفه
export function generateStoreDescription(kind: string, name: string, cat?: ProductCategoryInfo | null): string {
  const tpl = STORE_DESCRIPTION_TEMPLATES[kind] || STORE_DESCRIPTION_TEMPLATES.products;
  return tpl(name, cat?.name || 'المنتجات');
}

// توليد وصف منتج تسويقي من القوالب الجاهزة
export function generateProductDescription(productName: string, categoryName?: string): string {
  return pickOne(PRODUCT_DESCRIPTION_TEMPLATES)(productName, categoryName || 'المتجر');
}

// الهوية البصرية الذكية: لون التصنيف + القالب المناسب للنشاط
export function suggestTheme(kind: string, categoryId?: string | null, catColor?: string): {
  primary: string; secondary: string; template: string;
} {
  const template = kind === 'products'
    ? (CATEGORY_TEMPLATE_MAP[categoryId || ''] || 'default')
    : (KIND_TEMPLATE_MAP[kind] || 'default');
  return { primary: catColor || '#6C3DF5', secondary: '#00E5C7', template };
}

// اقتراح سعر تخفيض ذكي: خصم ~12% مقرب لمئات
export function suggestSalePrice(price: number): number | null {
  if (!price || price <= 0) return null;
  const sale = price * 0.88;
  return Math.round(sale / 100) * 100 || Math.round(sale);
}
