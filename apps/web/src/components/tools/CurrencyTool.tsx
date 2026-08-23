'use client';
import { useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const CURR: Record<string, { name: string; icon: string }> = {
  YER: { name: 'ريال يمني', icon: '💵' },
  USD: { name: 'دولار أمريكي', icon: '🇺🇸' },
  SAR: { name: 'ريال سعودي', icon: '🇸🇦' },
  AED: { name: 'درهم إماراتي', icon: '🇦🇪' },
  EUR: { name: 'يورو', icon: '🇪🇺' },
};
const QUICK = [1, 5, 10, 50, 100, 500, 1000];
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

// 💱 محوّل العملات اليمني — الأسعار من إدارة المنصة + سعر مخصص بيد المستخدم
export default function CurrencyTool() {
  const [fx, setFx] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('YER');
  const [custom, setCustom] = useState(''); // سعر صرف يدوي: 1 من = كم إلى
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/tools`).then((r) => r.json()).then((d) => setFx(d.fx || {})).catch(() => {});
  }, []);

  const rate = useMemo(() => {
    if (useCustom) return Number(custom) || 0;
    if (from === to) return 1;
    // كل الأسعار مقابل الريال اليمني (1 عملة = X ريال)
    const f = from === 'YER' ? 1 : fx[from];
    const t = to === 'YER' ? 1 : fx[to];
    if (!f || !t) return 0;
    return f / t;
  }, [fx, from, to, custom, useCustom]);

  const amt = Number(amount) || 0;
  const result = amt * rate;
  const currencies = Object.keys(CURR);
  const missingRate = !useCustom && from !== to && ((from !== 'YER' && !fx[from]) || (to !== 'YER' && !fx[to]));

  const Sel = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => (
    <label className="block">
      <span className="text-xs font-bold text-white/60 block mb-1.5">{label}</span>
      <select value={v} onChange={(e) => set(e.target.value)}
        className="w-full bg-white/10 border border-white/15 rounded-xl py-3 px-3 text-sm font-bold outline-none focus:border-emerald-400">
        {currencies.map((c) => <option key={c} value={c} className="bg-slate-900">{CURR[c].icon} {CURR[c].name} ({c})</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-5">
      {/* البطاقة الرئيسية */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <label className="block mb-4">
          <span className="text-xs font-bold text-white/60 block mb-1.5">المبلغ</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full bg-white/10 border border-white/15 rounded-2xl py-4 px-4 text-2xl font-black text-center outline-none focus:border-emerald-400" placeholder="0" />
        </label>
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {QUICK.map((n) => (
            <button key={n} onClick={() => setAmount(String(n))}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${Number(amount) === n ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>{fmt(n)}</button>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 mb-5">
          <Sel v={from} set={setFrom} label="من" />
          <button onClick={() => { setFrom(to); setTo(from); }}
            className="w-11 h-11 mb-0.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-lg hover:bg-emerald-500/40 transition-colors" title="تبديل">⇄</button>
          <Sel v={to} set={setTo} label="إلى" />
        </div>

        {/* النتيجة */}
        <div className="rounded-2xl p-5 text-center bg-gradient-to-br from-emerald-500/20 to-teal-600/10 border border-emerald-400/30">
          {missingRate ? (
            <div>
              <p className="text-amber-300 font-bold text-sm mb-1">⚠️ سعر {from !== 'YER' ? from : to} لم تعتمده الإدارة بعد</p>
              <p className="text-xs text-white/60">استخدم «السعر المخصص» بالأسفل أو عد لاحقاً</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-white/60 mb-1">{fmt(amt)} {CURR[from].name} =</p>
              <p className="text-3xl sm:text-4xl font-black text-emerald-300">{fmt(result)}</p>
              <p className="text-sm font-bold text-white/80 mt-1">{CURR[to].icon} {CURR[to].name}</p>
              {rate > 0 && <p className="text-[11px] text-white/50 mt-2">1 {from} = {fmt(rate)} {to} · 1 {to} = {fmt(1 / rate)} {from}</p>}
            </>
          )}
        </div>
      </div>

      {/* سعر مخصص */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
          <span className="font-bold text-sm">🎯 لديّ سعر صرف خاص (سعر السوق اليوم)</span>
        </label>
        {useCustom && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-bold text-white/60 shrink-0">1 {from} =</span>
            <input inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ''))}
              className="flex-1 bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm font-bold outline-none focus:border-emerald-400" placeholder="أدخل السعر" />
            <span className="text-xs font-bold text-white/60 shrink-0">{to}</span>
          </div>
        )}
      </div>

      {/* جدول الأسعار المعتمدة */}
      {Object.keys(fx).length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-extrabold text-sm mb-3">📋 أسعار الصرف المعتمدة من المنصة <span className="text-white/50 font-normal">(مقابل الريال اليمني)</span></h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(fx).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-lg">{CURR[k]?.icon || '💵'}</div>
                <div className="font-black text-emerald-300">{fmt(v)}</div>
                <div className="text-[10px] text-white/50 font-bold">{CURR[k]?.name || k}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-white/70 leading-relaxed">
        💡 <b>للبائعين في يمن زون:</b> متجرك يعرض أسعار منتجاتك بعملتك وتُحوَّل تلقائياً لزوارك بأسعار هذه الشاشة — <a href="/auth/seller-register" className="text-emerald-300 font-bold underline">افتح متجرك</a>.
      </div>
    </div>
  );
}
