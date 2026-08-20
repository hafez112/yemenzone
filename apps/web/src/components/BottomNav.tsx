'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';

// شريط الأدوات السفلي للجوال — 5 أيقونات ثابتة
export default function BottomNav() {
  const path = usePathname();
  const [type, setType] = useState('');
  const [, force] = useState(0);
  useEffect(() => {
    setType(localStorage.getItem('yz_type') || '');
    // 🌐 إعادة الرسم عند تبديل اللغة
    const onLang = () => force((n) => n + 1);
    window.addEventListener('yz-lang', onLang);
    return () => window.removeEventListener('yz-lang', onLang);
  }, []);

  const dashLink = type === 'seller' ? '/seller' : type === 'admin' ? '/admin' : '/customer';

  // صفحات المتاجر ولوحتا المنصة والبائع لها أشرطتها الخاصة — لا نظهر شريط المنصة فوقها
  if (path.startsWith('/store/') || path.startsWith('/admin') || path.startsWith('/seller')
    || path.startsWith('/q/') || path.startsWith('/u/') || path.startsWith('/biz/') || path.startsWith('/bio/')) return null;
  const items = [
    { href: '/', icon: '🏠', label: t('home') },
    { href: '/explore', icon: '🧭', label: t('explore') },
    { href: '/stores', icon: '🗂️', label: t('stores') },
    { href: '/services', icon: '🛠️', label: t('services') },
    { href: dashLink, icon: '👤', label: t('myAccount') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 backdrop-blur-xl bg-white/85 border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-5 h-16">
        {items.map(it => {
          const active = path === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-all ${
                active ? 'text-purple-700 scale-110' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
