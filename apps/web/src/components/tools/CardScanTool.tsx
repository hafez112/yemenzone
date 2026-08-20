'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { fileToDataUrl } from './pdfHelper';

// 📇 ماسح البطاقات بالحجم الحقيقي — PDF ورقة A4 تُطبع فيها البطاقة بمقاسها الطبيعي بالملم
const DOCTYPES = [
  { id: 'id', name: 'بطاقة شخصية / بنكية / رخصة', w: 85.6, h: 53.98 },
  { id: 'passport', name: 'جواز سفر', w: 125, h: 88 },
  { id: 'a5', name: 'مستند A5', w: 148, h: 210 },
  { id: 'custom', name: 'مقاس مخصص', w: 0, h: 0 },
] as const;

const MODES = [
  { id: 1, name: 'نسخة واحدة', icon: '🪪' },
  { id: 2, name: 'نسختان (وجه وظهر)', icon: '🪪🪪' },
  { id: 4, name: '4 نسخ (للمعاملات)', icon: '×4' },
] as const;

interface Crop { x: number; y: number; w: number; h: number } // نسب 0..1 من الصورة

export default function CardScanTool() {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  const [docType, setDocType] = useState<(typeof DOCTYPES)[number]['id']>('id');
  const [customW, setCustomW] = useState('90');
  const [customH, setCustomH] = useState('55');
  const [mode, setMode] = useState<1 | 2 | 4>(1);
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(110);
  const [bw, setBw] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ kind: string; sx: number; sy: number; orig: Crop } | null>(null);

  const dims = docType === 'custom'
    ? { w: Math.max(10, Number(customW) || 90), h: Math.max(10, Number(customH) || 55) }
    : { w: DOCTYPES.find((d) => d.id === docType)!.w, h: DOCTYPES.find((d) => d.id === docType)!.h };

  const load = async (f: File) => {
    const url = await fileToDataUrl(f);
    const el = new Image();
    el.onload = () => { setImg(el); setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 }); toast('📷 حدّد إطار البطاقة بسحب الزوايا'); };
    el.src = url;
  };

  // رسم المعاينة مع إطار القص
  useEffect(() => {
    const cv = previewRef.current, box = boxRef.current;
    if (!cv || !img || !box) return;
    const bwPx = box.clientWidth;
    const scale = bwPx / img.width;
    cv.width = bwPx;
    cv.height = img.height * scale;
    const ctx = cv.getContext('2d')!;
    ctx.filter = `brightness(${bright}%) contrast(${contrast}%)${bw ? ' grayscale(100%)' : ''}`;
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    ctx.filter = 'none';
    // تعتيم خارج الإطار
    const r = { x: crop.x * cv.width, y: crop.y * cv.height, w: crop.w * cv.width, h: crop.h * cv.height };
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, cv.width, r.y);
    ctx.fillRect(0, r.y + r.h, cv.width, cv.height - r.y - r.h);
    ctx.fillRect(0, r.y, r.x, r.h);
    ctx.fillRect(r.x + r.w, r.y, cv.width - r.x - r.w, r.h);
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([]);
    // مقابض الزوايا
    ctx.fillStyle = '#F43F5E';
    for (const [cx, cy] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
  }, [img, crop, bright, contrast, bw]);

  // سحب المقابض/الإطار باللمس أو الماوس
  const pos = (e: any) => {
    const cv = previewRef.current!;
    const rect = cv.getBoundingClientRect();
    const p = e.touches?.[0] || e;
    return { x: (p.clientX - rect.left) / rect.width, y: (p.clientY - rect.top) / rect.height };
  };
  const down = (e: any) => {
    if (!img) return;
    const p = pos(e);
    const corners: [string, number, number][] = [
      ['nw', crop.x, crop.y], ['ne', crop.x + crop.w, crop.y],
      ['sw', crop.x, crop.y + crop.h], ['se', crop.x + crop.w, crop.y + crop.h],
    ];
    for (const [k, cx, cy] of corners) {
      if (Math.hypot(p.x - cx, p.y - cy) < 0.05) { dragRef.current = { kind: k, sx: p.x, sy: p.y, orig: { ...crop } }; return; }
    }
    if (p.x > crop.x && p.x < crop.x + crop.w && p.y > crop.y && p.y < crop.y + crop.h) {
      dragRef.current = { kind: 'move', sx: p.x, sy: p.y, orig: { ...crop } };
    }
  };
  const move = (e: any) => {
    const d = dragRef.current; if (!d) return;
    e.preventDefault?.();
    const p = pos(e);
    const dx = p.x - d.sx, dy = p.y - d.sy;
    const o = d.orig;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    let c = { ...o };
    if (d.kind === 'move') {
      c.x = clamp(o.x + dx, 0, 1 - o.w);
      c.y = clamp(o.y + dy, 0, 1 - o.h);
    } else {
      if (d.kind.includes('w')) { c.x = clamp(o.x + dx, 0, o.x + o.w - 0.05); c.w = o.x + o.w - c.x; }
      if (d.kind.includes('e')) { c.w = clamp(o.w + dx, 0.05, 1 - o.x); }
      if (d.kind.includes('n')) { c.y = clamp(o.y + dy, 0, o.y + o.h - 0.05); c.h = o.y + o.h - c.y; }
      if (d.kind.includes('s')) { c.h = clamp(o.h + dy, 0.05, 1 - o.y); }
    }
    setCrop(c);
  };
  const up = () => { dragRef.current = null; };

  // 🖨️ توليد PDF بالمقاس الحقيقي
  const generate = async () => {
    if (!img) return;
    setBusy(true);
    try {
      // قصّ المقطع بدقة عالية
      const srcW = img.width * crop.w, srcH = img.height * crop.h;
      const pxPerMm = 300 / 25.4; // 300 DPI
      const outW = Math.round(dims.w * pxPerMm), outH = Math.round(dims.h * pxPerMm);
      const cv = document.createElement('canvas');
      cv.width = outW; cv.height = outH;
      const ctx = cv.getContext('2d')!;
      ctx.filter = `brightness(${bright}%) contrast(${contrast}%)${bw ? ' grayscale(100%)' : ''}`;
      ctx.drawImage(img, img.width * crop.x, img.height * crop.y, srcW, srcH, 0, 0, outW, outH);
      const data = cv.toDataURL('image/jpeg', 0.93);

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const PW = 210, PH = 297;
      // مواضع النسخ (وسط الصفحة أفقياً، تبدأ من 30مم)
      const positions: [number, number][] = [];
      if (mode === 1) positions.push([(PW - dims.w) / 2, 40]);
      if (mode === 2) positions.push([(PW - dims.w) / 2, 40], [(PW - dims.w) / 2, 40 + dims.h + 15]);
      if (mode === 4) {
        const gx = (PW - dims.w * 2 - 10) / 2;
        positions.push([gx, 35], [gx + dims.w + 10, 35], [gx, 35 + dims.h + 12], [gx + dims.w + 10, 35 + dims.h + 12]);
      }
      for (const [x, y] of positions) {
        pdf.addImage(data, 'JPEG', x, y, dims.w, dims.h);
        pdf.setDrawColor(150); pdf.setLineDashPattern([2, 2], 0);
        pdf.rect(x - 1, y - 1, dims.w + 2, dims.h + 2); // إطار قصّ
      }
      // 📏 مسطرة تحقق 5 سم
      const ry = PH - 35;
      pdf.setLineDashPattern([], 0);
      pdf.setDrawColor(30); pdf.setLineWidth(0.4);
      pdf.line(20, ry, 70, ry);
      for (let i = 0; i <= 50; i += 5) pdf.line(20 + i, ry, 20 + i, ry - (i % 10 === 0 ? 4 : 2.5));
      pdf.setFontSize(9); pdf.setTextColor(60);
      pdf.text('Ruler check: this line = 5 cm exactly. If not, print at Actual size (100%).', 20, ry + 5);
      pdf.text(`${DOCTYPES.find((d) => d.id === docType)?.name || ''} — ${dims.w} x ${dims.h} mm`, 20, ry + 10);
      pdf.setFontSize(8); pdf.setTextColor(150);
      pdf.text('YemenZone tools - yemenzone1.com', PW / 2, PH - 8, { align: 'center' });

      pdf.save('بطاقة-بالحجم-الحقيقي.pdf');
      toast('✅ نزّل PDF — اطبع بخيار «الحجم الفعلي 100%» وليس «ملاءمة الصفحة»');
    } catch { toast('تعذّر إنشاء الملف', 'error'); }
    setBusy(false);
  };

  const inp = 'bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-rose-400 placeholder:text-white/30';

  return (
    <div className="space-y-4">
      {!img ? (
        <label className="block rounded-3xl border-2 border-dashed border-rose-400/40 bg-rose-400/5 p-12 text-center cursor-pointer hover:border-rose-400 hover:bg-rose-400/10 transition-all">
          <div className="text-6xl mb-4">🪪</div>
          <p className="font-extrabold text-lg mb-1">صوّر أو ارفع البطاقة / المستند</p>
          <p className="text-sm text-white/60">بطاقة شخصية · جواز · رخصة · أي مستند — بإضاءة جيدة ومن الأعلى مباشرة</p>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); }} />
        </label>
      ) : (
        <>
          <div ref={boxRef} className="rounded-3xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold text-white/50 mb-2 text-center">✂️ اسحب الزوايا الحمراء لتحديد البطاقة بدقة</p>
            <canvas ref={previewRef} className="w-full rounded-xl touch-none select-none cursor-move"
              onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
              onTouchStart={down} onTouchMove={move} onTouchEnd={up} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div>
              <span className="text-xs font-bold text-white/60 block mb-1.5">📋 نوع المستند (يحدد المقاس الحقيقي)</span>
              <div className="grid grid-cols-2 gap-2">
                {DOCTYPES.map((d) => (
                  <button key={d.id} onClick={() => setDocType(d.id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${docType === d.id ? 'bg-gradient-to-l from-rose-600 to-red-600 shadow-lg' : 'bg-white/10 text-white/70'}`}>
                    {d.name}{d.w > 0 && <span className="block text-[10px] opacity-70" dir="ltr">{d.w}×{d.h}mm</span>}
                  </button>
                ))}
              </div>
              {docType === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="text-xs font-bold text-white/60">العرض الحقيقي (ملم)<input inputMode="decimal" value={customW} onChange={(e) => setCustomW(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1 w-full text-center`} /></label>
                  <label className="text-xs font-bold text-white/60">الطول الحقيقي (ملم)<input inputMode="decimal" value={customH} onChange={(e) => setCustomH(e.target.value.replace(/[^0-9.]/g, ''))} className={`${inp} mt-1 w-full text-center`} /></label>
                </div>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-white/60 block mb-1.5">🖨️ عدد النسخ في ورقة A4</span>
              <div className="flex gap-2">
                {MODES.map((m) => (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${mode === m.id ? 'bg-gradient-to-l from-rose-600 to-red-600' : 'bg-white/10 text-white/70'}`}>{m.icon} {m.name}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="flex justify-between text-xs font-bold mb-1"><span className="text-white/60">☀️ الإضاءة</span><span>{bright}%</span></div>
                <input type="range" min={50} max={170} value={bright} onChange={(e) => setBright(Number(e.target.value))} className="w-full accent-rose-500" /></div>
              <div><div className="flex justify-between text-xs font-bold mb-1"><span className="text-white/60">◐ الوضوح</span><span>{contrast}%</span></div>
                <input type="range" min={50} max={200} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-rose-500" /></div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={bw} onChange={(e) => setBw(e.target.checked)} className="w-4 h-4 accent-rose-500" />
              <span className="font-bold text-sm">⚫ أبيض وأسود رسمي (للمستندات)</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={generate} disabled={busy}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-l from-rose-600 to-red-600 font-extrabold text-sm shadow-lg shadow-rose-500/30 disabled:opacity-40 hover:brightness-110">
              {busy ? '⏳ جارٍ التوليد...' : '📄 توليد PDF بالحجم الحقيقي'}
            </button>
            <label className="px-5 rounded-2xl bg-white/10 font-bold text-sm cursor-pointer hover:bg-white/20 grid place-items-center">
              🔄<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); }} />
            </label>
          </div>

          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 text-xs text-white/70 leading-relaxed">
            📏 <b>ضمان المقاس:</b> الورقة تحمل مسطرة تحقق 5 سم — بعد الطباعة قِسها بأي مسطرة: إن كانت 5 سم بالضبط فبطاقتك مطبوعة بحجمها الطبيعي ({dims.w}×{dims.h} ملم). إن اختلفت، أعد الطباعة بخيار <b>«الحجم الفعلي / Actual size 100%»</b>.
          </div>
        </>
      )}
    </div>
  );
}
