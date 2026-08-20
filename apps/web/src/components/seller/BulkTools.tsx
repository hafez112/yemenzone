'use client';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

// 📦 أدوات المنتجات الجماعية — تصدير/استيراد CSV + تعديل جماعي للأسعار والمخزون
export default function BulkTools({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [adj, setAdj] = useState({ field: 'price', mode: 'percent', value: '', direction: 'increase', scope: 'all' });
  const fileRef = useRef<HTMLInputElement>(null);

  // 📤 تصدير CSV (يفتح في Excel — دعم عربي كامل)
  const exportCsv = async () => {
    setBusy(true);
    try {
      const rows = await api('/seller/products/export');
      const head = 'id,name,description,price,salePrice,stock,lowStockAt,category,isActive\n';
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const body = rows.map((r: any) => [r.id, r.name, r.description, r.price, r.salePrice, r.stock, r.lowStockAt, r.category, r.isActive].map(esc).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + head + body], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `منتجاتي-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast(`📤 صُدّرت ${rows.length} منتجاً — افتحه في Excel`);
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  // 📥 قراءة CSV وتحليله (يدعم علامات الاقتباس)
  const parseCsv = (text: string): any[] => {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const splitLine = (line: string) => {
      const out: string[] = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };
    const header = splitLine(lines[0]).map((h) => h.toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    return lines.slice(1).map((line) => {
      const c = splitLine(line);
      return {
        id: c[idx('id')] || undefined,
        name: c[idx('name')],
        description: idx('description') >= 0 ? c[idx('description')] : undefined,
        price: c[idx('price')],
        salePrice: c[idx('salePrice')],
        stock: c[idx('stock')],
        lowStockAt: c[idx('lowstockat')] || c[idx('lowstockat'.toLowerCase())],
        category: idx('category') >= 0 ? c[idx('category')] : '',
        isActive: idx('isactive') >= 0 ? c[idx('isactive')] : 'نعم',
      };
    }).filter((r) => r.name);
  };

  const importFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true); setReport(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) { toast('⚠️ الملف فارغ أو الصيغة غير صحيحة — استخدم ملف التصدير قالباً', 'error'); setBusy(false); return; }
      const r = await api('/seller/products/import', { method: 'POST', body: JSON.stringify({ rows }) });
      setReport(r);
      toast(`📥 اكتمل الاستيراد: ${r.created} جديد · ${r.updated} محدّث · ${r.skipped} متخطّى`);
      onDone();
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ⚡ التعديل الجماعي
  const runAdjust = async () => {
    if (!Number(adj.value)) return toast('⚠️ أدخل قيمة صحيحة', 'error');
    const dirAr = adj.direction === 'increase' ? 'زيادة' : 'تخفيض';
    const fieldAr = { price: 'الأسعار', salePrice: 'أسعار التخفيض', stock: 'المخزون' }[adj.field as string];
    if (!confirm(`${dirAr} ${fieldAr} بـ${adj.mode === 'percent' ? adj.value + '%' : adj.value + ' ر.ي'} — على ${adj.scope === 'all' ? 'كل المنتجات' : adj.scope === 'sale' ? 'المخفّضة فقط' : 'النافدة فقط'}؟`)) return;
    setBusy(true);
    try {
      const r = await api('/seller/products/bulk-adjust', { method: 'POST', body: JSON.stringify({ ...adj, value: Number(adj.value) }) });
      toast(`⚡ طُبّق على ${r.affected} منتجاً`);
      onDone();
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  return (
    <div className="glass rounded-3xl mb-4 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between font-extrabold text-sm">
        <span>📦 أدوات جماعية — تصدير · استيراد · تعديل بالجملة</span>
        <span className="text-gray-400 text-xs transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 anim-bounce-in">
          {/* تصدير/استيراد */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportCsv} disabled={busy}
              className="py-3 rounded-2xl text-white font-extrabold text-sm shadow-lg disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
              📤 تصدير Excel (CSV)
            </button>
            <label className="py-3 rounded-2xl font-extrabold text-sm text-center cursor-pointer text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}>
              📥 استيراد CSV
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden disabled={busy}
                onChange={(e) => importFile(e.target.files?.[0])} />
            </label>
          </div>
          <p className="text-[10px] text-gray-400">
            💡 صدّر منتجاتك أولاً لتحصل على قالب جاهز — عدّله في Excel ثم استورده. الصف بـ id يُحدَّث، وبدونه يُنشأ كمنتج جديد.
          </p>

          {/* تقرير الاستيراد */}
          {report && (
            <div className="bg-white/70 rounded-2xl p-3 anim-bounce-in">
              <div className="flex gap-3 text-xs font-black mb-1">
                <span className="text-emerald-600">✅ {report.created} جديد</span>
                <span className="text-blue-600">🔄 {report.updated} محدّث</span>
                <span className="text-gray-400">⏭️ {report.skipped} متخطّى</span>
              </div>
              {report.errors.slice(0, 5).map((e: string, i: number) => (
                <p key={i} className="text-[10px] text-red-500">• {e}</p>
              ))}
            </div>
          )}

          {/* ⚡ التعديل الجماعي */}
          <div className="bg-white/70 rounded-2xl p-3">
            <div className="text-xs font-black mb-2">⚡ تعديل جماعي سريع</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select value={adj.field} onChange={(e) => setAdj({ ...adj, field: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white outline-none">
                <option value="price">💰 الأسعار</option>
                <option value="salePrice">🔥 أسعار التخفيض</option>
                <option value="stock">📦 المخزون</option>
              </select>
              <select value={adj.direction} onChange={(e) => setAdj({ ...adj, direction: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white outline-none">
                <option value="increase">⬆️ زيادة</option>
                <option value="decrease">⬇️ تخفيض</option>
              </select>
              <select value={adj.mode} onChange={(e) => setAdj({ ...adj, mode: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white outline-none">
                <option value="percent">٪ نسبة مئوية</option>
                <option value="amount">💵 مبلغ ثابت</option>
              </select>
              <input type="number" min={0} step="any" value={adj.value} onChange={(e) => setAdj({ ...adj, value: e.target.value })}
                placeholder={adj.mode === 'percent' ? 'مثال: 10 (يعني 10%)' : 'مثال: 500 ر.ي'}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold outline-none" />
            </div>
            <div className="flex gap-2">
              <select value={adj.scope} onChange={(e) => setAdj({ ...adj, scope: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white outline-none">
                <option value="all">كل المنتجات النشطة</option>
                <option value="sale">المخفّضة فقط</option>
                <option value="outofstock">النافدة فقط</option>
              </select>
              <button onClick={runAdjust} disabled={busy}
                className="px-5 py-2 rounded-xl text-white text-xs font-extrabold shadow disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                ⚡ تطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
