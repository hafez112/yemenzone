'use client';
import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import { useToolDB } from './shared/db';
import { btnD, btnP, card, Chips, Empty, Field, fmtDate, inp, Stat, uid, waLink } from './shared/ui';

// 🛡️ أرشيف الضمانات الذكي — لا يضيع عليك ضمان بعد اليوم، وتنبيه قبل انتهائه
interface W { id: number; product: string; store: string; phone: string; buyDate: string; months: number; note: string }

const expiryOf = (w: W) => { const d = new Date(w.buyDate); d.setMonth(d.getMonth() + w.months); return d; };
const daysLeft = (w: W) => Math.ceil((expiryOf(w).getTime() - Date.now()) / 86400000);

export default function WarrantiesTool() {
  const { data: items, setData: setItems } = useToolDB<W[]>('warranties', [], 'yz-warranties-v1');
  const [product, setProduct] = useState('');
  const [store, setStore] = useState('');
  const [phone, setPhone] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [months, setMonths] = useState('12');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<'active' | 'expiring' | 'expired'>('active');
  const [showForm, setShowForm] = useState(false);

  const add = () => {
    if (!product.trim() || !buyDate) { toast('✍️ أدخل اسم المنتج وتاريخ الشراء', 'error'); return; }
    setItems([{ id: uid(), product: product.trim(), store: store.trim(), phone: phone.trim(), buyDate, months: Number(months) || 12, note: note.trim() }, ...items]);
    setProduct(''); setStore(''); setPhone(''); setNote(''); setShowForm(false);
    toast('🛡️ حُفظ الضمان — سننبّهك قبل انتهائه');
  };

  const statusOf = (w: W): 'active' | 'expiring' | 'expired' => {
    const d = daysLeft(w);
    return d < 0 ? 'expired' : d <= 30 ? 'expiring' : 'active';
  };

  const counts = useMemo(() => {
    const m = { active: 0, expiring: 0, expired: 0 };
    for (const w of items) m[statusOf(w)]++;
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const filtered = items.filter((w) => statusOf(w) === filter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="🛡️" label="سارية" value={counts.active} tone="text-lime-300" />
        <Stat icon="⚠️" label="تنتهي قريباً" value={counts.expiring} tone={counts.expiring ? 'text-amber-300' : 'text-white'} />
        <Stat icon="⛔" label="منتهية" value={counts.expired} tone="text-white/50" />
      </div>

      {counts.expiring > 0 && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3.5">
          <p className="text-xs font-extrabold text-amber-200">⚠️ {counts.expiring} ضمان ينتهي خلال 30 يوماً — راجعها قبل فوات الأوان!</p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <Chips options={[{ id: 'active', label: `🛡️ سارية (${counts.active})` }, { id: 'expiring', label: `⚠️ (${counts.expiring})` }, { id: 'expired', label: `⛔ (${counts.expired})` }]} value={filter} onChange={setFilter} />
        </div>
        <button onClick={() => setShowForm(!showForm)} className={btnP + ' shrink-0'}>{showForm ? '✕' : '➕'}</button>
      </div>

      {showForm && (
        <div className={card + ' space-y-3'}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="📦 المنتج"><input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="ثلاجة هاير / جوال سامسونج..." className={inp} /></Field></div>
            <Field label="🏪 المحل"><input value={store} onChange={(e) => setStore(e.target.value)} placeholder="معرض النور" className={inp} /></Field>
            <Field label="📱 جوال المحل"><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="777123456" className={inp} dir="ltr" /></Field>
            <Field label="📅 تاريخ الشراء"><input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} className={inp} dir="ltr" /></Field>
            <Field label="⏳ مدة الضمان (أشهر)"><input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value.replace(/[^0-9]/g, ''))} className={inp} /></Field>
            <div className="col-span-2"><Field label="📝 ملاحظة"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="رقم الفاتورة / رقم القطعة..." className={inp} /></Field></div>
          </div>
          <button onClick={add} className={btnP + ' w-full'}>🛡️ حفظ الضمان</button>
        </div>
      )}

      {filtered.length === 0 && <Empty icon="🛡️" text={items.length ? 'لا ضمانات في هذه الحالة' : 'أرشيفك فارغ — أضف أول ضمان ولا تفقد حقك أبداً'} />}

      <div className="space-y-2">
        {filtered.map((w) => {
          const d = daysLeft(w);
          const st = statusOf(w);
          const pct = Math.max(0, Math.min(100, Math.round((d / (w.months * 30)) * 100)));
          return (
            <div key={w.id} className={`rounded-2xl border p-3.5 ${st === 'expiring' ? 'border-amber-400/30 bg-amber-400/5' : st === 'expired' ? 'border-white/5 bg-white/[.02] opacity-60' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-sm truncate">📦 {w.product}</p>
                  <p className="text-[11px] text-white/45 mt-0.5">🏪 {w.store || '—'} · شراء {fmtDate(w.buyDate)} · ضمان {w.months} شهر</p>
                </div>
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 ${st === 'active' ? 'bg-lime-500/15 text-lime-300' : st === 'expiring' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/10 text-white/40'}`}>
                  {st === 'active' ? `🛡️ ${d} يوم` : st === 'expiring' ? `⚠️ ${d} يوم فقط` : '⛔ منتهي'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2.5">
                <div className={`h-full rounded-full transition-all ${st === 'expiring' ? 'bg-amber-400' : 'bg-lime-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                {w.note && <span className="text-[10px] text-white/40 truncate">📝 {w.note}</span>}
                <span className="flex-1" />
                {w.phone && st !== 'expired' && (
                  <a href={waLink(w.phone, `السلام عليكم 🌹\nبخصوص ضمان: ${w.product}\nالضمان ينتهي بتاريخ ${fmtDate(expiryOf(w).toISOString())} — أحتاج مراجعة`)} target="_blank" rel="noreferrer" className={btnD + ' !bg-green-600/20 !text-green-200'}>💬 مراجعة المحل</a>
                )}
                <button onClick={() => { setItems(items.filter((x) => x.id !== w.id)); toast('🗑️ حُذف الضمان'); }} className={btnD}>حذف</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
