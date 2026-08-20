'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCart } from '@/lib/cart';
import CurrencySwitcher from '@/components/CurrencySwitcher';
import { KIND_INFO, type StoreKind } from '@/lib/activity';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🛠️ الشريط العلوي الخاص بمتجر البائع — يتكيّف مع نوع النشاط:
// منتجات → سلة تسوق • إيجارات/فنادق → زر حجز • خدمات → زر طلب خدمة
export default function StoreTopBar({ store, primary }: { store: any; primary: string }) {
  const [cartCount, setCartCount] = useState(0);
  const [installEvt, setInstallEvt] = useState<any>(null);
  const pwaEnabled = !!store.features?.pwa; // 📱 ميزة الخطة الذهبية
  const kind: StoreKind = (store.type?.kind as StoreKind) || 'products';
  const kindInfo = KIND_INFO[kind] || KIND_INFO.products;
  const isProducts = kind === 'products' || kind === 'restaurants'; // 🍽️ للمطعم سلة طلبات أيضاً
  const isMall = kind === 'malls'; // 🏬 سلة المول صفحة منفصلة

  useEffect(() => {
    const sync = () => setCartCount((getCart(store.slug) || []).reduce((s: number, i: any) => s + i.qty, 0));
    sync();
    window.addEventListener('yz-cart', sync);
    // 📱 التقاط حدث تثبيت PWA — فقط للمتاجر صاحبة الميزة الذهبية
    const onInstall = (e: any) => {
      if (!pwaEnabled) return;
      e.preventDefault(); setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => {
      window.removeEventListener('yz-cart', sync);
      window.removeEventListener('beforeinstallprompt', onInstall);
    };
  }, [store.slug, pwaEnabled]);

  const share = async () => {
    const url = window.location.href;
    const data = { title: store.name, text: `${kindInfo.cta} — ${store.name} ✨`, url };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(url); }
    } catch {}
  };

  return (
    <div className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center gap-2 px-3 h-14">
        {/* هوية المتجر */}
        <Link href={`/store/${store.slug}`} className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border border-gray-100 bg-white overflow-hidden">
            {store.logo
              ? <img src={`${API}${store.logo}`} alt="" className="w-full h-full object-cover" />
              : (store.type?.icon || '🏪')}
          </div>
          <div className="min-w-0">
            <div className="font-black text-sm truncate flex items-center gap-1" style={{ color: primary }}>
              {store.name} {store.isVerified && <span className="verified-badge" style={{ width: '0.85rem', height: '0.85rem', fontSize: '0.5rem' }}>✓</span>}
            </div>
            <div className="text-[10px] text-gray-400 truncate">{kindInfo.icon} {kindInfo.label} · {store.governorate || 'اليمن'} · ⭐ {store.ratingAvg?.toFixed(1) || 'جديد'}</div>
          </div>
        </Link>

        <div className="flex-1" />

        {/* 💱 مبدّل عملة العرض — تحويل حقيقي بأسعار صرف الإدارة */}
        <CurrencySwitcher />

        {/* تثبيت التطبيق — يظهر فقط عندما يتيحه المتصفح */}
        {installEvt && (
          <button onClick={() => { installEvt.prompt(); setInstallEvt(null); }}
            className="text-[11px] font-extrabold text-white px-3 py-1.5 rounded-full shadow anim-soft-pulse"
            style={{ background: primary }}>
            📱 ثبّت التطبيق
          </button>
        )}

        {/* مشاركة */}
        <button onClick={share} aria-label="مشاركة المتجر"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all hover:scale-110"
          style={{ background: `${primary}15`, color: primary }}>
          📤
        </button>

        {/* الإجراء الرئيسي حسب النشاط: سلة للمنتجات / صفحة سلة المول / حجز أو طلب لباقي الأنواع */}
        {isMall ? (
          <Link href={`/store/${store.slug}/cart`} aria-label="سلة التسوق"
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all hover:scale-110"
            style={{ background: `${primary}15` }}>
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center"
                style={{ background: primary }}>
                {cartCount}
              </span>
            )}
          </Link>
        ) : isProducts ? (
          <Link href={`/store/${store.slug}`} aria-label="السلة"
            onClick={() => window.dispatchEvent(new Event('yz-open-cart'))}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all hover:scale-110"
            style={{ background: `${primary}15` }}>
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center"
                style={{ background: primary }}>
                {cartCount}
              </span>
            )}
          </Link>
        ) : (
          <Link href={`/store/${store.slug}#booking`}
            className="theme-glow text-[11px] font-extrabold text-white px-3 py-2 rounded-full transition-all hover:scale-105 whitespace-nowrap"
            style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)`, '--tp': primary } as any}>
            {kind === 'hotel' ? '🛎️' : kind === 'rentals' ? '📅' : '🛠️'} {kindInfo.cta}
          </Link>
        )}
      </div>
    </div>
  );
}
