'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getUser, logout } from '@/lib/api';
import { applyDir, t } from '@/lib/i18n';
import CurrencySwitcher from './CurrencySwitcher';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// الشريط العلوي الموحد — يقرأ التصميم الديناميكي (الجلسة 18): اللون + الإعلان + صفحات القائمة
// 📱 نسخة التطبيق: قائمة جانبية منزلقة بكل روابط المنصة + دعم منطقة شريط الحالة (safe-area)
export default function TopBar() {
  const path = usePathname();
  const [user, setUser] = useState<any>(null);
  const [type, setType] = useState<string>('');
  const [platform, setPlatform] = useState<any>({});
  const [menuPages, setMenuPages] = useState<{ slug: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

  useEffect(() => {
    applyDir(); // تطبيق اللغة المحفوظة إن وُجدت (المبدّل مخفي — الافتراضي عربي)
    setUser(getUser());
    setType(localStorage.getItem('yz_type') || '');
    // التصميم الديناميكي
    fetch(`${API}/api/v1/theme`).then(r => r.json()).then(t => {
      const p = t?.platform || {};
      setPlatform(p);
      const c = t?.colors || {};
      if (c.primary) document.documentElement.style.setProperty('--primary', c.primary);
      if (c.secondary) document.documentElement.style.setProperty('--secondary', c.secondary);
      if (c.accent) document.documentElement.style.setProperty('--accent', c.accent);
      // ✍️ الخط و🔲 الانحناء — من تبويب «الخطوط والأشكال» في إدارة التصميم
      const f = t?.fonts || {};
      if (f.family) {
        document.documentElement.style.setProperty('--font', f.family);
        // تحميل الخط من جوجل إن لم يكن محمّلاً
        if (!document.getElementById('yz-dynamic-font')) {
          const link = document.createElement('link');
          link.id = 'yz-dynamic-font'; link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@400;600;700;800;900&display=swap`;
          document.head.appendChild(link);
        }
      }
      const l = t?.layout || {};
      if (l.radius) document.documentElement.style.setProperty('--radius', l.radius);
      // 📱 أُكمل تطبيق ثيم المنصة — يعيد NativeApp فرض لون التطبيق الخاص إن ضبطه المدير
      window.dispatchEvent(new Event('yz-theme-applied'));
    }).catch(() => {});
    fetch(`${API}/api/v1/platform/pages/menu`).then(r => r.json())
      .then(d => setMenuPages(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // إغلاق القائمة عند التنقل لأي صفحة
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => { openRef.current = open; }, [open]);

  // ↩️ زر رجوع الجوال يغلق القائمة أولاً (يربطه NativeApp داخل التطبيق)
  useEffect(() => {
    (window as any).__yzCloseOverlays = () => {
      if (openRef.current) { setOpen(false); return true; }
      return false;
    };
    return () => { delete (window as any).__yzCloseOverlays; };
  }, []);

  const dashLink = type === 'seller' ? '/seller' : type === 'admin' ? '/admin' : '/customer';

  // صفحات المتاجر ولوحتا المنصة والبائع لها أشرطتها الخاصة — لا نظهر شريط المنصة فوقها
  // الصفحات المستقلة المشارَكة (/q بع برابط، /biz صفحة محل، /bio روابطي) تُعرض بلا أي أشرطة
  if (path.startsWith('/store/') || path.startsWith('/admin') || path.startsWith('/seller')
    || path.startsWith('/q/') || path.startsWith('/u/') || path.startsWith('/biz/') || path.startsWith('/bio/')) return null;

  // 📱 قائمة الجوال — كل روابط المنصة (الفوتر كاملاً) منظمة بأقسام وأيقونات
  const menuSections: { title: string; links: { href: string; icon: string; label: string }[] }[] = [
    {
      title: '',
      links: [
        { href: '/', icon: '🏠', label: t('home') },
        { href: '/explore', icon: '🧭', label: t('explore') },
        { href: '/stores', icon: '🗂️', label: t('storesGuide') },
        { href: '/offers', icon: '🔥', label: 'عروض اليوم' },
        { href: '/nearby', icon: '📍', label: t('nearby') },
        { href: '/services', icon: '🛠️', label: t('ourServices') },
        { href: '/tools', icon: '🧰', label: 'تكنولوجيا المنصة' },
        { href: '/blog', icon: '📝', label: t('blog') },
        { href: '/about', icon: 'ℹ️', label: 'من نحن' },
      ],
    },
    {
      title: 'للتجار',
      links: [
        { href: '/start', icon: '🚀', label: 'كيف تبدأ متجرك' },
        { href: '/auth/login', icon: '🔑', label: 'دخول البائعين' },
        { href: '/seller/invite', icon: '🤝', label: 'ادعُ التجار واكسب' },
      ],
    },
    {
      title: 'خدمات مجانية',
      links: [
        { href: '/tools/price-hunt', icon: '⚖️', label: 'قارن الأسعار قبل الشراء' },
        { href: '/tools/requests', icon: '📢', label: 'اطلبها ونوفرها' },
        { href: '/tools/quick-sell', icon: '🔗', label: 'بع برابط واحد' },
        { href: '/tools/used-market', icon: '♻️', label: 'سوق المستعمل' },
        { href: '/directory', icon: '📖', label: 'دليل الأعمال اليمني' },
      ],
    },
    {
      title: 'الدعم والقانون',
      links: [
        { href: '/help', icon: '❓', label: 'مركز المساعدة' },
        { href: '/faq', icon: '💬', label: 'الأسئلة الشائعة' },
        { href: '/complaint', icon: '📮', label: 'قدّم شكوى' },
        { href: '/track', icon: '📦', label: t('trackOrder') },
        { href: '/returns', icon: '↩️', label: 'شروط الاسترجاع' },
        { href: '/privacy', icon: '🔒', label: 'سياسة الخصوصية' },
        { href: '/terms', icon: '📜', label: 'سياسة الاستخدام' },
      ],
    },
  ];

  return (
    <>
      {platform.announcementActive && platform.announcement && (
        <div className="yz-announce fixed top-0 inset-x-0 z-[60] text-center text-xs font-bold text-white py-1.5 px-3"
          style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary, var(--primary)))' }}>
          📢 {platform.announcement}
        </div>
      )}
      <header className="yz-topbar fixed inset-x-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-sm"
        style={{ top: platform.announcementActive && platform.announcement ? 'calc(28px + var(--sa-top, 0px))' : 0 }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-3 h-14">
          {/* ☰ زر القائمة — جوال فقط */}
          <button onClick={() => setOpen(true)} aria-label="القائمة"
            className="md:hidden text-2xl leading-none px-1 active:scale-90 transition-transform"
            style={{ color: 'var(--primary)' }}>☰</button>

          <Link href="/" className="flex items-center gap-2 font-extrabold text-lg" style={{ color: 'var(--primary)' }}>
            <img src={platform.logoUrl || '/logo.png'} alt={platform.name || 'يمن زون'} className="w-9 h-9 object-contain drop-shadow-sm" />
            <span>{platform.name || 'يمن زون'}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-gray-700">
            <Link href="/stores" className="hover:text-purple-600">{t('storesGuide')}</Link>
            <Link href="/track" className="hover:text-purple-600">{t('trackOrder')}</Link>
            <Link href="/nearby" className="hover:text-purple-600">{t('nearby')}</Link>
            <Link href="/services" className="hover:text-purple-600">{t('ourServices')}</Link>
            <Link href="/tools" className="relative font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-purple-600 to-amber-500 hover:opacity-80">🧰 تكنولوجيا المنصة</Link>
            <Link href="/blog" className="hover:text-purple-600">{t('blog')}</Link>
            {menuPages.map(p => (
              <Link key={p.slug} href={'/p/' + p.slug} className="hover:text-purple-600">{p.title}</Link>
            ))}
          </nav>

          {/* 🔎 بحث سريع — ينتقل لصفحة البحث الموحد */}
          <form action="/search" className="hidden sm:block">
            <input name="q" placeholder={t('search')}
              className="w-28 focus:w-44 transition-all text-xs px-3 py-2 rounded-full border border-gray-200 outline-none focus:border-purple-400 bg-white/70" />
          </form>

          <div className="flex items-center gap-2">
            {/* 💱 مبدّل عملة العرض */}
            <span className="yz-currency"><CurrencySwitcher /></span>
            {user ? (
              <>
                <Link href={dashLink} className="text-sm font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full">
                  👤 {user.name}
                </Link>
                <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500">{t('logout')}</button>
              </>
            ) : (
              <>
                <Link href="/auth/customer-login" className="text-sm font-bold text-gray-600">{t('login')}</Link>
                <Link
                  href="/auth/seller-register"
                  className="yz-cta text-sm font-bold text-white px-4 py-1.5 rounded-full shadow"
                  style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}
                >
                  {t('createStore')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 📱 القائمة الجانبية للجوال — كل أقسام المنصة بتصميم أنيق */}
      {open && (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-label="قائمة المنصة">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm anim-fade" onClick={() => setOpen(false)} />
          <aside className="yz-drawer absolute top-0 bottom-0 right-0 w-[80%] max-w-80 bg-white shadow-2xl flex flex-col anim-slide-in rounded-l-3xl overflow-hidden"
            style={{ paddingTop: 'var(--sa-top, 0px)' }}>
            {/* رأس القائمة */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 font-extrabold text-lg" style={{ color: 'var(--primary)' }}>
                <img src={platform.logoUrl || '/logo.png'} alt="" className="w-9 h-9 object-contain" />
                <span>{platform.name || 'يمن زون'}</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="إغلاق"
                className="w-9 h-9 grid place-items-center rounded-full bg-gray-100 text-gray-500 text-lg active:scale-90 transition-transform">✕</button>
            </div>

            {/* بطاقة المستخدم / الدخول */}
            <div className="px-4 py-4">
              {user ? (
                <div className="rounded-2xl p-4 text-white shadow-lg" style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}>
                  <div className="font-extrabold mb-1">👤 {user.name}</div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <Link href={dashLink} className="bg-white/20 px-3 py-1.5 rounded-full">{t('myAccount')}</Link>
                    <button onClick={logout} className="text-white/70">{t('logout')}</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/auth/customer-login"
                    className="text-center text-sm font-extrabold py-3 rounded-2xl border-2"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>{t('login')}</Link>
                  <Link href="/auth/seller-register"
                    className="text-center text-sm font-extrabold py-3 rounded-2xl text-white shadow"
                    style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}>{t('createStore')}</Link>
                </div>
              )}
            </div>

            {/* روابط الأقسام — كل روابط الفوتر منظمة */}
            <nav className="flex-1 overflow-y-auto px-3 pb-6">
              {menuSections.map(sec => (
                <div key={sec.title || 'main'}>
                  {sec.title && (
                    <div className="text-[11px] font-extrabold text-gray-400 px-3 pt-4 pb-1">{sec.title}</div>
                  )}
                  {sec.links.map(l => {
                    const active = path === l.href;
                    return (
                      <Link key={l.href} href={l.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1 transition-colors ${active ? 'bg-purple-50' : 'active:bg-gray-50'}`}>
                        <span className={"yz-menu-ic w-9 h-9 grid place-items-center rounded-xl text-base shrink-0" + (active ? " active" : "")}>{l.icon}</span>
                        <span className={`text-[13px] font-bold ${active ? 'text-purple-700' : 'text-gray-700'}`}>{l.label}</span>
                        <span className="ms-auto text-gray-300">‹</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
              {menuPages.length > 0 && (
                <>
                  <div className="text-[11px] font-extrabold text-gray-400 px-3 pt-4 pb-1">صفحات المنصة</div>
                  {menuPages.map(p => (
                    <Link key={p.slug} href={'/p/' + p.slug}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1 active:bg-gray-50">
                      <span className="yz-menu-ic w-9 h-9 grid place-items-center rounded-xl text-base shrink-0">📄</span>
                      <span className="text-[13px] font-bold text-gray-700">{p.title}</span>
                      <span className="ms-auto text-gray-300">‹</span>
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
