'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { elementToPdf, fileToDataUrl, fmtN } from './pdfHelper';

interface Item { name: string; qty: number; price: number }

// 🧾 صانع الفواتير — فاتورة A4 فاخرة بشعارك، حفظ PDF ومشاركة واتساب
export default function InvoiceTool() {
  const [seller, setSeller] = useState('');
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState('');
  const [logo, setLogo] = useState('');
  const [items, setItems] = useState<Item[]>([{ name: '', qty: 1, price: 0 }]);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [currency, setCurrency] = useState('ريال يمني');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // 🏬 ربط مباشر بمتجر البائع — تعبئة بيانات المصدر تلقائياً (لا تكتب فوق إدخاله)
  useEffect(() => {
    if (typeof window === 'undefined' || localStorage.getItem('yz_type') !== 'seller') return;
    import('@/lib/store-link').then(({ myStoreInfo }) => myStoreInfo()).then((st: any) => {
      if (!st) return;
      if (st.name) setSeller((v) => v || st.name);
      const ph = st.phone || st.whatsapp || '';
      if (ph) setPhone((v) => v || ph);
      if (st.logo) setLogo((v) => v || st.logo);
    }).catch(() => {});
  }, []);
  const ref = useRef<HTMLDivElement>(null);

  const invNo = useMemo(() => `YZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(100 + Math.random() * 900))}`, []);
  const sub = items.reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0);
  const disc = Math.min(Number(discount) || 0, sub);
  const taxAmt = ((sub - disc) * (Number(tax) || 0)) / 100;
  const total = sub - disc + taxAmt;

  const setItem = (i: number, k: keyof Item, v: string) => {
    setItems((arr) => arr.map((it, j) => j === i ? { ...it, [k]: k === 'name' ? v.slice(0, 60) : Number(v) || 0 } : it));
  };

  const share = () => {
    const lines = [`🧾 فاتورة ${invNo}`, seller ? `من: ${seller}` : '', customer ? `إلى: ${customer}` : '', '—'.repeat(12),
      ...items.filter((i) => i.name).map((i) => `• ${i.name} × ${i.qty} = ${fmtN(i.qty * i.price)}`),
      '—'.repeat(12), `💰 الإجمالي: ${fmtN(total)} ${currency}`, '', '⚡ عبر منصة يمن زون'].filter(Boolean);
    const msg = lines.join('\n');
    const p = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${p ? (p.startsWith('967') ? p : '967' + p.replace(/^0/, '')) : ''}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const savePdf = async () => {
    if (!ref.current) return;
    setBusy(true);
    try { await elementToPdf(ref.current, `فاتورة-${invNo}.pdf`); toast('✅ تم تنزيل الفاتورة PDF'); }
    catch { toast('تعذّر إنشاء PDF — حاول مجدداً', 'error'); }
    setBusy(false);
  };

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-violet-400 placeholder:text-white/30';

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* ✏️ النموذج */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h3 className="font-extrabold text-sm">🏪 بيانات الفاتورة</h3>
          <div className="flex gap-3 items-center">
            <label className="w-16 h-16 rounded-2xl bg-white/10 border border-dashed border-white/25 grid place-items-center cursor-pointer overflow-hidden shrink-0 hover:border-violet-400 transition-colors">
              {logo ? <img src={logo} className="w-full h-full object-cover" alt="" /> : <span className="text-2xl">📷</span>}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setLogo(await fileToDataUrl(f)); toast('✅ تم إضافة الشعار'); } }} />
            </label>
            <div className="flex-1 space-y-2">
              <input value={seller} onChange={(e) => setSeller(e.target.value)} placeholder="اسم متجرك / نشاطك *" className={inp} />
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="جوالك (لواتساب العميل)" className={inp} dir="ltr" />
            </div>
          </div>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="اسم العميل" className={inp} />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h3 className="font-extrabold text-sm">📦 الأصناف</h3>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input value={it.name} onChange={(e) => setItem(i, 'name', e.target.value)} placeholder={`الصنف ${i + 1}`} className={`${inp} flex-1`} />
              <input inputMode="numeric" value={it.qty || ''} onChange={(e) => setItem(i, 'qty', e.target.value)} placeholder="كمية" className={`${inp} w-16 text-center`} />
              <input inputMode="decimal" value={it.price || ''} onChange={(e) => setItem(i, 'price', e.target.value)} placeholder="سعر" className={`${inp} w-24 text-center`} />
              {items.length > 1 && <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="w-9 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/30">✕</button>}
            </div>
          ))}
          <button onClick={() => { setItems([...items, { name: '', qty: 1, price: 0 }]); toast('➕ أضف الصنف ثم عبّئه'); }}
            className="w-full py-2.5 rounded-xl bg-violet-500/20 border border-violet-400/40 text-sm font-bold hover:bg-violet-500/30 transition-colors">➕ إضافة صنف</button>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-bold text-white/60">خصم<input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1 text-center`} /></label>
            <label className="text-xs font-bold text-white/60">ضريبة %<input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1 text-center`} /></label>
            <label className="text-xs font-bold text-white/60">العملة
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${inp} mt-1`}>
                {['ريال يمني', 'دولار', 'ريال سعودي'].map((c) => <option key={c} className="bg-slate-900">{c}</option>)}
              </select>
            </label>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 200))} placeholder="ملاحظات (اختياري)" rows={2} className={inp} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={savePdf} disabled={busy || !items.some((i) => i.name)}
            className="py-3.5 rounded-2xl bg-gradient-to-l from-violet-600 to-fuchsia-600 font-extrabold text-sm shadow-lg shadow-purple-500/30 disabled:opacity-40 hover:brightness-110 transition-all">
            {busy ? '⏳ جارٍ الإنشاء...' : '📄 تنزيل PDF'}
          </button>
          <button onClick={share} disabled={!items.some((i) => i.name)}
            className="py-3.5 rounded-2xl bg-gradient-to-l from-green-600 to-emerald-600 font-extrabold text-sm shadow-lg shadow-green-500/30 disabled:opacity-40 hover:brightness-110 transition-all">💬 إرسال واتساب</button>
        </div>
      </div>

      {/* 👁️ المعاينة (A4) */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-bold text-white/50 mb-2 text-center">👁️ معاينة حية — هكذا ستُطبع</p>
        <div ref={ref} dir="rtl" className="bg-white text-slate-800 rounded-xl p-6 mx-auto max-w-[500px] shadow-2xl" style={{ fontFamily: 'Cairo, sans-serif' }}>
          <div className="flex items-start justify-between border-b-2 border-violet-600 pb-4 mb-4">
            <div className="flex items-center gap-3">
              {logo && <img src={logo} className="w-14 h-14 rounded-xl object-cover" alt="" />}
              <div>
                <div className="font-black text-lg text-violet-700">{seller || 'اسم النشاط'}</div>
                {phone && <div className="text-xs text-slate-500" dir="ltr">{phone}</div>}
              </div>
            </div>
            <div className="text-left">
              <div className="font-black text-violet-700">فاتورة</div>
              <div className="text-[10px] text-slate-500">{invNo}</div>
              <div className="text-[10px] text-slate-500">{new Date().toLocaleDateString('ar-YE')}</div>
            </div>
          </div>
          {customer && <div className="mb-3 text-sm"><b>إلى:</b> {customer}</div>}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="bg-violet-50 text-violet-800">
                <th className="py-2 px-2 text-right rounded-r-lg">الصنف</th>
                <th className="py-2 px-2">كمية</th>
                <th className="py-2 px-2">سعر</th>
                <th className="py-2 px-2 rounded-l-lg">إجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.filter((i) => i.name).map((i, x) => (
                <tr key={x} className="border-b border-slate-100">
                  <td className="py-2 px-2 text-right">{i.name}</td>
                  <td className="py-2 px-2 text-center">{i.qty}</td>
                  <td className="py-2 px-2 text-center">{fmtN(i.price)}</td>
                  <td className="py-2 px-2 text-center font-bold">{fmtN(i.qty * i.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mr-auto w-48 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">المجموع</span><b>{fmtN(sub)}</b></div>
            {disc > 0 && <div className="flex justify-between text-red-600"><span>الخصم</span><b>-{fmtN(disc)}</b></div>}
            {taxAmt > 0 && <div className="flex justify-between"><span className="text-slate-500">الضريبة {tax}%</span><b>+{fmtN(taxAmt)}</b></div>}
            <div className="flex justify-between border-t-2 border-violet-600 pt-2 text-base font-black text-violet-700">
              <span>الإجمالي</span><span>{fmtN(total)} {currency}</span>
            </div>
          </div>
          {notes && <div className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-2">📝 {notes}</div>}
          <div className="mt-6 text-center text-[10px] text-slate-400">⚡ أُنشئت بواسطة منصة يمن زون — yemenzone1.com</div>
        </div>
      </div>
    </div>
  );
}
