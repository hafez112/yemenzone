'use client';
import { useEffect, useRef, useState } from 'react';
import { selectCurrency, useCurrency } from '@/lib/currency';

// 💱 مبدّل العملة في الشريط العلوي — العرض يتحول فوراً في صفحات الشراء
export default function CurrencySwitcher() {
  const { list, cur } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (!list.length || list.length < 2 || !cur) return null; // عملة واحدة = لا حاجة للمبدّل

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="text-xs font-extrabold text-gray-500 hover:text-purple-600 px-2 py-1.5 rounded-full bg-gray-100 flex items-center gap-1"
        title="عملة العرض">
        💱 {cur.code}
      </button>
      {open && (
        <div className="absolute top-9 left-0 z-[70] bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 min-w-[130px] anim-fade-up">
          {list.map((c) => (
            <button key={c.code}
              onClick={() => { selectCurrency(c.code); setOpen(false); }}
              className={`w-full text-right px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-between gap-2 ${
                c.code === cur.code ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={c.code === cur.code ? { background: 'var(--primary)' } : {}}>
              <span>{c.name}</span>
              <span className="opacity-80">{c.symbol}</span>
            </button>
          ))}
          <p className="text-[9px] font-bold text-gray-400 px-3 py-1.5 border-t border-gray-100 mt-1">
            الأسعار تُحوَّل بأسعار الصرف التي تحددها إدارة المنصة
          </p>
        </div>
      )}
    </div>
  );
}
