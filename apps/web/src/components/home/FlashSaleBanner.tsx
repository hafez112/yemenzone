'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// ⚡ بانر عرض الفلاش — عدّاد تنازلي حي يختفي عند انتهاء النافذة
export default function FlashSaleBanner({ flash }: { flash: any }) {
  const [left, setLeft] = useState<number>(0);

  useEffect(() => {
    if (!flash?.endsAt) return;
    const calc = () => Math.max(0, new Date(flash.endsAt).getTime() - Date.now());
    setLeft(calc());
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
  }, [flash?.endsAt]);

  if (!flash || left <= 0) return null;

  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section className="max-w-6xl mx-auto px-3 mt-4">
      <Link href={flash.link || '/offers'}
        className="block rounded-3xl p-4 text-white relative overflow-hidden shadow-2xl anim-pulse-glow"
        style={{ background: 'linear-gradient(135deg, #dc2626, #f59e0b, #dc2626)', backgroundSize: '200% 200%' }}>
        <div className="absolute -top-8 -left-8 w-28 h-28 anim-blob opacity-25 bg-white" />
        <div className="relative flex items-center gap-3 flex-wrap justify-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl anim-bobble">⚡</span>
            <div>
              <div className="font-black text-base md:text-lg leading-tight">{flash.title}</div>
              {flash.couponCode && (
                <div className="text-[11px] opacity-90">
                  استخدم كود <code className="bg-white/25 px-2 py-0.5 rounded-md font-black" dir="ltr">{flash.couponCode}</code> عند الدفع
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5" dir="ltr">
            {[
              { v: pad(h), l: 'ساعة' },
              { v: pad(m), l: 'دقيقة' },
              { v: pad(s), l: 'ثانية' },
            ].map((u, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="bg-black/30 backdrop-blur rounded-xl px-2.5 py-1.5 text-center min-w-[52px]">
                  <div className="text-xl font-black tabular-nums">{u.v}</div>
                  <div className="text-[8px] opacity-75 font-bold">{u.l}</div>
                </div>
                {i < 2 && <span className="font-black text-lg animate-pulse">:</span>}
              </div>
            ))}
          </div>
          <span className="bg-white text-red-600 font-extrabold text-xs px-4 py-2 rounded-full shrink-0 shadow-lg">
            اغتنم العرض ←
          </span>
        </div>
      </Link>
    </section>
  );
}
