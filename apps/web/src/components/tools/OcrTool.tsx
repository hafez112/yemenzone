'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { fileToDataUrl } from './pdfHelper';

// 🔍 ماسح الفواتير OCR — استخراج النص والمبالغ من صور المستندات (tesseract.js عربي/إنجليزي)
export default function OcrTool() {
  const [img, setImg] = useState('');
  const [text, setText] = useState('');
  const [amounts, setAmounts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);

  const scan = async (f: File) => {
    setImg(await fileToDataUrl(f));
    setText(''); setAmounts([]); setBusy(true); setProg(0);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['ara', 'eng'], 1, {
        logger: (m: any) => { if (m.status === 'recognizing text') setProg(Math.round(m.progress * 100)); },
      });
      const { data } = await worker.recognize(f);
      await worker.terminate();
      const t = data.text.trim();
      setText(t || '(لم يُعثر على نص واضح — جرّب صورة أوضح بإضاءة أفضل)');
      // استخراج المبالغ/الأرقام الكبيرة
      const nums = (t.match(/[0-9][0-9,.\s]{2,}[0-9]/g) || [])
        .map((s) => s.replace(/[,.\s]/g, '')).filter((s) => Number(s) >= 100);
      setAmounts([...new Set(nums)].sort((a, b) => Number(b) - Number(a)).slice(0, 8));
      toast('✅ استُخرج النص');
    } catch {
      toast('تعذّر المسح — تحتاج أول مرة إنترنت لتحميل نموذج اللغة', 'error');
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      {!img ? (
        <label className="block rounded-3xl border-2 border-dashed border-blue-400/40 bg-blue-400/5 p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-400/10 transition-all">
          <div className="text-6xl mb-4">🧾</div>
          <p className="font-extrabold text-lg mb-1">صوّر أو ارفع الفاتورة / المستند</p>
          <p className="text-sm text-white/60">فاتورة شراء، سند، وصل، كشف حساب — بأي لغة عربية أو إنجليزية</p>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) scan(f); }} />
        </label>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-3 text-center">
            <img src={img} className="rounded-2xl max-h-96 mx-auto" alt="المستند" />
            <label className="inline-block mt-3 px-5 py-2 rounded-xl bg-white/10 text-xs font-bold cursor-pointer hover:bg-white/20">
              🔄 صورة أخرى<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) scan(f); }} />
            </label>
          </div>
          <div className="space-y-3">
            {busy && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
                <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-blue-400 animate-spin mx-auto mb-2" />
                <p className="text-sm font-bold text-blue-300">🔍 يقرأ المستند... {prog}%</p>
              </div>
            )}
            {amounts.length > 0 && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
                <b className="text-sm block mb-2">💰 المبالغ المكتشفة (انقر للنسخ)</b>
                <div className="flex flex-wrap gap-2">
                  {amounts.map((a) => (
                    <button key={a} onClick={() => { navigator.clipboard.writeText(a); toast(`📋 نُسخ ${a}`); }}
                      className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-sm font-black hover:bg-amber-500/30" dir="ltr">{Number(a).toLocaleString()}</button>
                  ))}
                </div>
              </div>
            )}
            {text && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex justify-between items-center mb-2">
                  <b className="text-sm">📄 النص المستخرج</b>
                  <button onClick={() => { navigator.clipboard.writeText(text); toast('📋 نُسخ النص كاملاً'); }} className="px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-bold hover:bg-blue-500">📋 نسخ الكل</button>
                </div>
                <pre className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto bg-black/20 rounded-xl p-3">{text}</pre>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4 text-xs text-white/70 leading-relaxed">
        🔒 <b>خصوصية:</b> المسح يتم بالكامل داخل متصفحك — صور مستنداتك لا تُرفع لأي خادم. 💡 للنتيجة الأفضل: صوّر بإضاءة جيدة والمستند مستوٍ.
      </div>
    </div>
  );
}
