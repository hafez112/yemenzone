'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { fileToDataUrl } from './pdfHelper';

// 🎨 استوديو تصاميم العروض — محرر كانفس كامل بمكتبة fabric.js
const TEMPLATES = [
  { name: 'خصم 50%', bg: ['#7C3AED', '#DB2777'], big: 'خصم 50%', small: 'لفترة محدودة 🔥', cta: 'اطلب الآن' },
  { name: 'وصل حديثاً', bg: ['#0891B2', '#1D4ED8'], big: 'وصل حديثاً ✨', small: 'تشكيلة جديدة كلياً', cta: 'تسوّق الآن' },
  { name: 'عرض الجمعة', bg: ['#059669', '#0D9488'], big: 'عرض الجمعة 🕌', small: 'أسعار خاصة اليوم فقط', cta: 'لا تفوّتها' },
  { name: 'شحن مجاني', bg: ['#D97706', '#DC2626'], big: 'شحن مجاني 🚚', small: 'للطلبات فوق 20,000', cta: 'اطلب الآن' },
] as const;

export default function DesignerTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(70);
  const [color, setColor] = useState('#FFFFFF');

  useEffect(() => {
    let c: any;
    (async () => {
      const fabric = await import('fabric');
      if (!canvasRef.current) return;
      c = new fabric.Canvas(canvasRef.current, { width: 1080, height: 1080, backgroundColor: '#1E1B4B', preserveObjectStacking: true });
      fabRef.current = c;
      applyTemplate(0);
      setReady(true);
    })();
    return () => { c?.dispose?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTemplate = async (i: number) => {
    const c = fabRef.current; if (!c) return;
    const fabric = await import('fabric');
    const t = TEMPLATES[i];
    c.clear();
    const grad = new fabric.Gradient({
      type: 'linear', gradientUnits: 'pixels',
      coords: { x1: 0, y1: 0, x2: 1080, y2: 1080 },
      colorStops: [{ offset: 0, color: t.bg[0] }, { offset: 1, color: t.bg[1] }],
    });
    c.backgroundColor = grad as any;
    const mk = (txt: string, top: number, size: number, weight = 900) => new fabric.Textbox(txt, {
      left: 540, top, originX: 'center', width: 960, textAlign: 'center',
      fontSize: size, fontWeight: weight, fill: '#ffffff', fontFamily: 'Cairo, sans-serif',
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,.35)', blur: 18, offsetY: 6 }),
    });
    c.add(mk(t.big, 360, 130));
    c.add(mk(t.small, 560, 52, 700));
    const btn = new fabric.Textbox(`  ${t.cta}  `, {
      left: 540, top: 700, originX: 'center', fontSize: 48, fontWeight: 800,
      fill: t.bg[0] as string, fontFamily: 'Cairo, sans-serif',
      backgroundColor: '#ffffff', textAlign: 'center',
    });
    c.add(btn);
    c.renderAll();
    toast(`✨ طُبّق قالب «${t.name}» — عدّل النصوص بالنقر عليها`);
  };

  const addText = async () => {
    const c = fabRef.current; if (!c || !text.trim()) return;
    const fabric = await import('fabric');
    c.add(new fabric.Textbox(text.trim(), {
      left: 540, top: 540, originX: 'center', width: 900, textAlign: 'center',
      fontSize, fontWeight: 800, fill: color, fontFamily: 'Cairo, sans-serif',
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,.3)', blur: 12, offsetY: 4 }),
    }));
    setText('');
    c.renderAll();
    toast('✍️ أُضيف النص — اسحبه وحرّكه بحرية');
  };

  const addImage = async (f: File) => {
    const c = fabRef.current; if (!c) return;
    const fabric = await import('fabric');
    const url = await fileToDataUrl(f);
    const img = await fabric.FabricImage.fromURL(url);
    img.scaleToWidth(500);
    img.set({ left: 540, top: 540, originX: 'center', originY: 'center' });
    c.add(img);
    c.renderAll();
    toast('🖼️ أُضيفت الصورة — اسحبها ودوّرها وكبّرها');
  };

  const exportPng = () => {
    const c = fabRef.current; if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL({ format: 'png', multiplier: 1 });
    a.download = 'تصميم-يمن-زون.png';
    a.click();
    toast('✅ تم تصدير التصميم PNG عالي الجودة');
  };

  return (
    <div className="space-y-4">
      {/* القوالب */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-extrabold text-sm mb-3">⚡ قوالب جاهزة — نقرة واحدة ثم عدّل</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => applyTemplate(i)}
              className="rounded-2xl p-3 text-white font-extrabold text-sm shadow-lg hover:scale-[1.03] transition-transform"
              style={{ background: `linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]})` }}>{t.name}</button>
          ))}
        </div>
      </div>

      {/* الكانفس */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-3 text-center overflow-x-auto">
        <div className="inline-block rounded-2xl overflow-hidden shadow-2xl" style={{ width: 'min(100%, 520px)' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: 'auto' }} />
        </div>
        <p className="text-[11px] text-white/50 mt-2">🖱️ انقر أي عنصر لتحريكه وتدويره وتكبيره · انقر مرتين على النص لتعديله · Delete للحذف</p>
      </div>

      {/* الأدوات */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="✍️ نص جديد (مثال: توصيل مجاني)" onKeyDown={(e) => e.key === 'Enter' && addText()}
            className="flex-1 bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-pink-400 placeholder:text-white/30" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-11 rounded-lg cursor-pointer bg-transparent" title="لون النص" />
          <button onClick={addText} className="px-4 rounded-xl bg-pink-600 font-bold text-sm hover:bg-pink-500">➕</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white/60">حجم الخط</span>
          <input type="range" min={24} max={200} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-1 accent-pink-500" />
          <b className="text-sm w-10 text-center">{fontSize}</b>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="px-4 py-2.5 rounded-xl bg-white/10 text-sm font-bold cursor-pointer hover:bg-white/20 transition-colors">
            🖼️ إضافة صورة منتجك
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); }} />
          </label>
          <button onClick={() => { const c = fabRef.current; const o = c?.getActiveObject(); if (o) { c.remove(o); c.renderAll(); toast('🗑️ حُذف العنصر'); } else toast('حدّد العنصر أولاً بالنقر عليه', 'error'); }}
            className="px-4 py-2.5 rounded-xl bg-red-500/15 text-red-300 text-sm font-bold hover:bg-red-500/30">🗑️ حذف المحدد</button>
          <button onClick={exportPng} disabled={!ready}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-pink-600 to-rose-600 text-sm font-extrabold shadow-lg shadow-pink-500/30 hover:brightness-110 disabled:opacity-40">⬇️ تصدير PNG</button>
        </div>
      </div>
    </div>
  );
}
