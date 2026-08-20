'use client';
import { useEffect, useState } from 'react';

// 📲 تسجيل Service Worker + زر "ثبّت التطبيق" عندما يتيحه المتصفح
export default function PwaInstaller() {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // تسجيل عامل الخدمة
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // اكتشاف وضع التطبيق المثبت
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);

    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  return (
    <button
      onClick={async () => {
        deferred.prompt();
        await deferred.userChoice.catch(() => null);
        setDeferred(null);
      }}
      className="fixed bottom-24 right-3 z-[71] flex items-center gap-2 text-white text-xs font-extrabold px-4 py-3 rounded-full shadow-xl anim-pulse-glow"
      style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}
      aria-label="تثبيت التطبيق">
      📲 ثبّت التطبيق
    </button>
  );
}
