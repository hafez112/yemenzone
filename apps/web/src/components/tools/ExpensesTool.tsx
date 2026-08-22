'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, card, Chips, Empty, Field, fmtDate, inp, monthKey, Stat, todayISO, uid } from './shared/ui';

// 💸 دفتر المصروفات والأرباح — دخل ومصروف مصنّف وصافي الربح الشهري برسوم واضحة
interface Entry { id: number; kind: 'expense' | 'income'; cat: string; amount: number; note: string; date: string }

const EXP_CATS = ['📦 بضاعة', '🏠 إيجار', '👷 رواتب', '🛵 مواصلات', '📣 تسويق', '🧾 فواتير', '⚙️ صيانة', '📌 أخرى'];
const INC_CATS = ['🛒 مبيعات', '💼 خدمات', '↩️ مرتجع مصروف', '📌 أخرى'];

export default function ExpensesTool() {
  const { data: entries, setData: setEntries } = useToolDB<Entry[]>('expenses', [], 'yz-expenses-v1');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [cat, setCat] = useState(EXP_CATS[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthKey(todayISO()));
  const [showForm, setShowForm] = useState(false);

  const cats = kind === 'expense' ? EXP_CATS : INC_CATS;

  const add = () => {
    if (!(Number(amount) > 0)) { toast('✍️ أدخل المبلغ', 'error'); return; }
    setEntries([{ id: uid(), kind, cat, amount: Number(amount), note: note.trim(), date }, ...entries]);
    setAmount(''); setNote(''); setShowForm(false);
    toast(kind === 'expense' ? '💸 سُجّل المصروف' : '💰 سُجّل الدخل');
  };

  // 📊 حسابات الشهر المحدد
  const mEntries = useMemo(() => entries.filter((e) => monthKey(e.date) === month).sort((a, b) => b.date.localeCompare(a.date)), [entries, month]);
  const income = mEntries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = mEntries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const net = income - expense;

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of mEntries.filter((x) => x.kind === 'expense')) m.set(e.cat, (m.get(e.cat) || 0) + e.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [mEntries]);
  const maxCat = byCat[0]?.[1] || 1;

  // قائمة الأشهر المتاحة
  const months = useMemo(() => {
    const s = new Set(entries.map((e) => monthKey(e.date)));
    s.add(monthKey(todayISO()));
    return [...s].sort().reverse();
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={inp} dir="ltr">
          {months.map((m) => <option key={m} value={m} className="text-gray-900">{m}</option>)}
        </select>
        <button onClick={() => setShowForm(!showForm)} className={btnP + ' shrink-0'}>{showForm ? '✕' : '➕ قيد'}</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon="💰" label="الدخل" value={fmtN(income)} tone="text-lime-300" />
        <Stat icon="💸" label="المصروف" value={fmtN(expense)} tone="text-red-300" />
        <Stat icon={net >= 0 ? '📈' : '📉'} label="الصافي" value={fmtN(net)} tone={net >= 0 ? 'text-lime-300' : 'text-red-300'} />
      </div>

      {showForm && (
        <div className={card + ' space-y-3'}>
          <Chips options={[{ id: 'expense', label: '💸 مصروف' }, { id: 'income', label: '💰 دخل' }]} value={kind}
            onChange={(v) => { setKind(v); setCat(v === 'expense' ? EXP_CATS[0] : INC_CATS[0]); }} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="🏷️ التصنيف">
              <select value={cat} onChange={(e) => setCat(e.target.value)} className={inp}>{cats.map((c) => <option key={c} value={c} className="text-gray-900">{c}</option>)}</select>
            </Field>
            <Field label="💵 المبلغ"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
            <Field label="📅 التاريخ"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} dir="ltr" /></Field>
            <Field label="📝 ملاحظة"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" className={inp} /></Field>
          </div>
          <button onClick={add} className={btnP + ' w-full'}>📥 تسجيل القيد</button>
        </div>
      )}

      {byCat.length > 0 && (
        <div className={card}>
          <p className="text-xs font-extrabold text-white/70 mb-3">📊 أين تذهب مصروفاتك هذا الشهر؟</p>
          <div className="space-y-2">
            {byCat.map(([c, v]) => (
              <div key={c}>
                <div className="flex justify-between text-[11px] font-bold mb-1"><span>{c}</span><span className="text-red-300">{fmtN(v)}</span></div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-l from-red-400 to-orange-500 transition-all" style={{ width: `${Math.round((v / maxCat) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mEntries.length === 0 && <Empty icon="💸" text="لا قيود هذا الشهر — سجّل أول قيد واعرف أين يذهب مالك" />}

      <div className="space-y-2">
        {mEntries.map((e) => (
          <div key={e.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
            <span className={`w-9 h-9 rounded-xl grid place-items-center text-base shrink-0 ${e.kind === 'expense' ? 'bg-red-500/15' : 'bg-lime-500/15'}`}>{e.kind === 'expense' ? '💸' : '💰'}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate">{e.cat}{e.note ? ` — ${e.note}` : ''}</p>
              <p className="text-[10px] text-white/40">{fmtDate(e.date)}</p>
            </div>
            <span className={`font-black text-sm shrink-0 ${e.kind === 'expense' ? 'text-red-300' : 'text-lime-300'}`}>{e.kind === 'expense' ? '−' : '+'}{fmtN(e.amount)}</span>
            <button onClick={() => { setEntries(entries.filter((x) => x.id !== e.id)); toast('🗑️ حُذف القيد'); }} className={btnD}>حذف</button>
          </div>
        ))}
      </div>
    </div>
  );
}
