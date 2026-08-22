'use client';
import { useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';
import { elementToPdf, fmtN } from './pdfHelper';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, Empty, Field, fmtDate, inp, Stat, todayISO, uid, waLink } from './shared/ui';

// 📝 عروض الأسعار الاحترافية — عرض سعر PDF بترويسة متجرك لزبائن الجملة والمؤسسات
interface QItem { name: string; qty: number; price: number }
interface Quote { id: number; no: number; client: string; phone: string; items: QItem[]; discount: number; tax: number; validDays: number; note: string; date: string; currency?: string }
interface Store { quotes: Quote[]; seq: number; biz: string }

export default function QuotesTool() {
  const { data: store, setData: setStore } = useToolDB<Store>('quotes', { quotes: [], seq: 1, biz: '' }, 'yz-quotes-v1');
  const [client, setClient] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState<QItem[]>([{ name: '', qty: 1, price: 0 }]);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [validDays, setValidDays] = useState('7');
  const [note, setNote] = useState('');
  const [current, setCurrent] = useState<Quote | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const { list: CURS, def: defCur } = useCurrency();
  const [currency, setCurrency] = useState('');
  const qsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const effCur = currency || defCur?.code || 'YER';

  const sub = items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0);
  const disc = Math.min(Number(discount) || 0, sub);
  const taxVal = (Number(tax) || 0) > 0 ? ((sub - disc) * Number(tax)) / 100 : 0;
  const total = sub - disc + taxVal;

  const setItem = (i: number, patch: Partial<QItem>) => setItems(items.map((it, x) => x === i ? { ...it, ...patch } : it));

  const build = (): Quote | null => {
    const clean = items.filter((it) => it.name.trim() && it.qty > 0);
    if (!client.trim() || !clean.length) { toast('✍️ أدخل اسم العميل وبنداً واحداً على الأقل', 'error'); return null; }
    return { id: uid(), no: store.seq, client: client.trim(), phone: phone.trim(), items: clean, discount: disc, tax: Number(tax) || 0, validDays: Number(validDays) || 7, note: note.trim(), date: new Date().toISOString(), currency: effCur };
  };

  const preview = () => {
    const q = build();
    if (q) { setCurrent(q); toast('👁️ المعاينة جاهزة — نزّلها PDF أو أرسلها'); }
  };

  const saveAndPreview = () => {
    const q = build();
    if (!q) return;
    setStore({ ...store, quotes: [q, ...store.quotes].slice(0, 100), seq: store.seq + 1 });
    setCurrent(q);
    toast(`💾 حُفظ عرض السعر رقم ${q.no}`);
  };

  const download = async () => {
    if (!current || !pdfRef.current) return;
    toast('⏳ جاري تجهيز PDF...');
    try { await elementToPdf(pdfRef.current, `عرض-سعر-${current.no}.pdf`); toast('📄 نُزّل عرض السعر PDF'); }
    catch { toast('تعذّر إنشاء PDF', 'error'); }
  };

  const waText = current
    ? `السلام عليكم ${current.client} 🌹\nعرض سعر رقم ${current.no} من ${store.biz || 'متجرنا'}\n${current.items.map((it) => `• ${it.name} ×${it.qty} = ${fmtN(it.qty * it.price)}`).join('\n')}\n💰 الإجمالي: ${fmtN(total)} ${qsym(current.currency)}\nالعرض ساري ${current.validDays} أيام`
    : '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="📝" label="عروض محفوظة" value={store.quotes.length} />
        <Stat icon="🔢" label="الرقم التالي" value={store.seq} />
        <Stat icon="💰" label="إجمالي الحالي" value={fmtN(total)} tone="text-lime-300" />
      </div>

      <div className={card + ' space-y-3'}>
        <Field label="🏪 اسم متجرك (يظهر في الترويسة)"><input value={store.biz} onChange={(e) => setStore({ ...store, biz: e.target.value })} placeholder="مؤسسة النور للتجارة" className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="👤 العميل / الجهة"><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="شركة الأمل" className={inp} /></Field>
          <Field label="📱 جواله (للإرسال واتساب)"><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="777123456" className={inp} dir="ltr" /></Field>
        </div>

        <div>
          <p className="text-xs font-bold text-white/60 mb-2">📦 البنود</p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="اسم الصنف/الخدمة" className={inp} />
                <input inputMode="numeric" value={it.qty || ''} onChange={(e) => setItem(i, { qty: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })} placeholder="كمية" className={inp + ' !w-16 text-center'} />
                <input inputMode="decimal" value={it.price || ''} onChange={(e) => setItem(i, { price: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })} placeholder="السعر" className={inp + ' !w-24 text-center'} />
                <button onClick={() => setItems(items.filter((_, x) => x !== i))} className={btnD}>✕</button>
              </div>
            ))}
          </div>
          <button onClick={() => setItems([...items, { name: '', qty: 1, price: 0 }])} className={btnS + ' mt-2'}>➕ بند آخر</button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="💱 العملة">
            <select value={effCur} onChange={(e) => setCurrency(e.target.value)} className={inp}>
              {CURS.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.symbol}</option>)}
            </select>
          </Field>
          <Field label="🏷️ خصم"><input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
          <Field label="🧾 ضريبة ٪"><input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className={inp} /></Field>
          <Field label="📅 ساري (أيام)"><input inputMode="numeric" value={validDays} onChange={(e) => setValidDays(e.target.value.replace(/[^0-9]/g, ''))} className={inp} /></Field>
        </div>
        <Field label="📝 ملاحظات وشروط"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="الأسعار تشمل التوصيل — الدفع عند الاستلام" className={inp} /></Field>

        <div className="flex gap-2">
          <button onClick={preview} className={btnS + ' flex-1'}>👁️ معاينة</button>
          <button onClick={saveAndPreview} className={btnP + ' flex-1'}>💾 حفظ ومعاينة</button>
        </div>
      </div>

      {current && (
        <div className="space-y-3">
          {/* 📄 نسخة الطباعة — بيضاء رسمية */}
          <div ref={pdfRef} dir="rtl" className="bg-white text-gray-900 rounded-2xl p-6 space-y-4" style={{ fontFamily: 'inherit' }}>
            <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-3">
              <div>
                <h2 className="text-xl font-black text-emerald-700">{store.biz || 'عرض سعر'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">عرض سعر رسمي</p>
              </div>
              <div className="text-left text-xs text-gray-500">
                <p className="font-black text-gray-800 text-base">رقم {current.no}</p>
                <p>{fmtDate(current.date)}</p>
              </div>
            </div>
            <p className="text-sm"><b>إلى:</b> {current.client}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50 text-emerald-800">
                  <th className="p-2 text-right rounded-r-lg">البند</th>
                  <th className="p-2">الكمية</th>
                  <th className="p-2">السعر</th>
                  <th className="p-2 rounded-l-lg">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {current.items.map((it, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="p-2">{it.name}</td>
                    <td className="p-2 text-center">{it.qty}</td>
                    <td className="p-2 text-center">{fmtN(it.price)}</td>
                    <td className="p-2 text-center font-bold">{fmtN(it.qty * it.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>المجموع الفرعي</span><span>{fmtN(sub)}</span></div>
              {current.discount > 0 && <div className="flex justify-between text-red-600"><span>الخصم</span><span>−{fmtN(current.discount)}</span></div>}
              {taxVal > 0 && <div className="flex justify-between"><span>الضريبة ({current.tax}٪)</span><span>+{fmtN(taxVal)}</span></div>}
              <div className="flex justify-between font-black text-lg text-emerald-700 border-t-2 border-emerald-600 pt-2"><span>الإجمالي</span><span>{fmtN(total)} {qsym(current.currency)}</span></div>
            </div>
            {current.note && <p className="text-xs text-gray-500 border-t border-gray-200 pt-2">📌 {current.note}</p>}
            <p className="text-[10px] text-gray-400">هذا العرض ساري لمدة {current.validDays} أيام من تاريخه — عبر منصة يمن زون ⚡</p>
          </div>

          <div className="flex gap-2">
            <button onClick={download} className={btnP + ' flex-1'}>📄 تنزيل PDF</button>
            {current.phone && <a href={waLink(current.phone, waText)} target="_blank" rel="noreferrer" className={btnS + ' flex-1 text-center !bg-green-600/25 !text-green-200'}>💬 إرسال واتساب</a>}
          </div>
        </div>
      )}

      {store.quotes.length === 0 && !current && <Empty icon="📝" text="لا عروض محفوظة — أنشئ أول عرض سعر احترافي" />}

      {store.quotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-white/60">🗂️ العروض المحفوظة</p>
          {store.quotes.slice(0, 10).map((q) => (
            <div key={q.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center font-black text-sm shrink-0">{q.no}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{q.client}</p>
                <p className="text-[10px] text-white/40">{fmtDate(q.date)} · {q.items.length} بند · {fmtN(q.items.reduce((s, it) => s + it.qty * it.price, 0) - q.discount)}</p>
              </div>
              <button onClick={() => { setCurrent(q); toast(`👁️ عرض رقم ${q.no}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={btnS}>فتح</button>
              <button onClick={() => { setStore({ ...store, quotes: store.quotes.filter((x) => x.id !== q.id) }); toast('🗑️ حُذف العرض'); }} className={btnD}>حذف</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
