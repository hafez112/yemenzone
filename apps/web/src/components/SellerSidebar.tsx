'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { kindInfo } from '@/lib/activity';

// القائمة الجانبية الذكية — تتغير حسب وحدات المتجر (modules من الذكاء المحلي)
// feature: الميزة المطلوبة لفتح الصفحة — تظهر 🔒 إن كانت مقفلة في خطة البائع
const MENU: Record<string, { href: string; icon: string; label: string; feature?: string }> = {
  products:  { href: '/seller/products',  icon: '📦', label: 'المنتجات' },
  orders:    { href: '/seller/orders',    icon: '🛒', label: 'الطلبات' },
  returns:   { href: '/seller/returns',   icon: '↩️', label: 'الاسترجاع' },
  categories: { href: '/seller/categories', icon: '🗂️', label: 'الأصناف' },
  rentals:   { href: '/seller/rentals',   icon: '🏠', label: 'الوحدات والحجوزات' },
  rooms:     { href: '/seller/rooms',     icon: '🛎️', label: 'الغرف والحجوزات' },
  services:  { href: '/seller/services',  icon: '🛠️', label: 'الخدمات والطلبات' },
  bookings:  { href: '/seller/rentals',   icon: '📅', label: 'الحجوزات' },
  requests:  { href: '/seller/services',  icon: '📋', label: 'الطلبات الواردة' },
  customers: { href: '/seller/customers', icon: '👥', label: 'العملاء', feature: 'crm' },
  coupons:   { href: '/seller/coupons',   icon: '🎟️', label: 'الكوبونات', feature: 'coupons' },
  ads:       { href: '/seller/ads',       icon: '📢', label: 'إعلاناتي' },
  reviews:   { href: '/seller/reviews',   icon: '⭐', label: 'التقييمات' },
  questions: { href: '/seller/questions', icon: '💬', label: 'أسئلة العملاء' },
  inventory: { href: '/seller/inventory', icon: '📦', label: 'المخزون', feature: 'inventory' },
  growth:    { href: '/seller/growth',    icon: '🚀', label: 'مساعد النمو' },
  tools:     { href: '/seller/tools',     icon: '🧰', label: 'أدوات التاجر' },
  chats:     { href: '/seller/chats',     icon: '💬', label: 'المحادثات' },
  campaigns: { href: '/seller/campaigns', icon: '📣', label: 'حملاتي', feature: 'campaigns' },
  share:     { href: '/seller/share',     icon: '📱', label: 'مشاركة متجري' },
  verification: { href: '/seller/verification', icon: '🎖️', label: 'توثيق متجري' },
  achievements: { href: '/seller/achievements', icon: '🏅', label: 'إنجازاتي' },
  domain:    { href: '/seller/domain',    icon: '🌐', label: 'نطاقي الخاص', feature: 'customDomain' },
  delivery:  { href: '/seller/delivery',  icon: '🚚', label: 'التوصيل' },
  checkout:  { href: '/seller/checkout',  icon: '💳', label: 'الدفع والتوصيل' },
  finance:   { href: '/seller/finance',   icon: '💹', label: 'التقرير المالي', feature: 'finance' },
  analytics: { href: '/seller/analytics', icon: '📊', label: 'الإحصائيات', feature: 'analytics' },
  wallet:    { href: '/seller/wallet',    icon: '💰', label: 'المحفظة' },
  card:      { href: '/seller/card',      icon: '💳', label: 'بطاقتي' },
  investment: { href: '/seller/investment', icon: '📈', label: 'استثماري' },
  api:       { href: '/seller/api',       icon: '🔑', label: 'API للمطورين', feature: 'api' },
  smartAdd:  { href: '/seller/smart-add', icon: '🤖', label: 'الإضافة الذكية', feature: 'smartAdd' },
  pwa:       { href: '/seller/pwa',       icon: '📲', label: 'تطبيق متجري', feature: 'pwa' },
};

export default function SellerSidebar({ store }: { store: any }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);

  // 🔔 عدادا التنبيهات والمحادثات — يتحدثان كل 30 ثانية
  useEffect(() => {
    let live = true;
    const fetchCount = () => {
      api('/seller/notifications/unread-count').then(r => { if (live) setUnread(r.count || 0); }).catch(() => {});
      api('/seller/chats/unread').then(r => { if (live) setChatUnread(r.count || 0); }).catch(() => {});
    };
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    // ☰ الشريط السفلي يفتح القائمة عبر هذا الحدث
    const openMenu = () => setOpen(true);
    window.addEventListener('yz-seller-menu', openMenu);
    return () => { live = false; clearInterval(t); window.removeEventListener('yz-seller-menu', openMenu); };
  }, []);
  // 🧬 فصل كامل بين الأنشطة — لكل نوع متجر قائمته الخاصة، لا علاقة بينها وبين متاجر المنتجات
  // 📂 مُجمَّعة بترتيب سير العمل: العمليات اليومية أولاً، ثم التسويق، ثم المال، ثم الحساب
  const KIND_MODULES: Record<string, { title: string; items: string[] }[]> = {
    // متاجر المنتجات: المنظومة الكاملة (سلة/طلبات/مخزون/توصيل/مالية...)
    products: [
      { title: '📦 العمليات اليومية', items: ['orders', 'chats', 'products', 'smartAdd', 'categories', 'inventory', 'returns', 'questions', 'reviews'] },
      { title: '📣 التسويق والنمو', items: ['coupons', 'ads', 'campaigns', 'share', 'growth', 'tools'] },
      { title: '💰 المال والتشغيل', items: ['wallet', 'card', 'finance', 'analytics', 'checkout', 'delivery'] },
      { title: '🏪 متجري وحسابي', items: ['investment', 'customers', 'pwa', 'verification', 'achievements', 'domain', 'api'] },
    ],
    // 🍽️ المطاعم: نفس منظومة المنتجات (المنيو = أصناف + طلبات + توصيل) بتسميات مطعمية
    restaurants: [
      { title: '🍽️ العمليات اليومية', items: ['orders', 'chats', 'products', 'smartAdd', 'categories', 'inventory', 'returns', 'questions', 'reviews'] },
      { title: '📣 التسويق والنمو', items: ['coupons', 'ads', 'campaigns', 'share', 'growth', 'tools'] },
      { title: '💰 المال والتشغيل', items: ['wallet', 'card', 'finance', 'analytics', 'checkout', 'delivery'] },
      { title: '🍽️ مطعمي وحسابي', items: ['investment', 'customers', 'pwa', 'verification', 'achievements', 'domain', 'api'] },
    ],
    // 🏬 المولات التجارية: المنظومة الكاملة بأوسع نطاق — سوق إلكتروني شامل
    malls: [
      { title: '🏬 العمليات اليومية', items: ['orders', 'chats', 'products', 'smartAdd', 'categories', 'inventory', 'returns', 'questions', 'reviews'] },
      { title: '📣 التسويق والنمو', items: ['coupons', 'ads', 'campaigns', 'share', 'growth', 'tools'] },
      { title: '💰 المال والتشغيل', items: ['wallet', 'card', 'finance', 'analytics', 'checkout', 'delivery'] },
      { title: '🏬 المول وحسابي', items: ['investment', 'customers', 'pwa', 'verification', 'achievements', 'domain', 'api'] },
    ],
    // أنشطة الحجز: إدارة العناصر والحجوزات + التسويق الذاتي فقط — بلا طلبات/مخزون/توصيل/محفظة
    rentals: [
      { title: '📅 العمليات اليومية', items: ['rentals', 'chats', 'reviews'] },
      { title: '📣 التسويق والنمو', items: ['ads', 'tools', 'share'] },
      { title: '🏠 نشاطي وحسابي', items: ['investment', 'card', 'pwa', 'verification', 'achievements', 'domain'] },
    ],
    hotel: [
      { title: '🛎️ العمليات اليومية', items: ['rooms', 'chats', 'reviews'] },
      { title: '📣 التسويق والنمو', items: ['ads', 'tools', 'share'] },
      { title: '🏨 فندقي وحسابي', items: ['investment', 'card', 'pwa', 'verification', 'achievements', 'domain'] },
    ],
    services: [
      { title: '🛠️ العمليات اليومية', items: ['services', 'chats', 'reviews'] },
      { title: '📣 التسويق والنمو', items: ['ads', 'tools', 'share'] },
      { title: '🛠️ نشاطي وحسابي', items: ['investment', 'card', 'pwa', 'verification', 'achievements', 'domain'] },
    ],
  };
  // 🏷️ تسميات وأيقونات خاصة بالمطاعم — المنيو بدل المنتجات، والمطبخ بدل المخزون
  const KIND_LABEL_OVERRIDES: Record<string, Record<string, { label: string; icon?: string }>> = {
    restaurants: {
      products: { label: 'المنيو', icon: '🍽️' },
      categories: { label: 'أقسام المنيو', icon: '📑' },
      inventory: { label: 'مخزون المطبخ', icon: '🥘' },
      orders: { label: 'طلبات الزبائن' },
      questions: { label: 'أسئلة الزبائن' },
      share: { label: 'مشاركة مطعمي' },
      verification: { label: 'توثيق مطعمي' },
      pwa: { label: 'تطبيق مطعمي' },
      smartAdd: { label: 'إضافة أصناف ذكية' },
    },
    malls: {
      products: { label: 'منتجات المول', icon: '🏬' },
      categories: { label: 'أصناف المول', icon: '🗂️' },
      orders: { label: 'طلبات المول' },
      inventory: { label: 'مخزون المول', icon: '🏭' },
      questions: { label: 'أسئلة المتسوقين' },
      share: { label: 'مشاركة مولي' },
      verification: { label: 'توثيق المول' },
      pwa: { label: 'تطبيق المول' },
    },
    rentals: { pwa: { label: 'تطبيق معرضي' } },
    hotel: { pwa: { label: 'تطبيق فندقي' } },
    services: { pwa: { label: 'تطبيق مركزي' } },
  };
  const storeKind: string = store?.type?.kind || 'products';
  const groups = KIND_MODULES[storeKind] || KIND_MODULES.products;
  const labelOverrides = KIND_LABEL_OVERRIDES[storeKind] || {};
  const kn = kindInfo(store); // 🏷️ تسمية النشاط — فندق/عقارات/خدمات/مطعم، لا «متجر» للجميع

  const close = () => setOpen(false);

  return (
    <>
      {/* زر القائمة العائم — جوال فقط */}
      <button onClick={() => setOpen(!open)} aria-label="قائمة المتجر"
        className="md:hidden fixed bottom-20 left-3 z-[71] w-12 h-12 rounded-full text-white text-xl shadow-xl flex items-center justify-center"
        style={{ background: 'var(--primary)' }}>
        {open ? '✕' : '☰'}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center anim-pulse-glow">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {/* خلفية معتمة عند فتح القائمة في الجوال */}
      {open && <div onClick={close} className="md:hidden fixed inset-0 bg-black/50 z-[60]" />}
      <aside className={`${open
          ? 'fixed top-0 bottom-0 right-0 z-[70] w-64 overflow-y-auto bg-white rounded-none shadow-2xl'
          : 'hidden'} md:block md:static md:z-auto glass md:rounded-3xl p-3 md:w-56 shrink-0`}>
      <Link href="/seller" onClick={close}
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold f-sm mb-1 transition-all ${
          path === '/seller' ? 'text-white theme-glow' : 'hover:bg-white/60 text-gray-600'
        }`}
        style={path === '/seller' ? { background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)))' } : {}}>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${
          path === '/seller' ? 'bg-white/20' : 'bg-purple-50'
        }`}>🏠</span>
        الرئيسية
      </Link>
      {groups.map((g, gi) => (
        <div key={g.title}>
          {gi > 0 && <hr className="my-1.5 border-gray-200/50" />}
          <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-extrabold text-gray-400">{g.title}</div>
          {g.items.map(m => {
            const item = MENU[m];
            if (!item) return null;
            const active = path.startsWith(item.href);
            // 🔒 الميزة مقفلة إن لم تمنحها الخطة أو الإدارة
            const locked = item.feature && store?.features && !store.features[item.feature];
            return (
              <Link key={m} href={item.href} onClick={close}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold f-sm mb-1 transition-all ${
                  active ? 'text-white theme-glow' : 'hover:bg-white/60 text-gray-600'
                }`}
                style={active ? { background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)))' } : {}}>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 transition-all ${
                  active ? 'bg-white/20 scale-105' : 'bg-purple-50'
                }`}>{labelOverrides[m]?.icon || item.icon}</span>
                <span className="truncate">{labelOverrides[m]?.label || item.label}</span>
                {locked && <span className="mr-auto text-[10px] opacity-70">🔒</span>}
                {m === 'chats' && chatUnread > 0 && (
                  <span className="mr-auto text-[10px] font-extrabold bg-red-500 text-white min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center anim-soft-pulse">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      <hr className="my-2 border-gray-200/50" />
      {[
        { href: '/seller/reports', icon: '📊', label: 'تقريري الأسبوعي' },
        { href: '/seller/invite', icon: '🤝', label: 'ادعُ التجار واكسب' },
        { href: '/seller/notifications', icon: '🔔', label: 'التنبيهات', badge: unread },
        { href: '/seller/support', icon: '🎧', label: 'الدعم الفني' },
        { href: '/seller/subscription', icon: '💎', label: 'اشتراكي', star: store?.isFeatured },
        { href: '/seller/settings', icon: '⚙️', label: `إعدادات ${kn.noun === 'متجر' ? 'المتجر' : kn.pageWord}` },
      ].map((l: any) => {
        const active = path === l.href;
        return (
          <Link key={l.href} href={l.href} onClick={close}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold f-sm mb-1 transition-all ${
              active ? 'text-white theme-glow' : 'hover:bg-white/60 text-gray-600'
            }`}
            style={active ? { background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)))' } : {}}>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${active ? 'bg-white/20' : 'bg-purple-50'}`}>{l.icon}</span>
            <span className="truncate">{l.label}</span>
            {l.badge > 0 && (
              <span className="mr-auto text-[10px] font-extrabold bg-red-500 text-white min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center">
                {l.badge > 99 ? '99+' : l.badge}
              </span>
            )}
            {l.star && <span className="mr-auto text-[10px]">⭐</span>}
          </Link>
        );
      })}
      <a href={`/store/${store?.slug || ''}`} target="_blank"
        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold f-sm text-teal-600 hover:bg-teal-50 transition-all">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 bg-teal-50">👁️</span>
        معاينة {kn.yours}
      </a>
      </aside>
    </>
  );
}
