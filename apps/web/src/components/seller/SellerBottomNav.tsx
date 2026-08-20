'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// 🧭 الشريط السفلي الثابت الخاص بلوحة البائع — جوال فقط، يتكيف مع نوع المتجر
export default function SellerBottomNav() {
  const path = usePathname();
  const [unread, setUnread] = useState(0);
  const [kind, setKind] = useState('products');

  useEffect(() => {
    let live = true;
    api('/stores/my').then(s => { if (live) setKind(s?.type?.kind || 'products'); }).catch(() => {});
    const fetchCount = () => api('/seller/notifications/unread-count')
      .then(r => { if (live) setUnread(r.count || 0); }).catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => { live = false; clearInterval(t); };
  }, []);

  // الروابط تتكيف مع نوع المتجر: منتجات / إيجارات / فندق / خدمات / مطاعم
  const itemsLink = { products: '/seller/products', rentals: '/seller/rentals', hotel: '/seller/rooms', services: '/seller/services', restaurants: '/seller/products', malls: '/seller/products' }[kind as string] || '/seller/products';
  const itemsLabel = { products: 'منتجاتي', rentals: 'وحداتي', hotel: 'غرفي', services: 'خدماتي', restaurants: 'المنيو', malls: 'المنتجات' }[kind as string] || 'منتجاتي';
  const itemsIcon = { products: '📦', rentals: '🏠', hotel: '🛎️', services: '🛠️', restaurants: '🍽️', malls: '🏬' }[kind as string] || '📦';
  const ordersLink = kind === 'services' ? '/seller/services' : kind === 'rentals' ? '/seller/rentals' : kind === 'hotel' ? '/seller/rooms' : '/seller/orders';

  const items = [
    { href: '/seller', icon: '🏠', label: 'الرئيسية', exact: true },
    { href: itemsLink, icon: itemsIcon, label: itemsLabel },
    { href: ordersLink, icon: '🛒', label: 'الطلبات' },
    { href: '/seller/wallet', icon: '💰', label: 'المحفظة' },
  ];

  const active = (it: any) => it.exact ? path === it.href : path.startsWith(it.href);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/92 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-5 h-16">
        {items.map((it, i) => (
          <Link key={i} href={it.href}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-all relative ${
              active(it) ? 'scale-110' : 'text-gray-400'
            }`}
            style={active(it) ? { color: 'var(--primary)' } : {}}>
            <span className="text-xl">{it.icon}</span>
            {it.label}
            {active(it) && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full" style={{ background: 'var(--primary)' }} />
            )}
          </Link>
        ))}
        {/* ☰ فتح قائمة المتجر الكاملة */}
        <button onClick={() => window.dispatchEvent(new Event('yz-seller-menu'))}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-gray-400 relative">
          <span className="text-xl relative">
            ☰
            {unread > 0 && (
              <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[8px] font-extrabold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </span>
          القائمة
        </button>
      </div>
    </nav>
  );
}
