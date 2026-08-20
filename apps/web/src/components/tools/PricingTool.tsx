'use client';
import { useMemo, useState } from 'react';
import { fmtN } from './pdfHelper';

// 🧮 حاسبة التسعير الذكي — من التكلفة إلى السعر المثالي
export default function PricingTool() {
  const [cost, setCost] = useState('');
  const [shipping, setShipping] = useState('');
  const [fees, setFees] = useState('0');
  const [margin, setMargin] = useState(30);

  const r = useMemo(() => {
    const c = (Number(cost) || 0) + (Number(shipping) || 0);
    const feePct = Number(fees) || 0;
    if (!c) return null;
    // السعر بحيث يبقى هامش الربح بعد خصم الرسوم
    const price = c / Math.max(1 - margin / 100 - feePct / 100, 0.05);
    const feeAmt = (price * feePct) / 100;
    const profit = price - c - feeAmt;
    const roi = (profit / c) * 100;
    return { c, price, feeAmt, profit, roi };
  }, [cost, shipping, fees, margin]);

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-3 px-3 text-sm font-bold outline-none focus:border-lime-400 placeholder:text-white/30 text-center';

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="grid grid-cols-2 gap-3 mb-5">
          <label className="text-xs font-bold text-white/60">💵 تكلفة الشراء<input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="0" /></label>
          <label className="text-xs font-bold text-white/60">🚚 شحن/مصاريف القطعة<input inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1`} placeholder="0" /></label>
        </div>
        <label className="text-xs font-bold text-white/60 block mb-1">💳 رسوم المنصة/الدفع % (إن وُجدت)</label>
        <input inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mb-5`} placeholder="0" />
        <div className="mb-2 flex justify-between text-xs font-bold"><span className="text-white/60">🎯 هامش الربح المطلوب</span><span className="text-lime-300 text-base">{margin}%</span></div>
        <input type="range" min={5} max={200} step={5} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full accent-lime-500" />
      </div>

      {r ? (
        <div className="space-y-3">
          <div className="rounded-3xl p-6 text-center bg-gradient-to-br from-lime-500/25 to-green-600/10 border border-lime-400/30">
            <p className="text-xs font-bold text-white/60 mb-1">💰 السعر المقترح للبيع</p>
            <p className="text-4xl font-black text-lime-300">{fmtN(Math.ceil(r.price / 10) * 10)}</p>
            <p className="text-xs text-white/60 mt-1">ريال (مقرّب لأقرب 10)</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="text-[10px] text-white/50 font-bold mb-1">التكلفة الكلية</p><p className="font-black">{fmtN(r.c)}</p></div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="text-[10px] text-white/50 font-bold mb-1">صافي ربح القطعة</p><p className="font-black text-lime-300">{fmtN(r.profit)}</p></div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="text-[10px] text-white/50 font-bold mb-1">العائد على التكلفة</p><p className="font-black text-lime-300">{r.roi.toFixed(0)}%</p></div>
          </div>
          <div className="rounded-2xl border border-lime-400/20 bg-lime-400/5 p-4 text-xs text-white/70 leading-relaxed">
            💡 بيع 100 قطعة بهذا السعر = صافي ربح <b className="text-lime-300">{fmtN(r.profit * 100)}</b> ريال. جرّب تحريك الهامش لترى التأثير فوراً.
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/50">
          <div className="text-4xl mb-2">🧮</div><p className="font-bold text-sm">أدخل التكلفة وسيظهر السعر المثالي هنا</p>
        </div>
      )}
    </div>
  );
}
