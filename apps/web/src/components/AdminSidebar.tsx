'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// 🗂️ الإدارات الفرعية — كل قسم بعنوان وروابطه، قابل للطي في الجوال
const SECTIONS: { id: string; title: string; icon: string; items: { href: string; icon: string; label: string }[] }[] = [
  {
    id: 'main', title: '', icon: '',
    items: [
      { href: '/admin', icon: '📊', label: 'الرئيسية' },
      { href: '/admin/ops', icon: '🧠', label: 'غرفة العمليات' },
      { href: '/admin/visitors', icon: '👁️', label: 'الزوار والتنبيهات' },
      { href: '/admin/ai', icon: '🤖', label: 'الذكاء الاصطناعي' },
    ],
  },
  {
    id: 'stores', title: 'إدارة المتاجر والبائعين', icon: '🏪',
    items: [
      { href: '/admin/stores', icon: '🏪', label: 'المتاجر والتجار' },
      { href: '/admin/store-types', icon: '🗂️', label: 'أنواع المتاجر' },
      { href: '/admin/verification', icon: '🎖️', label: 'توثيق المتاجر' },
      { href: '/admin/domains', icon: '🌐', label: 'النطاقات الخاصة' },
      { href: '/admin/ads', icon: '📢', label: 'الإعلانات' },
      { href: '/admin/rentals', icon: '🏠', label: 'إشراف الإيجارات' },
      { href: '/admin/rooms', icon: '🏨', label: 'إشراف الفنادق' },
      { href: '/admin/services', icon: '🛠️', label: 'إشراف الخدمات' },
      { href: '/admin/malls', icon: '🏬', label: 'إدارة المولات التجارية' },
      { href: '/admin/biz', icon: '🚀', label: 'طلبات «أضفني للبحث»' },
      { href: '/admin/quick-sells', icon: '🔗', label: 'بع برابط واحد' },
      { href: '/admin/used', icon: '♻️', label: 'سوق المستعمل' },
      { href: '/admin/requests', icon: '📢', label: 'اطلبها ونوفرها' },
    ],
  },
  {
    id: 'customers', title: 'إدارة العملاء والنمو', icon: '👥',
    items: [
      { href: '/admin/customers', icon: '👥', label: 'العملاء' },
      { href: '/admin/carts', icon: '🛒', label: 'السلات المهجورة' },
      { href: '/admin/referrals', icon: '🎁', label: 'الإحالات والنقاط' },
      { href: '/admin/reviews', icon: '⭐', label: 'التقييمات' },
      { href: '/admin/complaints', icon: '📣', label: 'الشكاوى' },
      { href: '/admin/support', icon: '🎧', label: 'الدعم الفني' },
    ],
  },
  {
    id: 'finance', title: 'الإدارة المالية', icon: '💰',
    items: [
      { href: '/admin/plans', icon: '💎', label: 'الخطط والاشتراكات' },
      { href: '/admin/coupons', icon: '🎟️', label: 'كوبونات المنصة' },
      { href: '/admin/payments', icon: '💳', label: 'المدفوعات' },
      { href: '/admin/cards', icon: '🎫', label: 'البطاقات والمحافظ' },
      { href: '/admin/finance', icon: '💹', label: 'المركز المالي' },
      { href: '/admin/accounting', icon: '💼', label: 'المكتب المحاسبي' },
      { href: '/admin/analytics', icon: '📈', label: 'تحليلات المنصة' },
    ],
  },
  {
    id: 'delivery', title: 'إدارة التوصيل', icon: '🚚',
    items: [
      { href: '/admin/drivers', icon: '🛵', label: 'السائقون' },
      { href: '/admin/delivery-companies', icon: '🚚', label: 'شركات التوصيل' },
      { href: '/admin/delivery-links', icon: '🔗', label: 'ربط التوصيل بالمتاجر' },
    ],
  },
  {
    id: 'reference', title: 'البيانات المرجعية', icon: '🗃️',
    items: [
      { href: '/admin/governorates', icon: '🏙️', label: 'المحافظات' },
      { href: '/admin/currencies', icon: '💱', label: 'العملات وأسعار الصرف' },
    ],
  },
  {
    id: 'content', title: 'إدارة المحتوى والتصميم', icon: '🎨',
    items: [
      { href: '/admin/design', icon: '🎨', label: 'إدارة التصميم' },
      { href: '/admin/files', icon: '🗂️', label: 'مدير الملفات' },
      { href: '/admin/pages', icon: '📄', label: 'الصفحات المخصصة' },
      { href: '/admin/platform-services', icon: '🧩', label: 'خدمات المنصة' },
      { href: '/admin/tools', icon: '🧰', label: 'تكنولوجيا المنصة' },
      { href: '/admin/blog', icon: '📰', label: 'المدونة' },
    ],
  },
  {
    id: 'comms', title: 'إدارة التواصل', icon: '💬',
    items: [
      { href: '/admin/messaging', icon: '💬', label: 'مركز المراسلة' },
      { href: '/admin/broadcasts', icon: '📡', label: 'مركز البث' },
    ],
  },
  {
    id: 'system', title: 'إدارة النظام والأمن', icon: '🛡️',
    items: [
      { href: '/admin/security', icon: '🛡️', label: 'مركز الأمن' },
      { href: '/admin/system-health', icon: '🩺', label: 'صحة النظام' },
      { href: '/admin/audit', icon: '📜', label: 'سجل التدقيق' },
      { href: '/admin/users', icon: '🧑‍🤝‍🧑', label: 'إدارة المستخدمين' },
      { href: '/admin/pwa-apps', icon: '📱', label: 'تطبيقات الويب' },
      { href: '/admin/settings', icon: '⚙️', label: 'إعدادات المنصة' },
      { href: '/admin/backups', icon: '💾', label: 'النسخ الاحتياطي' },
    ],
  },
];

const isActive = (path: string, href: string) =>
  href === '/admin' ? path === '/admin' : path.startsWith(href);

// القائمة الجانبية للإدارة العليا — مقسّمة لإدارات فرعية منسقة
export default function AdminSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // القسم المفتوح في الجوال = القسم الذي يحوي الصفحة الحالية
  const activeSection = SECTIONS.find((s) => s.items.some((i) => isActive(path, i.href)))?.id || 'main';
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [alertCount, setAlertCount] = useState(0);
  const close = () => setOpen(false);
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // 🔔 عداد تنبيهات الإدارة — يتحدث كل 30 ثانية
  useEffect(() => {
    let live = true;
    const fetchCount = () => api('/admin/alerts')
      .then((r) => { if (live) setAlertCount(r.total || 0); })
      .catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    // ☰ الشريط السفلي يفتح القائمة عبر هذا الحدث
    const openMenu = () => setOpen(true);
    window.addEventListener('yz-admin-menu', openMenu);
    return () => { live = false; clearInterval(t); window.removeEventListener('yz-admin-menu', openMenu); };
  }, []);

  return (
    <>
      {/* زر القائمة العائم — جوال فقط */}
      <button onClick={() => setOpen(!open)} aria-label="قائمة الإدارة"
        className="md:hidden fixed bottom-20 left-3 z-[71] w-12 h-12 rounded-full text-white text-xl shadow-xl flex items-center justify-center"
        style={{ background: 'var(--primary)' }}>
        {open ? '✕' : '☰'}
        {!open && alertCount > 0 && (
          <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center anim-pulse-glow">
            {alertCount > 99 ? '99+' : alertCount}
          </span>
        )}
      </button>
      {/* خلفية معتمة عند الفتح في الجوال */}
      {open && <div onClick={close} className="md:hidden fixed inset-0 bg-black/50 z-[60]" />}
      <aside className={`${open
          ? 'fixed top-0 bottom-0 right-0 z-[70] w-64 overflow-y-auto bg-slate-900 rounded-none shadow-2xl'
          : 'hidden'} md:block md:static md:z-auto glass-dark md:rounded-3xl p-3 md:w-60 shrink-0 text-white`}>
      <div className="px-3 py-2 mb-1 text-xs font-bold text-gray-400 flex items-center justify-between">
        <span>🛡️ الإدارة العليا</span>
        <span className="flex items-center gap-2">
          {/* 🔔 جرس التنبيهات — ينقل لمركز التنبيهات */}
          <Link href="/admin/alerts" onClick={close} aria-label="تنبيهات الإدارة"
            className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
              path === '/admin/alerts' ? 'text-white' : 'text-gray-300 hover:bg-white/10'
            }`}
            style={path === '/admin/alerts' ? { background: 'var(--primary)' } : { background: 'rgba(255,255,255,0.08)' }}>
            🔔
            {alertCount > 0 && (
              <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center anim-pulse-glow">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </Link>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">القرار الأول</span>
        </span>
      </div>

      {SECTIONS.map((sec) => {
        // في الجوال: الأقسام تُطوى ما عدا قسم الصفحة الحالية (إلا إن فتحها المستخدم)
        const isCollapsed = collapsed[sec.id] ?? (sec.id !== activeSection && sec.id !== 'main');
        return (
          <div key={sec.id} className="mb-1.5">
            {sec.title ? (
              // رأس القسم — رقاقة أيقونة متدرجة + عنوان + عدّاد + سهم دوّار
              <button onClick={() => toggle(sec.id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-2xl text-[12px] font-extrabold transition-all cursor-pointer ${
                  isCollapsed ? 'text-gray-300 hover:bg-white/10' : 'text-white bg-white/10 shadow-inner'
                }`}>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="sec-icon-chip">{sec.icon}</span>
                  <span className="truncate">{sec.title}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">{sec.items.length}</span>
                  <span className={`md:hidden inline-block text-[11px] text-gray-400 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>⌄</span>
                </span>
              </button>
            ) : null}
            {/* طيّ انسيابي متحرك — على الشاشات الكبيرة مفتوح دائماً */}
            <div className={`collapse-wrap ${isCollapsed ? 'collapsed' : ''} md:[grid-template-rows:1fr]`}>
              <div className="collapse-inner">
                <div className="pt-0.5">
                  {sec.items.map((m) => {
                    const active = isActive(path, m.href);
                    return (
                      <Link key={m.href} href={m.href} onClick={close}
                        className={`side-link flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-semibold text-[13px] mb-0.5 ${
                          active ? 'active text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                        style={active ? { background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 65%, #000))' } : {}}>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 transition-all ${
                          active ? 'bg-white/20 scale-105' : 'bg-white/5'
                        }`}>
                          {m.icon}
                        </span>
                        <span className="truncate">{m.label}</span>
                        {active && <span className="mr-auto text-[10px] opacity-80">◂</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <hr className="my-2 border-white/10" />
      <Link href="/" onClick={close} className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm text-teal-400 hover:bg-white/5">
        👁️ معاينة المنصة
      </Link>
      </aside>
    </>
  );
}
