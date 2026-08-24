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
    <div className="fixed top-0 inset-x-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-5xl mx-auto px-2 sm:px-3">
        <div className="mt-2 sm:mt-0 rounded-3xl sm:rounded-none border border-white/60 sm:border-0 sm:border-b sm:border-gray-100 bg-white/88 backdrop-blur-xl shadow-lg sm:shadow-sm">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 h-14">
            {/* هوية المتجر */}
            <Link href={`/store/${store.slug}`} className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 border border-gray-100 bg-white overflow-hidden shadow-sm">
                {store.logo
                  ? <img src={`${API}${store.logo}`} alt="" className="w-full h-full object-cover" />
                  : (store.type?.icon || '🏪')}
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm truncate flex items-center gap-1" style={{ color: primary }}>
                  <span className="truncate">{store.name}</span> {store.isVerified && <span className="verified-badge" style={{ width: '0.85rem', height: '0.85rem', fontSize: '0.5rem' }}>✓</span>}
                </div>
                <div className="text-[10px] text-gray-400 truncate">{kindInfo.icon} {kindInfo.label} · {store.governorate || 'اليمن'} · ⭐ {store.ratingAvg?.toFixed(1) || 'جديد'}</div>
              </div>
            </Link>

            {/* 💱 مبدّل العملة — على الشاشات الأوسع حتى لا يزحم شريط الجوال */}
            <div className="hidden sm:block"><CurrencySwitcher /></div>

            {/* تثبيت التطبيق — يظهر فقط عندما يتيحه المتصفح */}
            {installEvt && (
              <button onClick={() => { installEvt.prompt(); setInstallEvt(null); }}
                className="text-[11px] font-extrabold text-white px-3 py-1.5 rounded-full shadow anim-soft-pulse shrink-0"
                style={{ background: primary }}>
                📱 ثبّت
              </button>
            )}

            {/* مشاركة */}
            <button onClick={share} aria-label="مشاركة المتجر"
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-base transition-all active:scale-95 shrink-0"
              style={{ background: `${primary}12`, color: primary }}>
              📤
            </button>

            {/* الإجراء الرئيسي حسب النشاط */}
            {isMall ? (
              <Link href={`/store/${store.slug}/cart`} aria-label="سلة التسوق"
                className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-base transition-all active:scale-95 shrink-0"
                style={{ background: `${primary}12` }}>
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
                className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-base transition-all active:scale-95 shrink-0"
                style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)`, color: '#fff' }}>
                🛒
                {cartCount > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            ) : (
              <Link href={`/store/${store.slug}#booking`}
                className="theme-glow text-[11px] font-extrabold text-white px-3 py-2 rounded-full transition-all active:scale-95 whitespace-nowrap shrink-0"
                style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)`, '--tp': primary } as any}>
                {kind === 'hotel' ? '🛎️' : kind === 'rentals' ? '📅' : '🛠️'} {kindInfo.cta}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
