'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser, logout } from '@/lib/api';
import { applyDir, t } from '@/lib/i18n';
import CurrencySwitcher from './CurrencySwitcher';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// الشريط العلوي الموحد — يقرأ التصميم الديناميكي (الجلسة 18): اللون + الإعلان + صفحات القائمة
export default function TopBar() {
  const path = usePathname();
  const [user, setUser] = useState<any>(null);
  const [type, setType] = useState<string>('');
  const [platform, setPlatform] = useState<any>({});
  const [menuPages, setMenuPages] = useState<{ slug: string; title: string }[]>([]);

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
    }).catch(() => {});
    fetch(`${API}/api/v1/platform/pages/menu`).then(r => r.json())
      .then(d => setMenuPages(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const dashLink = type === 'seller' ? '/seller' : type === 'admin' ? '/admin' : '/customer';

  // صفحات المتاجر ولوحتا المنصة والبائع لها أشرطتها الخاصة — لا نظهر شريط المنصة فوقها
  // الصفحات المستقلة المشارَكة (/q بع برابط، /biz صفحة محل، /bio روابطي) تُعرض بلا أي أشرطة
  if (path.startsWith('/store/') || path.startsWith('/admin') || path.startsWith('/seller')
    || path.startsWith('/q/') || path.startsWith('/u/') || path.startsWith('/biz/') || path.startsWith('/bio/')) return null;

  return (
    <>
      {platform.announcementActive && platform.announcement && (
        <div className="fixed top-0 inset-x-0 z-[60] text-center text-xs font-bold text-white py-1.5 px-3"
          style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary, var(--primary)))' }}>
          📢 {platform.announcement}
        </div>
      )}
      <header className="fixed inset-x-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-sm"
        style={{ top: platform.announcementActive && platform.announcement ? 28 : 0 }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-3 h-14">
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
            <CurrencySwitcher />
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
                  className="text-sm font-bold text-white px-4 py-1.5 rounded-full shadow"
                  style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}
                >
                  {t('createStore')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
