'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// 🎗️ شريط عرض الافتتاح — شارة + عداد تنازلي حي حتى نهاية العرض
// يقرأ أقرب عرض نشط من باقات المنصة (offerEndsAt) — تُدار من /admin/plans
export default function LaunchRibbon() {
  const [offer, setOffer] = useState<{ badge: string; endsAt: number } | null>(null);
  const [left, setLeft] = useState('');

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${API}/api/v1/plans`).then((r) => r.json()).then((d) => {
      const plans = Array.isArray(d) ? d : d?.plans || [];
      const now = Date.now();
      const offers = plans
        .filter((p: any) => p.offerEndsAt && +new Date(p.offerEndsAt) > now)
        .sort((a: any, b: any) => +new Date(a.offerEndsAt) - +new Date(b.offerEndsAt));
      if (offers[0]) {
        setOffer({
          badge: offers[0].offerBadge || '🎉 عرض الافتتاح',
          endsAt: +new Date(offers[0].offerEndsAt),
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!offer) return;
    const tick = () => {
      const ms = offer.endsAt - Date.now();
      if (ms <= 0) { setLeft('انتهى العرض'); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setLeft(d > 0 ? `${d} يوم و${h} ساعة` : h > 0 ? `${h} ساعة و${m} دقيقة` : `${m} دقيقة`);
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [offer]);

  if (!offer) return null;

  return (
    <div className="max-w-6xl mx-auto px-3 pt-3">
      <Link href="/start"
        className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap rounded-2xl px-4 py-2.5 text-center font-extrabold text-xs sm:text-sm text-amber-950 shadow-lg anim-bounce-in"
        style={{ background: 'linear-gradient(90deg, #fde68a, #fbbf24, #f59e0b)' }}>
        <span className="anim-soft-pulse">{offer.badge}</span>
        <span className="hidden sm:inline opacity-70">•</span>
        <span>الباقة الكاملة بـ 100 ر.س بدل 250</span>
        <span className="bg-black/15 rounded-full px-3 py-1 text-[11px] sm:text-xs" dir="rtl">
          ⏳ متبقٍ: {left}
        </span>
      </Link>
    </div>
  );
}
