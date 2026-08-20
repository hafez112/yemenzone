'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, logout } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🛠️ الشريط العلوي الخاص بلوحة البائع — هوية المتجر + تنبيهات + تثبيت التطبيق + معاينة
export default function SellerTopBar() {
  const [store, setStore] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [installEvt, setInstallEvt] = useState<any>(null);

  useEffect(() => {
    let live = true;
    api('/stores/my').then(s => { if (live) setStore(s); }).catch(() => {});
    // 📱 زر التثبيت يظهر فقط بعد اعتماد الإدارة لطلب التطبيق
    api('/pwa/my').then(r => {
      if (!live || !r.approved) return;
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (link && !link.href.includes('/pwa-manifest/')) link.href = '/pwa-manifest/seller';
      const onInstall = (e: any) => { e.preventDefault(); setInstallEvt(e); };
      window.addEventListener('beforeinstallprompt', onInstall);
    }).catch(() => {});
    const fetchCount = () => api('/seller/notifications/unread-count')
      .then(r => { if (live) setUnread(r.count || 0); }).catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const primary = (store?.themeJson as any)?.primary || 'var(--primary)';

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 bg-white/85 backdrop-blur-xl border-b border-gray-200/70 shadow-sm">
      <div className="max-w-6xl mx-auto h-full px-3 flex items-center gap-2">
        {/* هوية المتجر */}
        <Link href="/seller" className="flex items-center gap-2 min-w-0">
          {store?.logo ? (
            <img src={`${API}${store.logo}`} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0 shadow" />
          ) : (
            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm text-white shrink-0 shadow"
              style={{ background: `linear-gradient(135deg, ${primary}, var(--secondary, #00E5C7))` }}>
              {store?.type?.icon || '🏪'}
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-sm font-black text-gray-900 leading-tight truncate">
              {store?.name || 'لوحة البائع'} {store?.isVerified && '✅'}
            </span>
            <span className="block text-[9px] text-gray-400 font-bold truncate">
              {store?.subscription?.plan?.name ? `💎 ${store.subscription.plan.name}` : 'لوحة تحكم متجرك'}
            </span>
          </span>
        </Link>

        <div className="flex-1" />

        {/* 📱 تثبيت التطبيق — بعد اعتماد الإدارة فقط */}
        {installEvt && (
          <button onClick={async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); }}
            className="text-[10px] font-extrabold text-white px-3 py-1.5 rounded-full anim-soft-pulse shrink-0"
            style={{ background: 'linear-gradient(135deg, #059669, #0D9488)' }}>
            📲 ثبّت لوحتك
          </button>
        )}

        {/* 🔔 التنبيهات */}
        <Link href="/seller/notifications" aria-label="التنبيهات"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-base bg-gray-100 hover:bg-gray-200 transition-all shrink-0">
          🔔
          {unread > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center anim-pulse-glow">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        {/* 👁️ معاينة المتجر */}
        {store?.slug && (
          <a href={`/store/${store.slug}`} target="_blank" aria-label="معاينة متجري"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-teal-50 text-teal-600 hover:bg-teal-100 transition-all shrink-0">
            👁️
          </a>
        )}

        {/* خروج */}
        <button onClick={() => logout()} aria-label="تسجيل الخروج"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-red-50 text-red-500 hover:bg-red-100 transition-all shrink-0">
          ⏻
        </button>
      </div>
    </header>
  );
}
