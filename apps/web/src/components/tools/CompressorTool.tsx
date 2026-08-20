'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { fmtN } from './pdfHelper';

interface Item { id: number; file: File; before: number; after?: number; url?: string; busy: boolean }

// 🗜️ ضاغط الصور الذكي — ضغط دفعي داخل المتصفح مع مقارنة قبل/بعد
export default function CompressorTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(0.7);
  const [maxW, setMaxW] = useState(1600);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const list: Item[] = [...items];
    for (const f of Array.from(files).slice(0, 12)) {
      if (!f.type.startsWith('image/')) continue;
      list.push({ id: Date.now() + Math.random(), file: f, before: f.size, busy: true });
    }
    setItems(list);
    const { default: imageCompression } = await import('browser-image-compression');
    for (const it of list.filter((i) => i.busy)) {
      try {
        const out = await imageCompression(it.file, { maxSizeMB: quality, maxWidthOrHeight: maxW, useWebWorker: true, initialQuality: 0.85 });
        setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, after: out.size, url: URL.createObjectURL(out), busy: false, file: new File([out], it.file.name.replace(/\.\w+$/, '.jpg'), { type: out.type }) } : x));
      } catch {
        setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, busy: false } : x));
        toast(`تعذّر ضغط ${it.file.name}`, 'error');
      }
    }
    toast('✅ اكتمل الضغط');
  };

  const dl = (it: Item) => {
    if (!it.url) return;
    const a = document.createElement('a');
    a.href = it.url; a.download = it.file.name; a.click();
    toast('⬇️ تم التنزيل');
  };

  const kb = (n: number) => n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`;
  const totalBefore = items.reduce((s, i) => s + i.before, 0);
  const totalAfter = items.reduce((s, i) => s + (i.after || 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1"><span className="text-white/60">🎯 الحجم المستهدف</span><span className="text-fuchsia-300">{quality}MB</span></div>
            <input type="range" min={0.1} max={2} step={0.1} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-fuchsia-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold mb-1"><span className="text-white/60">📏 أقصى عرض</span><span className="text-fuchsia-300">{maxW}px</span></div>
            <input type="range" min={800} max={3000} step={100} value={maxW} onChange={(e) => setMaxW(Number(e.target.value))} className="w-full accent-fuchsia-500" />
          </div>
        </div>
      </div>

      <label className="block rounded-3xl border-2 border-dashed border-fuchsia-400/40 bg-fuchsia-400/5 p-10 text-center cursor-pointer hover:border-fuchsia-400 hover:bg-fuchsia-400/10 transition-all">
        <div className="text-5xl mb-3">🗜️</div>
        <p className="font-extrabold mb-1">اسحب صورك هنا أو انقر للاختيار</p>
        <p className="text-xs text-white/60">حتى 12 صورة دفعة واحدة — تُعالج كلها في جهازك</p>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
      </label>

      {items.length > 0 && (
        <>
          <div className="rounded-2xl bg-gradient-to-l from-fuchsia-500/20 to-purple-600/10 border border-fuchsia-400/30 p-4 text-center text-sm font-bold">
            وفّرت <span className="text-fuchsia-300 font-black">{kb(totalBefore - totalAfter)}</span> — من {kb(totalBefore)} إلى {kb(totalAfter)} ({totalBefore ? Math.round((1 - totalAfter / totalBefore) * 100) : 0}% أصغر 🎉)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                {it.url ? <img src={it.url} className="rounded-xl w-full h-28 object-cover mb-2" alt="" /> : (
                  <div className="h-28 grid place-items-center"><div className="w-8 h-8 rounded-full border-4 border-white/10 border-t-fuchsia-400 animate-spin" /></div>
                )}
                <p className="text-xs font-bold truncate">{it.file.name}</p>
                {it.after ? (
                  <>
                    <p className="text-[11px] text-white/60">{kb(it.before)} ← <b className="text-fuchsia-300">{kb(it.after)}</b></p>
                    <button onClick={() => dl(it)} className="mt-2 w-full py-2 rounded-lg bg-fuchsia-600 text-xs font-bold hover:bg-fuchsia-500">⬇️ تنزيل</button>
                  </>
                ) : !it.busy && <p className="text-[11px] text-red-400">تعذّر</p>}
              </div>
            ))}
          </div>
          <button onClick={() => { setItems([]); toast('🗑️ أُفرغت القائمة'); }} className="w-full py-2.5 rounded-xl bg-white/10 text-sm font-bold hover:bg-white/20">🗑️ مسح الكل</button>
        </>
      )}

      <p className="text-center text-[11px] text-white/50">💡 صور أخف = متجر أسرع = مبيعات أكثر. اضغط صور منتجاتك هنا ثم ارفعها لمتجرك في يمن زون</p>
    </div>
  );
}
