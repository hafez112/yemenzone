'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCart } from '@/lib/cart';
import { KIND_INFO, type StoreKind } from '@/lib/activity';

// 🧭 الشريط السفلي الثابت الخاص بمتجر البائع — عناصره تتكيّف مع نوع النشاط:
// منتجات: منتجات/تتبع/سلة • إيجارات وفنادق: وحدات/غرف + حجز • خدمات: خدمات + طلب
export default function StoreBottomNav({ store, primary }: { store: any; primary: string }) {
  const [cartCount, setCartCount] = useState(0);
  const kind: StoreKind = (store.type?.kind as StoreKind) || 'products';
  const kindInfo = KIND_INFO[kind] || KIND_INFO.products;

  useEffect(() => {
    if (kind !== 'products' && kind !== 'restaurants' && kind !== 'malls') return; // السلة للمتاجر والمطاعم والمولات
    const sync = () => setCartCount((getCart(store.slug) || []).reduce((s: number, i: any) => s + i.qty, 0));
    sync();
    window.addEventListener('yz-cart', sync);
    return () => window.removeEventListener('yz-cart', sync);
  }, [store.slug, kind]);

  const wa = store.whatsapp
    ? [{ href: `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`, icon: '💬', label: 'تواصل', external: true }]
    : [];

  const items: any[] = kind === 'malls'
    ? [
        { href: `/store/${store.slug}`, icon: '🏠', label: 'الرئيسية' },
        { href: `/store/${store.slug}/categories`, icon: '🗂️', label: 'الأصناف' },
        { href: `/store/${store.slug}/mall/offers`, icon: '🏷️', label: 'العروض' },
        ...wa,
      ]
    : kind === 'products' || kind === 'restaurants'
    ? [
        { href: `/store/${store.slug}`, icon: '🏠', label: 'الرئيسية' },
        kind === 'restaurants'
          ? { href: `/store/${store.slug}/products`, icon: '🍽️', label: 'المنيو' }
          : { href: `/store/${store.slug}/products`, icon: '🛍️', label: 'المنتجات' },
        { href: `/track`, icon: '🔍', label: 'تتبع طلبك' },
        ...wa,
      ]
    : [
        { href: `/store/${store.slug}`, icon: '🏠', label: 'الرئيسية' },
        { href: `/store/${store.slug}#booking`, icon: kindInfo.icon, label: kindInfo.items },
        { href: `/store/${store.slug}#booking`, icon: '📅', label: kind === 'services' ? 'اطلب الآن' : 'احجز الآن', accent: true },
        ...wa,
      ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 backdrop-blur-xl bg-white/90 border-t border-gray-100 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {items.map((it: any) => (
          <Link key={it.label} href={it.href} target={it.external ? '_blank' : undefined}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-95 ${it.accent ? '-mt-5' : ''}`}>
            {it.accent ? (
              <span className="theme-glow w-12 h-12 rounded-2xl flex items-center justify-center text-xl text-white"
                style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)`, '--tp': primary } as any}>{it.icon}</span>
            ) : (
              <span className="text-xl">{it.icon}</span>
            )}
            <span className="text-[10px] font-extrabold" style={{ color: primary }}>{it.label}</span>
          </Link>
        ))}
        {/* السلة — متاجر المنتجات والمطاعم والمولات */}
        {kind === 'malls' && (
          <Link href={`/store/${store.slug}/cart`}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-95">
            <span className="text-xl">🛒</span>
            <span className="text-[10px] font-extrabold" style={{ color: primary }}>السلة</span>
            {cartCount > 0 && (
              <span className="absolute top-0 left-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center anim-soft-pulse"
                style={{ background: primary }}>
                {cartCount}
              </span>
            )}
          </Link>
        )}
        {(kind === 'products' || kind === 'restaurants') && (
          <button onClick={() => window.dispatchEvent(new Event('yz-open-cart'))}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-95">
            <span className="text-xl">🛒</span>
            <span className="text-[10px] font-extrabold" style={{ color: primary }}>السلة</span>
            {cartCount > 0 && (
              <span className="absolute top-0 left-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center anim-soft-pulse"
                style={{ background: primary }}>
                {cartCount}
              </span>
            )}
          </button>
        )}
      </div>
    </nav>
  );
}
