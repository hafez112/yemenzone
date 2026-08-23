'use client';
import { useEffect, useState } from 'react';
import { imgUrl } from '@/lib/api';

// 📱 بانر «حمّل تطبيق المتجر» — يظهر للزائر بذكاء عندما تكون الخدمة مفعلة للمتجر
// يحوّل المتجر إلى تطبيق حقيقي باسمه وشعاره على جوال الزائر
export default function StorePwaInstall({ store }: { store: any }) {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (!store?.features?.pwa) return;
    const slug = store.slug;
    // لا نزعج من رفض سابقاً خلال 7 أيام
    const dismissed = Number(localStorage.getItem(`yz-pwa-dismiss-${slug}`) || 0);
    if (Date.now() - dismissed < 7 * 86400000) return;
    // مثبّت مسبقاً؟ لا نظهر البانر
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    if (isIos) {
      // iOS لا يدعم beforeinstallprompt — نظهر التعليمات بعد تفاعل بسيط
      const t = setTimeout(() => setShow(true), 8000);
      return () => clearTimeout(t);
    }
    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setTimeout(() => setShow(true), 4000); // ننتظر حتى يتصفح قليلاً
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [store?.slug, store?.features?.pwa]);

  if (!show || !store?.features?.pwa) return null;

  const dismiss = () => {
    localStorage.setItem(`yz-pwa-dismiss-${store.slug}`, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    if (ios) return; // iOS: التعليمات ظاهرة في البانر نفسه
    if (!deferred) return;
    deferred.prompt();
    const r = await deferred.userChoice.catch(() => null);
    if (r?.outcome === 'accepted') setShow(false);
  };

  const primary = store.themeJson?.primary || '#6C3DF5';

  return (
    <div className="fixed bottom-24 inset-x-3 z-40 max-w-md mx-auto anim-bounce-in" role="dialog" aria-label="تحميل تطبيق المتجر">
      <div className="rounded-3xl p-4 shadow-2xl text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary}, #0f172a)` }}>
        <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/10" />
        <button onClick={dismiss} aria-label="إغلاق"
          className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/15 text-white/80 text-xs font-black">✕</button>

        <div className="flex items-center gap-3 relative">
          {store.logo ? (
            <img src={imgUrl(store.logo)} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 shadow" />
          ) : (
            <span className="w-14 h-14 rounded-2xl bg-white/20 grid place-items-center text-2xl font-black">{store.name?.[0]}</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm">📱 حمّل تطبيق {store.name}</div>
            <p className="text-[11px] opacity-85 mt-0.5 leading-snug">
              تسوّق أسرع من شاشتك الرئيسية — بلا متصفح، بإشعارات العروض
            </p>
          </div>
        </div>

        {ios ? (
          <p className="relative mt-3 text-[11px] font-bold bg-white/10 rounded-2xl px-3 py-2.5 leading-relaxed">
            من سفاري: اضغط زر المشاركة <span className="text-base">⎋</span> ثم «إضافة إلى الشاشة الرئيسية» ➕
          </p>
        ) : (
          <button onClick={install}
            className="relative mt-3 w-full py-3 rounded-2xl bg-white text-sm font-black shadow-lg active:scale-95 transition-transform"
            style={{ color: primary }}>
            ⬇️ تثبيت التطبيق مجاناً
          </button>
        )}
      </div>
    </div>
  );
}
