'use client';
import { useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { elementToPdf, fmtN } from './pdfHelper';

interface P { name: string; price: string; unit: string }

// 📊 منشئ قائمة الأسعار — كتالوج PDF أنيق لزبائن الجملة والتجزئة
export default function CatalogTool() {
  const [store, setStore] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('قائمة الأسعار');
  const [currency, setCurrency] = useState('ريال يمني');
  const [items, setItems] = useState<P[]>([{ name: '', price: '', unit: '' }]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-sky-400 placeholder:text-white/30';
  const valid = items.filter((i) => i.name.trim() && i.price);

  const save = async () => {
    if (!ref.current || !valid.length) { toast('✍️ أدخل منتجاً واحداً بسعره على الأقل', 'error'); return; }
    setBusy(true);
    try { await elementToPdf(ref.current, `${title || 'قائمة-أسعار'}.pdf`); toast('✅ تم تنزيل قائمة الأسعار PDF'); }
    catch { toast('تعذّر الإنشاء', 'error'); }
    setBusy(false);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="اسم متجرك *" className={inp} />
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="جوال الطلبات" className={inp} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان القائمة" className={inp} />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inp}>
              {['ريال يمني', 'دولار', 'ريال سعودي'].map((c) => <option key={c} className="bg-slate-900">{c}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-2">
          <h3 className="font-extrabold text-sm mb-1">📦 المنتجات والأسعار</h3>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] gap-2">
              <input value={it.name} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={`المنتج ${i + 1}`} className={inp} />
              <input inputMode="decimal" value={it.price} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, price: e.target.value.replace(/[^0-9.]/g, '') } : x))} placeholder="السعر" className={`${inp} text-center`} />
              <input value={it.unit} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} placeholder="الوحدة" className={`${inp} text-center`} />
              {items.length > 1 ? <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="w-9 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/30">✕</button> : <span className="w-9" />}
            </div>
          ))}
          <button onClick={() => { setItems([...items, { name: '', price: '', unit: '' }]); toast('➕ أُضيف سطر'); }}
            className="w-full py-2.5 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sm font-bold hover:bg-sky-500/30">➕ منتج آخر</button>
          <button onClick={save} disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-sky-500 to-blue-600 font-extrabold text-sm shadow-lg shadow-sky-500/30 disabled:opacity-40 hover:brightness-110">
            {busy ? '⏳ جارٍ الإنشاء...' : `📄 تنزيل القائمة PDF (${valid.length} منتج)`}
          </button>
        </div>
      </div>

      {/* المعاينة */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-bold text-white/50 mb-2 text-center">👁️ معاينة حية</p>
        <div ref={ref} dir="rtl" className="bg-white text-slate-800 rounded-xl p-6 mx-auto max-w-[500px] shadow-2xl" style={{ fontFamily: 'Cairo, sans-serif' }}>
          <div className="text-center border-b-2 border-sky-500 pb-4 mb-4">
            <div className="text-2xl font-black text-sky-700">{store || 'اسم المتجر'}</div>
            <div className="text-sm font-bold text-slate-500">{title}</div>
            {phone && <div className="text-xs text-slate-400 mt-1" dir="ltr">📱 {phone}</div>}
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-sky-50 text-sky-800">
              <th className="py-2 px-2 text-right rounded-r-lg">#</th>
              <th className="py-2 px-2 text-right">المنتج</th>
              <th className="py-2 px-2 rounded-l-lg">السعر</th>
            </tr></thead>
            <tbody>
              {valid.map((i, x) => (
                <tr key={x} className={x % 2 ? 'bg-slate-50' : ''}>
                  <td className="py-2 px-2 text-slate-400">{x + 1}</td>
                  <td className="py-2 px-2 font-bold">{i.name}{i.unit && <span className="text-xs text-slate-400 font-normal"> / {i.unit}</span>}</td>
                  <td className="py-2 px-2 text-center font-black text-sky-700">{fmtN(Number(i.price))} <span className="text-[10px] font-normal">{currency}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!valid.length && <p className="text-center text-slate-400 py-8 text-sm">أدخل منتجاتك لتظهر هنا 👈</p>}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
            {new Date().toLocaleDateString('ar-YE')} · ⚡ بواسطة منصة يمن زون — yemenzone1.com
          </div>
        </div>
      </div>
    </div>
  );
}
