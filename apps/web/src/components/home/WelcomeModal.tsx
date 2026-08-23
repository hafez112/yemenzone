'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// 👋 رسالة ترحيبية — تظهر مرة واحدة لكل جلسة عند أول زيارة للرئيسية
export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('yz_welcomed')) return;
      const t = setTimeout(() => setOpen(true), 1200); // بعد تحميل الصفحة بقليل — لا يفاجئ الزائر
      return () => clearTimeout(t);
    } catch { /* private mode */ }
  }, []);

  const close = () => {
    setLeaving(true);
    try { sessionStorage.setItem('yz_welcomed', '1'); } catch { /* ignore */ }
    setTimeout(() => setOpen(false), 350);
  };

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4 transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      role="dialog" aria-modal="true" aria-label="رسالة ترحيبية">
      <button aria-label="إغلاق الترحيب" onClick={close} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
      <div className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${leaving ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100 animate-[welcome-pop_.5s_ease-out]'}`}>
        {/* رأس متدرّج */}
        <div className="bg-gradient-to-l from-emerald-600 via-teal-600 to-cyan-600 px-6 pt-7 pb-9 text-center text-white relative">
          <button onClick={close} aria-label="إغلاق"
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 text-white text-lg font-bold grid place-items-center transition">×</button>
          <div className="text-5xl mb-2 drop-shadow">🎉</div>
          <h2 className="text-2xl font-black leading-snug">أهلاً وسهلاً بك في يمن زون</h2>
          <p className="text-emerald-50 text-sm mt-1 font-bold">منصة اليمن الأولى للتجارة الإلكترونية — انطلقنا رسمياً!</p>
        </div>
        {/* جسم الرسالة */}
        <div className="bg-white px-6 pt-6 pb-6 -mt-4 rounded-t-3xl relative">
          <p className="text-gray-700 text-sm leading-7 font-semibold text-center">
            تسوّق من متاجر ومطاعم وفنادق وخدمات كل اليمن
            <br />وادفع ببطاقتك بأي عملة — التحويل يتم تلقائياً بأسعار الصرف المعتمدة.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-extrabold text-gray-600">
            <div className="bg-emerald-50 rounded-2xl py-3">🛍️<br />تسوّق واطلب</div>
            <div className="bg-amber-50 rounded-2xl py-3">♻️<br />سوق المستعمل</div>
            <div className="bg-violet-50 rounded-2xl py-3">🔗<br />بِع برابط</div>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/explore" onClick={close}
              className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-emerald-600/30">
              🛒 ابدأ التسوّق الآن
            </Link>
            <Link href="/auth/seller-register" onClick={close}
              className="w-full text-center bg-white border-2 border-emerald-600 text-emerald-700 font-black py-3 rounded-2xl hover:bg-emerald-50 transition">
              🏪 افتح نشاطك التجاري مجاناً
            </Link>
          </div>
          <p className="mt-3 text-center text-[11px] text-gray-400 font-bold">🎁 عرض الافتتاح: الباقة الكاملة للتجار بـ 100 ر.س فقط — لفترة محدودة</p>
        </div>
      </div>
      <style jsx global>{`
        @keyframes welcome-pop { from { transform: scale(.92) translateY(14px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .animate-\\[welcome-pop_.5s_ease-out\\] { animation: none !important; } }
      `}</style>
    </div>
  );
}
