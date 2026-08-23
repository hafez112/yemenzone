import { ForbiddenException } from '@nestjs/common';

// ═══════════════════════════════════════════════════════════
// نظام الميزات المركزي — المصدر الوحيد للحقيقة
// الميزات الفعالة = ميزات الخطة (إن كان الاشتراك نشطاً) + منح الإدارة الاستثنائية
// المدير هو المتحكم الوحيد: عبر الخطط أو عبر منح متجر محدد (grants)
// ═══════════════════════════════════════════════════════════

// ميزات الخطة المجانية — الأساس الذي يُبنى عليه (أي مفتاح غائب = مغلق)
export const FREE_FEATURES: Record<string, any> = {
  maxProducts: 20,
  maxImages: 3,
  storeKinds: ['products'],
  analytics: false,    // الإحصائيات المتقدمة
  coupons: false,      // الكوبونات
  api: false,          // مفاتيح API للمطورين
  customDesign: false, // تخصيص القالب والألوان
  customDomain: false, // النطاق الخاص
  campaigns: false,    // حملات تنبيه الزبائن
  storeAds: false,     // بنرات إعلانية داخل المتجر
  pwa: false,          // تطبيق ويب تقدمي للمتجر
  finance: false,      // التقرير المالي المتقدم للمتجر
  inventory: false,    // إدارة المخزون الذكية
  crm: false,          // إدارة العملاء وتحليلهم
  // ⚠️ «الإضافة الذكية» و«تطبيق المتجر» ليستا ميزتي خطط — خدمتان مدفوعتان تُشترى ببطاقة يمن زون (ToolPurchase)
};

// الأسماء العربية للميزات القابلة للقفل — تظهر في شاشات القفل ولوحة المدير
export const FEATURE_AR: Record<string, string> = {
  analytics: '📊 الإحصائيات المتقدمة',
  coupons: '🎟️ الكوبونات',
  api: '🔑 API للمطورين',
  customDesign: '🎨 تخصيص التصميم',
  customDomain: '🌐 النطاق الخاص',
  campaigns: '📣 حملات الزبائن',
  storeAds: '🖼️ بنرات المتجر الإعلانية',
  finance: '💹 التقرير المالي المتقدم',
  inventory: '📦 إدارة المخزون الذكية',
  crm: '👥 إدارة العملاء',
};

// هل الاشتراك ساري فعلاً الآن؟
export function subscriptionActive(sub: any): boolean {
  if (!sub || !sub.isActive) return false;
  if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) return false;
  return true;
}

// حساب الميزات الفعالة لمتجر
export function effectiveFeatures(store: any): Record<string, any> {
  const sub = store?.subscription;
  const planFeat = subscriptionActive(sub) ? ((sub.plan?.features as any) || {}) : {};
  const grants = (store?.grants as any) || {};
  // منح الإدارة تتجاوز الخطة — true في المنح يفتح الميزة دائماً
  const merged = { ...FREE_FEATURES, ...planFeat };
  for (const [k, v] of Object.entries(grants)) {
    if (v === true) merged[k] = true;
  }
  return merged;
}

// رمي خطأ قفل موحد — الواجهة تتعرف على featureCode وتعرض شاشة الترقية
export function featureLocked(feature: string): never {
  throw new ForbiddenException({
    message: `🔒 هذه الميزة تتطلب ترقية خطتك أو منحاً من الإدارة — ${FEATURE_AR[feature] || feature}`,
    featureCode: feature,
    locked: true,
  });
}

// فحص ميزة لمتجر — يرمي featureLocked إن كانت مغلقة
export function requireFeature(store: any, feature: string): void {
  const feats = effectiveFeatures(store);
  if (!feats[feature]) featureLocked(feature);
}
