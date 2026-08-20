'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';

interface Row { name: string; price: string; code: string }

// 🏷️ مولّد الباركود وملصقات الأسعار — ورقة A4 جاهزة للطابعة
export default function BarcodeTool() {
  const [rows, setRows] = useState<Row[]>([{ name: '', price: '', code: '' }]);
  const [format, setFormat] = useState<'CODE128' | 'EAN13'>('CODE128');
  const [store, setStore] = useState('');
  const svgRefs = useRef<Record<number, SVGSVGElement | null>>({});
  const printRef = useRef<HTMLDivElement>(null);

  const genCode = (i: number) => {
    const code = format === 'EAN13'
      ? String(Math.floor(1e11 + Math.random() * 9e11)).padStart(12, '0') // 12 رقم — الـ 13 يُحسب
      : String(Math.floor(1e7 + Math.random() * 9e7));
    setRows((r) => r.map((row, j) => j === i ? { ...row, code } : row));
    toast('🎲 وُلّد رقم باركود جديد');
  };

  useEffect(() => {
    (async () => {
      const { default: JsBarcode } = await import('jsbarcode');
      rows.forEach((r, i) => {
        const el = svgRefs.current[i];
        if (!el) return;
        const code = r.code.trim();
        try {
          if (format === 'EAN13' && !/^\d{12,13}$/.test(code)) { el.innerHTML = ''; return; }
          if (!code) { el.innerHTML = ''; return; }
          JsBarcode(el, code, { format, displayValue: true, fontSize: 14, height: 45, margin: 4, background: '#ffffff', lineColor: '#111827' });
        } catch { el.innerHTML = ''; }
      });
    })();
  }, [rows, format]);

  const print = () => {
    const valid = rows.filter((r) => r.code.trim());
    if (!valid.length) { toast('✍️ أدخل رقم باركود واحداً على الأقل', 'error'); return; }
    window.print();
    toast('🖨️ أُرسلت ورقة الملصقات للطابعة');
  };

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-amber-400 placeholder:text-white/30';

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3 print:hidden">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-white/60">اسم متجرك (يظهر على الملصق)
            <input value={store} onChange={(e) => setStore(e.target.value)} className={`${inp} mt-1`} placeholder="متجر النور" /></label>
          <label className="text-xs font-bold text-white/60">نوع الباركود
            <select value={format} onChange={(e) => setFormat(e.target.value as any)} className={`${inp} mt-1`}>
              <option value="CODE128" className="bg-slate-900">CODE128 — أرقام وحروف (الأشهر)</option>
              <option value="EAN13" className="bg-slate-900">EAN-13 — 13 رقماً (تجاري عالمي)</option>
            </select></label>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_1fr_auto_auto] gap-2 items-center">
            <input value={r.name} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="اسم المنتج" className={inp} />
            <input inputMode="decimal" value={r.price} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, price: e.target.value.replace(/[^0-9.]/g, '') } : x))} placeholder="السعر" className={`${inp} text-center`} />
            <input value={r.code} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, code: e.target.value } : x))} placeholder="رقم الباركود" className={`${inp} text-center`} dir="ltr" />
            <button onClick={() => genCode(i)} className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30" title="توليد رقم">🎲</button>
            {rows.length > 1 ? <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="w-10 h-10 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/30">✕</button> : <span className="w-10" />}
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={() => { setRows([...rows, { name: '', price: '', code: '' }]); toast('➕ أُضيف سطر منتج'); }}
            className="flex-1 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-sm font-bold hover:bg-amber-500/30">➕ منتج آخر</button>
          <button onClick={print} className="flex-1 py-2.5 rounded-xl bg-gradient-to-l from-amber-500 to-orange-600 text-sm font-extrabold shadow-lg shadow-amber-500/30 hover:brightness-110">🖨️ طباعة ورقة الملصقات</button>
        </div>
        <p className="text-[11px] text-white/50">🖨️ تُطبع الورقة بمقاس A4 — ملصقات جاهزة للقص واللصق. نصيحة: استخدم ورق ملصقات لاصق.</p>
      </div>

      {/* ورقة الملصقات */}
      <div ref={printRef} dir="rtl" className="print-root bg-white text-slate-800 rounded-xl p-4 print:rounded-none print:p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
          {rows.filter((r) => r.code.trim()).map((r, i) => (
            <div key={i} className="border border-dashed border-slate-300 rounded-lg p-2 text-center break-inside-avoid">
              {store && <div className="text-[10px] font-bold text-slate-500">{store}</div>}
              <div className="text-xs font-extrabold truncate">{r.name || 'منتج'}</div>
              <svg ref={(el) => { svgRefs.current[rows.indexOf(r)] = el; }} className="mx-auto max-w-full" />
              {r.price && <div className="text-sm font-black text-slate-900">{r.price} ريال</div>}
            </div>
          ))}
        </div>
        {!rows.some((r) => r.code.trim()) && <p className="text-center text-slate-400 py-10 text-sm">أدخل أرقام الباركود بالأعلى لتظهر الملصقات هنا 👆</p>}
      </div>
    </div>
  );
}
