'use client';
import { useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { elementToPdf, fmtN } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Chips, Empty, Field, fmtDate, inp, Stat, uid } from './shared/ui';

// 🧾 سندات القبض والصرف — ترقيم تلقائي وأرشيف وأرصدة وطباعة رسمية
interface Voucher { id: number; no: number; kind: 'receipt' | 'payment'; party: string; amount: number; note: string; date: string }
interface Store { vouchers: Voucher[]; seq: number; biz: string }

export default function VouchersTool() {
  const { data: store, setData: setStore } = useToolDB<Store>('vouchers', { vouchers: [], seq: 1, biz: '' }, 'yz-vouchers-v1');
  const [kind, setKind] = useState<'receipt' | 'payment'>('receipt');
  const [party, setParty] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [current, setCurrent] = useState<Voucher | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const add = () => {
    if (!party.trim() || !(Number(amount) > 0)) { toast('✍️ أدخل الجهة والمبلغ', 'error'); return; }
    const v: Voucher = { id: uid(), no: store.seq, kind, party: party.trim(), amount: Number(amount), note: note.trim(), date: new Date().toISOString() };
    setStore({ ...store, vouchers: [v, ...store.vouchers].slice(0, 200), seq: store.seq + 1 });
    setCurrent(v);
    setParty(''); setAmount(''); setNote('');
    toast(`🧾 صدر السند رقم ${v.no} — جاهز للطباعة`);
  };

  const download = async () => {
    if (!current || !pdfRef.current) return;
    toast('⏳ جاري تجهيز PDF...');
    try { await elementToPdf(pdfRef.current, `سند-${current.kind === 'receipt' ? 'قبض' : 'صرف'}-${current.no}.pdf`); toast('📄 نُزّل السند PDF'); }
    catch { toast('تعذّر إنشاء PDF', 'error'); }
  };

  const receipts = store.vouchers.filter((v) => v.kind === 'receipt').reduce((s, v) => s + v.amount, 0);
  const payments = store.vouchers.filter((v) => v.kind === 'payment').reduce((s, v) => s + v.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="📥" label="مقبوضات" value={fmtN(receipts)} tone="text-lime-300" />
        <Stat icon="📤" label="مدفوعات" value={fmtN(payments)} tone="text-red-300" />
        <Stat icon="💼" label="الرصيد" value={fmtN(receipts - payments)} tone={receipts - payments >= 0 ? 'text-lime-300' : 'text-red-300'} />
      </div>

      <div className={card + ' space-y-3'}>
        <Field label="🏪 اسم المنشأة (للترويسة)"><input value={store.biz} onChange={(e) => setStore({ ...store, biz: e.target.value })} placeholder="مؤسسة النور" className={inp} /></Field>
        <Chips options={[{ id: 'receipt', label: '📥 سند قبض' }, { id: 'payment', label: '📤 سند صرف' }]} value={kind} onChange={setKind} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === 'receipt' ? '👤 استلمنا من' : '👤 صرفنا إلى'}><input value={party} onChange={(e) => setParty(e.target.value)} placeholder="الاسم" className={inp} /></Field>
          <Field label="💵 المبلغ"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
        </div>
        <Field label="📝 وذلك عن"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="دفعة من قيمة بضاعة / سداد دين..." className={inp} /></Field>
        <button onClick={add} className={btnP + ' w-full'}>🧾 إصدار السند رقم {store.seq}</button>
      </div>

      {current && (
        <div className="space-y-3">
          <div ref={pdfRef} dir="rtl" className="bg-white text-gray-900 rounded-2xl p-6 space-y-4">
            <div className="text-center border-b-2 border-stone-700 pb-3">
              <h2 className="text-xl font-black text-stone-800">{store.biz || 'سند رسمي'}</h2>
              <p className={`text-sm font-black mt-1 ${current.kind === 'receipt' ? 'text-emerald-700' : 'text-red-700'}`}>
                {current.kind === 'receipt' ? '📥 سند قبض' : '📤 سند صرف'} — رقم {current.no}
              </p>
              <p className="text-[11px] text-gray-400">{fmtDate(current.date)}</p>
            </div>
            <div className="text-sm leading-loose space-y-1">
              <p><b>{current.kind === 'receipt' ? 'استلمنا من السيد/ة:' : 'صرفنا إلى السيد/ة'}</b> {current.party}</p>
              <p><b>مبلغاً وقدره:</b> <span className="font-black text-lg">{fmtN(current.amount)} ريال يمني</span></p>
              {current.note && <p><b>وذلك عن:</b> {current.note}</p>}
            </div>
            <div className="flex justify-between pt-6 text-xs text-gray-500">
              <div className="text-center"><p className="mb-6">المستلم</p><p>الاسم: ...................... التوقيع: ..............</p></div>
              <div className="text-center"><p className="mb-6">{current.kind === 'receipt' ? 'المستلم منه' : 'المستفيد'}</p><p>الاسم: ...................... التوقيع: ..............</p></div>
            </div>
            <p className="text-[10px] text-gray-400 text-center border-t border-gray-200 pt-2">صدر إلكترونياً عبر منصة يمن زون ⚡</p>
          </div>
          <button onClick={download} className={btnP + ' w-full'}>📄 تنزيل السند PDF</button>
        </div>
      )}

      {store.vouchers.length === 0 && !current && <Empty icon="🧾" text="لا سندات بعد — أصدر أول سند قبض أو صرف مرقّم" />}

      {store.vouchers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-white/60">🗂️ الأرشيف ({store.vouchers.length})</p>
          {store.vouchers.slice(0, 15).map((v) => (
            <div key={v.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <span className={`w-9 h-9 rounded-xl grid place-items-center text-base shrink-0 ${v.kind === 'receipt' ? 'bg-lime-500/15' : 'bg-red-500/15'}`}>{v.kind === 'receipt' ? '📥' : '📤'}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">#{v.no} — {v.party}</p>
                <p className="text-[10px] text-white/40">{fmtDate(v.date)}{v.note ? ` · ${v.note}` : ''}</p>
              </div>
              <span className={`font-black text-sm shrink-0 ${v.kind === 'receipt' ? 'text-lime-300' : 'text-red-300'}`}>{fmtN(v.amount)}</span>
              <button onClick={() => { setCurrent(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={btnS}>عرض</button>
              <button onClick={() => { setStore({ ...store, vouchers: store.vouchers.filter((x) => x.id !== v.id) }); toast('🗑️ حُذف السند'); }} className={btnD}>حذف</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
