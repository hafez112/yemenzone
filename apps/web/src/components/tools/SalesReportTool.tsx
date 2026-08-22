'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, card, Empty, Field, inp, Stat, todayISO, uid } from './shared/ui';

// 📊 تقرير المبيعات الأسبوعي — سجّل مبيعاتك اليومية واكشف اتجاهك وأفضل أيامك
interface Sale { id: number; product: string; qty: number; amount: number; date: string }

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const weekStart = (offset: number) => { const d = new Date(); d.setDate(d.getDate() - d.getDay() - 7 * offset); return d; };

export default function SalesReportTool() {
  const { data: sales, setData: setSales } = useToolDB<Sale[]>('sales-report', [], 'yz-sales-v1');
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState('1');
  const [amount, setAmount] = useState('');
  const [showForm, setShowForm] = useState(false);

  const add = () => {
    if (!(Number(amount) > 0)) { toast('✍️ أدخل مبلغ البيع', 'error'); return; }
    setSales([{ id: uid(), product: product.trim() || 'بيع عام', qty: Number(qty) || 1, amount: Number(amount), date: new Date().toISOString() }, ...sales].slice(0, 500));
    setProduct(''); setQty('1'); setAmount(''); setShowForm(false);
    toast('🛒 سُجّل البيع في تقريرك');
  };

  const calc = useMemo(() => {
    const inWeek = (iso: string, offset: number) => {
      const d = new Date(iso), s = weekStart(offset), e = new Date(s); e.setDate(e.getDate() + 7);
      return d >= s && d < e;
    };
    const thisWeek = sales.filter((s) => inWeek(s.date, 0));
    const lastWeek = sales.filter((s) => inWeek(s.date, 1));
    const sum = (arr: Sale[]) => arr.reduce((x, s) => x + s.amount, 0);
    const total = sum(thisWeek), prev = sum(lastWeek);

    // مبيعات كل يوم من الأسبوع
    const days: { label: string; key: string; total: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart(0)); d.setDate(d.getDate() + i);
      const k = dayKey(d);
      days.push({ label: DAYS[d.getDay()], key: k, total: sum(thisWeek.filter((s) => dayKey(new Date(s.date)) === k)) });
    }
    const bestDay = days.reduce((a, b) => (b.total > a.total ? b : a), days[0]);
    const maxDay = Math.max(...days.map((d) => d.total), 1);

    // المنتج الأكثر مبيعاً
    const byProduct = new Map<string, number>();
    for (const s of thisWeek) byProduct.set(s.product, (byProduct.get(s.product) || 0) + s.amount);
    const top = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0];

    const change = prev > 0 ? Math.round(((total - prev) / prev) * 100) : (total > 0 ? 100 : 0);
    return { total, prev, change, days, bestDay, maxDay, top, count: thisWeek.length };
  }, [sales]);

  const todayTotal = sales.filter((s) => dayKey(new Date(s.date)) === todayISO()).reduce((x, s) => x + s.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="🛒" label="مبيعات اليوم" value={fmtN(todayTotal)} tone="text-lime-300" />
        <Stat icon="📊" label="هذا الأسبوع" value={fmtN(calc.total)} tone="text-amber-300" />
        <Stat icon={calc.change >= 0 ? '📈' : '📉'} label="عن الأسبوع الماضي" value={`${calc.change >= 0 ? '+' : ''}${calc.change}٪`} tone={calc.change >= 0 ? 'text-lime-300' : 'text-red-300'} />
      </div>

      <button onClick={() => setShowForm(!showForm)} className={btnP + ' w-full'}>{showForm ? '✕ إغلاق' : '🛒 تسجيل بيع جديد'}</button>

      {showForm && (
        <div className={card + ' space-y-3'}>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3"><Field label="📦 المنتج (اختياري)"><input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="ساعة ذكية X9" className={inp} /></Field></div>
            <Field label="🔢 الكمية"><input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))} className={inp} /></Field>
            <div className="col-span-2"><Field label="💰 المبلغ الإجمالي"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field></div>
          </div>
          <button onClick={add} className={btnP + ' w-full'}>📥 تسجيل</button>
        </div>
      )}

      {calc.total > 0 && (
        <div className={card}>
          <p className="text-xs font-extrabold text-white/70 mb-3">📅 مبيعات أيام الأسبوع</p>
          <div className="flex items-end gap-1.5 h-28">
            {calc.days.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold text-lime-300">{d.total > 0 ? fmtN(d.total) : ''}</span>
                <div className={`w-full rounded-t-lg transition-all ${d.key === todayISO() ? 'bg-gradient-to-t from-lime-500 to-emerald-400' : 'bg-white/15'}`}
                  style={{ height: `${Math.max(4, Math.round((d.total / calc.maxDay) * 80))}px` }} />
                <span className="text-[8px] text-white/45 font-bold">{d.label.slice(0, 5)}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl bg-white/5 p-2.5 text-center">
              <p className="text-[10px] text-white/45 font-bold">🏆 أفضل يوم</p>
              <p className="text-sm font-black text-lime-300 mt-0.5">{calc.bestDay.total > 0 ? `${calc.bestDay.label} (${fmtN(calc.bestDay.total)})` : '—'}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2.5 text-center">
              <p className="text-[10px] text-white/45 font-bold">⭐ الأكثر مبيعاً</p>
              <p className="text-sm font-black text-amber-300 mt-0.5 truncate">{calc.top ? calc.top[0] : '—'}</p>
            </div>
          </div>
          <p className="text-[11px] text-white/45 text-center mt-3">🧾 {calc.count} عملية هذا الأسبوع · الأسبوع الماضي: {fmtN(calc.prev)}</p>
        </div>
      )}

      {sales.length === 0 && <Empty icon="📊" text="لا مبيعات مسجلة — سجّل مبيعاتك اليومية وشاهد تقريرك يتشكّل" />}

      {sales.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-white/60">🕐 آخر العمليات</p>
          {sales.slice(0, 12).map((s) => (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-lime-500/15 grid place-items-center text-base shrink-0">🛒</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{s.product} <span className="text-white/40">×{s.qty}</span></p>
                <p className="text-[10px] text-white/40" dir="ltr">{s.date.slice(0, 10)}</p>
              </div>
              <span className="font-black text-sm text-lime-300 shrink-0">{fmtN(s.amount)}</span>
              <button onClick={() => { setSales(sales.filter((x) => x.id !== s.id)); toast('🗑️ حُذفت العملية'); }} className={btnD}>حذف</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
