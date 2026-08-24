'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCart } from '@/lib/cart';
import { KIND_INFO, type StoreKind } from '@/lib/activity';

// 🧭 الشريط السفلي الثابت الخاص بمتجر البائع — عناصره تتكيّف مع نوع النشاط:
// منتجات: منتجات/تتبع/سلة • إيجارات وفنادق: وحدات/غرف + حجز • خدمات: خدمات + طلب
export default function StoreBottomNav({ store, primary }: { store: any; primary: string }) {
  const [cartCount, setCartCount] = useState(0);
  const kind: StoreKind = (store.type?.kind as StoreKind) || 'products';
  const kindInfo = KIND_INFO[kind] || KIND_INFO.products;
  const pathname = usePathname();

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

  const isActive = (href: string) => !href.startsWith('http') && pathname === href;

  return (
    <nav className="fixed bottom-3 inset-x-3 z-50 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto rounded-[1.6rem] border border-white/70 bg-white/92 backdrop-blur-xl shadow-[0_18px_45px_-20px_rgba(20,10,50,.45)] px-2 py-1.5">
        <div className="flex justify-around items-center gap-1">
          {items.map((it: any) => {
            const active = isActive(it.href);
            return (
              <Link key={it.label} href={it.href} target={it.external ? '_blank' : undefined}
                className="flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-2xl transition-all active:scale-95"
                style={active ? { background: `${primary}12` } : undefined}>
                {it.accent ? (
                  <span className="theme-glow w-9 h-9 rounded-2xl flex items-center justify-center text-lg text-white"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)`, '--tp': primary } as any}>{it.icon}</span>
                ) : (
                  <span className="w-8 h-8 rounded-xl grid place-items-center text-lg"
                    style={active ? { background: `${primary}16` } : undefined}>{it.icon}</span>
                )}
                <span className="text-[10px] font-extrabold leading-none" style={{ color: active ? primary : '#64748b' }}>{it.label}</span>
              </Link>
            );
          })}

          {/* السلة — متاجر المنتجات والمطاعم والمولات */}
          {kind === 'malls' && (
            <Link href={`/store/${store.slug}/cart`}
              className="relative flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-2xl transition-all active:scale-95"
              style={isActive(`/store/${store.slug}/cart`) ? { background: `${primary}12` } : undefined}>
              <span className="w-8 h-8 rounded-xl grid place-items-center text-lg">🛒</span>
              <span className="text-[10px] font-extrabold leading-none" style={{ color: isActive(`/store/${store.slug}/cart`) ? primary : '#64748b' }}>السلة</span>
              {cartCount > 0 && (
                <span className="absolute top-0 left-2 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center anim-soft-pulse"
                  style={{ background: primary }}>
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          {(kind === 'products' || kind === 'restaurants') && (
            <button onClick={() => window.dispatchEvent(new Event('yz-open-cart'))}
              className="relative flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-2xl transition-all active:scale-95">
              <span className="w-8 h-8 rounded-xl grid place-items-center text-lg" style={{ background: `${primary}12` }}>🛒</span>
              <span className="text-[10px] font-extrabold leading-none" style={{ color: primary }}>السلة</span>
              {cartCount > 0 && (
                <span className="absolute top-0 left-2 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center anim-soft-pulse"
                  style={{ background: primary }}>
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
