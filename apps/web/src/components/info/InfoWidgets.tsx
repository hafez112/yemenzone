'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// 📊 عدّاد إحصائي متحرك — أرقام حقيقية من قاعدة البيانات
export function CountUpStat({ to, label, icon, suffix = '' }: { to: number; label: string; icon: string; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1400, 1);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to]);
  return (
    <div className="text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-3xl md:text-4xl font-black grad-text">{v.toLocaleString()}{suffix}</div>
      <div className="text-xs text-gray-400 font-bold mt-1">{label}</div>
    </div>
  );
}

// 💬 شريط آراء حقيقية — تقييمات 4-5 نجوم فعلية من المنصة
export function TestimonialsMarquee({ items }: { items: any[] }) {
  if (!items.length) return null;
  const list = [...items, ...items];
  return (
    <div className="overflow-hidden py-2">
      <div className="marquee-track gap-3 px-2">
        {list.map((r: any, i: number) => (
          <div key={`${r.id}-${i}`} className="glass rounded-3xl p-4 w-72 shrink-0">
            <div className="text-amber-400 text-sm mb-2">{'★'.repeat(r.rating)}</div>
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-3">"{r.comment}"</p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-gray-700">
                {r.author} {r.verified && <span title="مشترٍ موثّق" className="text-emerald-500">✓</span>}
              </span>
              <Link href={`/store/${r.store.slug}`} className="font-bold hover:underline" style={{ color: 'var(--primary)' }}>
                {r.store.name} {r.store.isVerified && '✅'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ❓ أكورديون الأسئلة — متحرك وناعم
export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className={`glass rounded-2xl overflow-hidden transition-all ${isOpen ? 'shadow-lg' : ''}`}>
            <button onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 p-4 text-right">
              <span className="font-extrabold text-sm flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                  style={{ background: isOpen ? 'var(--primary)' : 'rgba(108,61,245,.12)', color: isOpen ? '#fff' : 'var(--primary)' }}>
                  {i + 1}
                </span>
                {f.q}
              </span>
              <span className="text-gray-400 transition-transform duration-300 shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>⌄</span>
            </button>
            <div className="collapse-wrap" style={!isOpen ? { gridTemplateRows: '0fr' } : {}}>
              <div className="collapse-inner">
                <p className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
