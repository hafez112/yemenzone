'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Chips, Empty, Field, fmtDate, inp, monthKey, Stat, todayISO, uid } from './shared/ui';

// 💰 مدير الميزانية الشخصية — دخلك ومصروفك وأظرف توفيرك في مكان واحد
interface Entry { id: number; kind: 'expense' | 'income'; cat: string; amount: number; note: string; date: string }
interface Envelope { name: string; limit: number }
interface Store { entries: Entry[]; envelopes: Envelope[] }

const EXP_CATS = ['🍔 طعام', '🛵 مواصلات', '🛍️ تسوق', '🧾 فواتير', '💊 صحة', '📚 تعليم', '🎮 ترفيه', '📌 أخرى'];
const INC_CATS = ['💼 راتب', '🎁 هدية', '📈 دخل إضافي', '📌 أخرى'];

export default function BudgetTool() {
  const { data: store, setData: setStore } = useToolDB<Store>('budget', { entries: [], envelopes: [] }, 'yz-budget-v1');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [cat, setCat] = useState(EXP_CATS[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [envName, setEnvName] = useState('');
  const [envLimit, setEnvLimit] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showEnv, setShowEnv] = useState(false);

  const month = monthKey(todayISO());
  const cats = kind === 'expense' ? EXP_CATS : INC_CATS;

  const add = () => {
    if (!(Number(amount) > 0)) { toast('✍️ أدخل المبلغ', 'error'); return; }
    setStore({ ...store, entries: [{ id: uid(), kind, cat, amount: Number(amount), note: note.trim(), date: new Date().toISOString() }, ...store.entries].slice(0, 500) });
    setAmount(''); setNote(''); setShowForm(false);
    toast(kind === 'expense' ? '💸 سُجّل المصروف' : '💰 سُجّل الدخل');
  };

  const addEnvelope = () => {
    if (!envName.trim() || !(Number(envLimit) > 0)) { toast('✍️ أدخل اسم الظرف وحدّه', 'error'); return; }
    setStore({ ...store, envelopes: [...store.envelopes, { name: envName.trim(), limit: Number(envLimit) }] });
    setEnvName(''); setEnvLimit(''); setShowEnv(false);
    toast('✉️ أُنشئ ظرف التوفير');
  };

  const mEntries = useMemo(() => store.entries.filter((e) => monthKey(e.date) === month), [store.entries, month]);
  const income = mEntries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = mEntries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const remaining = income - expense;

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of mEntries.filter((x) => x.kind === 'expense')) m.set(e.cat, (m.get(e.cat) || 0) + e.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [mEntries]);
  const maxCat = byCat[0]?.[1] || 1;

  // ✉️ صرف كل ظرف — يطابق التصنيف باسم الظرف
  const envSpent = (name: string) => mEntries.filter((e) => e.kind === 'expense' && e.cat === name).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="💰" label="دخل الشهر" value={fmtN(income)} tone="text-lime-300" />
        <Stat icon="💸" label="مصروفه" value={fmtN(expense)} tone="text-red-300" />
        <Stat icon="🐷" label="المتبقي" value={fmtN(remaining)} tone={remaining >= 0 ? 'text-lime-300' : 'text-red-300'} />
      </div>

      <div className="flex gap-2">
        <button onClick={() => { setShowForm(!showForm); setShowEnv(false); }} className={btnP + ' flex-1'}>{showForm ? '✕ إغلاق' : '➕ قيد جديد'}</button>
        <button onClick={() => { setShowEnv(!showEnv); setShowForm(false); }} className={btnS + ' !py-2.5'}>{showEnv ? '✕' : '✉️ ظرف'}</button>
      </div>

      {showForm && (
        <div className={card + ' space-y-3'}>
          <Chips options={[{ id: 'expense', label: '💸 مصروف' }, { id: 'income', label: '💰 دخل' }]} value={kind}
            onChange={(v) => { setKind(v); setCat(v === 'expense' ? EXP_CATS[0] : INC_CATS[0]); }} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="🏷️ التصنيف">
              <select value={cat} onChange={(e) => setCat(e.target.value)} className={inp}>
                {[...cats, ...store.envelopes.map((x) => x.name).filter((n) => !cats.includes(n))].map((c) => <option key={c} value={c} className="text-gray-900">{c}</option>)}
              </select>
            </Field>
            <Field label="💵 المبلغ"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
            <div className="col-span-2"><Field label="📝 ملاحظة"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" className={inp} /></Field></div>
          </div>
          <button onClick={add} className={btnP + ' w-full'}>📥 تسجيل</button>
        </div>
      )}

      {showEnv && (
        <div className={card + ' space-y-3'}>
          <p className="text-xs font-extrabold text-white/70">✉️ ظرف توفير جديد — حدّد سقفاً لتصنيف تراقبه</p>
          <div className="flex gap-2">
            <input value={envName} onChange={(e) => setEnvName(e.target.value)} placeholder="مثال: 🍔 طعام" className={inp} />
            <input inputMode="decimal" value={envLimit} onChange={(e) => setEnvLimit(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="السقف" className={inp + ' !w-28'} />
          </div>
          <button onClick={addEnvelope} className={btnP + ' w-full'}>✉️ إنشاء الظرف</button>
        </div>
      )}

      {store.envelopes.length > 0 && (
        <div className={card + ' space-y-3'}>
          <p className="text-xs font-extrabold text-white/70">✉️ أظرفة هذا الشهر</p>
          {store.envelopes.map((env, i) => {
            const spent = envSpent(env.name);
            const pct = Math.min(100, Math.round((spent / env.limit) * 100));
            const over = spent > env.limit;
            return (
              <div key={i}>
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span>{env.name}</span>
                  <span className={over ? 'text-red-300' : 'text-white/60'}>{fmtN(spent)} / {fmtN(env.limit)} {over && '⛔ تجاوزت!'}</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-gradient-to-l from-lime-500 to-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {byCat.length > 0 && (
        <div className={card}>
          <p className="text-xs font-extrabold text-white/70 mb-3">📊 مصروف الشهر بالتصنيف</p>
          <div className="space-y-2">
            {byCat.map(([c, v]) => (
              <div key={c}>
                <div className="flex justify-between text-[11px] font-bold mb-1"><span>{c}</span><span className="text-red-300">{fmtN(v)}</span></div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-l from-rose-400 to-red-500" style={{ width: `${Math.round((v / maxCat) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mEntries.length === 0 && <Empty icon="💰" text="لا قيود هذا الشهر — سجّل دخلك ومصروفك وسيطر على ميزانيتك" />}

      {mEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-white/60">🕐 قيود الشهر ({mEntries.length})</p>
          {mEntries.slice(0, 15).map((e) => (
            <div key={e.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <span className={`w-9 h-9 rounded-xl grid place-items-center text-base shrink-0 ${e.kind === 'expense' ? 'bg-red-500/15' : 'bg-lime-500/15'}`}>{e.kind === 'expense' ? '💸' : '💰'}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{e.cat}{e.note ? ` — ${e.note}` : ''}</p>
                <p className="text-[10px] text-white/40">{fmtDate(e.date)}</p>
              </div>
              <span className={`font-black text-sm shrink-0 ${e.kind === 'expense' ? 'text-red-300' : 'text-lime-300'}`}>{e.kind === 'expense' ? '−' : '+'}{fmtN(e.amount)}</span>
              <button onClick={() => { setStore({ ...store, entries: store.entries.filter((x) => x.id !== e.id) }); toast('🗑️ حُذف القيد'); }} className={btnD}>حذف</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
