'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { fileToDataUrl } from './pdfHelper';

// 📸 مزيل خلفيات المنتجات — ذكاء اصطناعي يعمل بالكامل داخل المتصفح (ONNX WASM)
export default function BgRemoverTool() {
  const [src, setSrc] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  const process = async (f: File) => {
    setSrc(await fileToDataUrl(f));
    setOut('');
    setBusy(true);
    setProgress('⏳ تحميل نموذج الذكاء الاصطناعي (أول مرة فقط — يحتاج إنترنت)...');
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      setProgress('🤖 الذكاء يحلّل الصورة ويزيل الخلفية...');
      const blob = await removeBackground(f, {
        progress: (_key: string, cur: number, total: number) => {
          if (total) setProgress(`🤖 جارٍ المعالجة... ${Math.round((cur / total) * 100)}%`);
        },
      });
      setOut(URL.createObjectURL(blob));
      toast('✨ أُزيلت الخلفية بنجاح!');
    } catch {
      toast('تعذّرت المعالجة — تأكد من الإنترنت أول مرة ثم أعد المحاولة', 'error');
    }
    setBusy(false);
    setProgress('');
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = out;
    a.download = 'منتج-بدون-خلفية.png';
    a.click();
    toast('✅ تم تنزيل الصورة PNG بخلفية شفافة');
  };

  return (
    <div className="space-y-5">
      {!src ? (
        <label className="block rounded-3xl border-2 border-dashed border-cyan-400/40 bg-cyan-400/5 p-12 text-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-400/10 transition-all">
          <div className="text-6xl mb-4">📸</div>
          <p className="font-extrabold text-lg mb-1">ارفع صورة منتجك</p>
          <p className="text-sm text-white/60">اسحب الصورة هنا أو انقر للاختيار — منتج على طاولة، بيدك، أي خلفية</p>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) process(f); }} />
        </label>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xs font-bold text-white/50 mb-2">📷 الأصل</p>
            <img src={src} className="rounded-2xl max-h-80 mx-auto" alt="الأصل" />
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xs font-bold text-white/50 mb-2">✨ النتيجة (خلفية شفافة)</p>
            {out ? (
              <img src={out} className="rounded-2xl max-h-80 mx-auto"
                style={{ background: 'repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%) 50%/24px 24px' }} alt="النتيجة" />
            ) : (
              <div className="grid place-items-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-cyan-400 animate-spin mx-auto mb-3" />
                  <p className="text-xs text-white/60">{progress}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {busy && progress && <p className="text-center text-sm text-cyan-300 font-bold animate-pulse">{progress}</p>}

      <div className="flex flex-wrap justify-center gap-3">
        {out && <button onClick={download} className="px-8 py-3 rounded-full bg-gradient-to-l from-cyan-500 to-blue-600 font-extrabold text-sm shadow-lg shadow-cyan-500/30 hover:brightness-110">⬇️ تنزيل PNG شفاف</button>}
        {src && !busy && (
          <label className="px-8 py-3 rounded-full bg-white/10 font-bold text-sm cursor-pointer hover:bg-white/20 transition-colors">
            🔄 صورة أخرى
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) process(f); }} />
          </label>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        {[['🔒 خصوصية كاملة', 'الذكاء يعمل داخل متصفحك — صورتك لا تُرفع لأي خادم'], ['⚡ نتيجة احترافية', 'حواف دقيقة حتى مع الشعر والزجاج'], ['🛍️ مثالي للمنتجات', 'صورة شفافة تدمجها مع أي خلفية في استوديو العروض']].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4"><b className="block mb-1">{t}</b><span className="text-white/60 leading-relaxed">{d}</span></div>
        ))}
      </div>
    </div>
  );
}
