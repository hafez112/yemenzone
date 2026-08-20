'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// 🧭 الشريط السفلي الثابت الخاص بلوحة تحكم المنصة — جوال فقط
export default function AdminBottomNav() {
  const path = usePathname();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    let live = true;
    const fetchCount = () => api('/admin/alerts')
      .then(r => { if (live) setAlertCount(r.total || 0); })
      .catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const items = [
    { href: '/admin',          icon: '📊', label: 'الرئيسية', exact: true },
    { href: '/admin/stores',   icon: '🏪', label: 'المتاجر' },
    { href: '/admin/finance',  icon: '💹', label: 'المالية' },
    { href: '/admin/security', icon: '🛡️', label: 'الأمن' },
  ];

  const active = (it: any) => it.exact ? path === it.href : path.startsWith(it.href);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
      <div className="grid grid-cols-5 h-16">
        {items.map(it => (
          <Link key={it.href} href={it.href}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-all relative ${
              active(it) ? 'text-purple-300 scale-110' : 'text-gray-500'
            }`}>
            <span className="text-xl">{it.icon}</span>
            {it.label}
            {active(it) && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg, #6C3DF5, #22D3EE)' }} />
            )}
          </Link>
        ))}
        {/* ☰ فتح قائمة الإدارات الكاملة */}
        <button onClick={() => window.dispatchEvent(new Event('yz-admin-menu'))}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-gray-500 relative">
          <span className="text-xl relative">
            ☰
            {alertCount > 0 && (
              <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[8px] font-extrabold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </span>
          القائمة
        </button>
      </div>
    </nav>
  );
}
