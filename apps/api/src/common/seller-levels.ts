// 🏅 مستويات البائعين وشارات الإنجاز — تُحسب من النشاط الحقيقي فقط (ذكاء محلي)
// لا بيانات تجريبية: المستوى = عدد الطلبات المكتملة (delivered) الفعلي

export interface SellerLevel {
  id: string;
  name: string;
  icon: string;
  color: string;
  minOrders: number;
}

export const SELLER_LEVELS: SellerLevel[] = [
  { id: 'bronze',   name: 'برونزي',  icon: '🥉', color: '#b45309', minOrders: 0 },
  { id: 'silver',   name: 'فضي',     icon: '🥈', color: '#64748b', minOrders: 10 },
  { id: 'gold',     name: 'ذهبي',    icon: '🥇', color: '#d97706', minOrders: 50 },
  { id: 'platinum', name: 'بلاتيني', icon: '💎', color: '#7c3aed', minOrders: 200 },
];

// يعيد المستوى الحالي + التالي + نسبة التقدم
export function levelOf(deliveredOrders: number) {
  let idx = 0;
  for (let i = 0; i < SELLER_LEVELS.length; i++) {
    if (deliveredOrders >= SELLER_LEVELS[i].minOrders) idx = i;
  }
  const level = SELLER_LEVELS[idx];
  const next = SELLER_LEVELS[idx + 1] || null;
  const progress = next
    ? Math.min(100, Math.round(((deliveredOrders - level.minOrders) / (next.minOrders - level.minOrders)) * 100))
    : 100;
  return { level, next, progress, deliveredOrders };
}

export interface BadgeDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  unlocked: boolean;
  current: number;  // القيمة الحالية
  target: number;   // الهدف
}

// الشارات — كل واحدة بشرط واضح وقابل للقياس
export function buildBadges(stats: {
  deliveredOrders: number;
  ratingAvg: number;
  ratingCount: number;
  likesCount: number;
  productsCount: number;
  isVerified: boolean;
  storeAgeDays: number;
}): BadgeDef[] {
  const s = stats;
  return [
    {
      id: 'first_order', icon: '🎉', name: 'أول مبيعة',
      desc: 'أكمل أول طلب في متجرك',
      unlocked: s.deliveredOrders >= 1, current: Math.min(s.deliveredOrders, 1), target: 1,
    },
    {
      id: 'orders_10', icon: '📦', name: 'بائع نشط',
      desc: 'أكمل ١٠ طلبات',
      unlocked: s.deliveredOrders >= 10, current: Math.min(s.deliveredOrders, 10), target: 10,
    },
    {
      id: 'orders_50', icon: '🚀', name: 'انطلاقة قوية',
      desc: 'أكمل ٥٠ طلباً',
      unlocked: s.deliveredOrders >= 50, current: Math.min(s.deliveredOrders, 50), target: 50,
    },
    {
      id: 'orders_100', icon: '🏆', name: 'تاجر المئة',
      desc: 'أكمل ١٠٠ طلب',
      unlocked: s.deliveredOrders >= 100, current: Math.min(s.deliveredOrders, 100), target: 100,
    },
    {
      id: 'verified', icon: '🎖️', name: 'موثق رسمياً',
      desc: 'احصل على الشارة الزرقاء من الإدارة',
      unlocked: s.isVerified, current: s.isVerified ? 1 : 0, target: 1,
    },
    {
      id: 'top_rated', icon: '⭐', name: 'تقييم ممتاز',
      desc: 'متوسط ٤.٥+ مع ٥ تقييمات على الأقل',
      unlocked: s.ratingAvg >= 4.5 && s.ratingCount >= 5,
      current: Math.min(s.ratingCount, 5), target: 5,
    },
    {
      id: 'loved', icon: '❤️', name: 'محبوب الزبائن',
      desc: 'اجمع ٥٠ إعجاباً بمتجرك',
      unlocked: s.likesCount >= 50, current: Math.min(s.likesCount, 50), target: 50,
    },
    {
      id: 'catalog', icon: '🗂️', name: 'متجر عامر',
      desc: 'أضف ٢٠ منتجاً فعالاً',
      unlocked: s.productsCount >= 20, current: Math.min(s.productsCount, 20), target: 20,
    },
    {
      id: 'veteran', icon: '🗓️', name: 'خبرة عام',
      desc: 'أكمل سنة كاملة مع يمن زون',
      unlocked: s.storeAgeDays >= 365, current: Math.min(s.storeAgeDays, 365), target: 365,
    },
  ];
}
