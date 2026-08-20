'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';

// 🌐 فاحص المواقع — تقرير صحة شامل (سرعة/SEO/أمان) عبر خادم يمن زون
export default function SiteCheckTool() {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<any>(null);

  const check = async () => {
    if (!url.trim()) { toast('🌐 أدخل رابط الموقع', 'error'); return; }
    setBusy(true); setR(null);
    try {
      const res = await api('/v1/tools/site-check', { method: 'POST', body: JSON.stringify({ url: url.trim() }) });
      setR(res);
      toast('✅ اكتمل الفحص');
    } catch (e: any) { toast(e.message || 'تعذّر الفحص', 'error'); }
    setBusy(false);
  };

  const gradeColor = (g: string) => g === 'ممتاز' ? 'text-emerald-300' : g === 'جيد' ? 'text-sky-300' : g === 'يحتاج تحسين' ? 'text-amber-300' : 'text-red-300';

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && check()}
            placeholder="example.com" dir="ltr"
            className="flex-1 bg-white/10 border border-white/15 rounded-xl py-3.5 px-4 text-sm font-bold outline-none focus:border-sky-400 placeholder:text-white/30 text-center" />
          <button onClick={check} disabled={busy}
            className="px-6 rounded-xl bg-gradient-to-l from-sky-600 to-cyan-600 font-extrabold text-sm shadow-lg shadow-sky-500/30 disabled:opacity-40 hover:brightness-110">
            {busy ? '⏳' : '🔍 افحص'}
          </button>
        </div>
        <p className="text-[11px] text-white/50 mt-2 text-center">يفحص: السرعة · SEO · التوافق مع الجوال · الأمان · الصور</p>
      </div>

      {busy && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-sky-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-sky-300">🌐 نزور الموقع ونحلّله...</p>
        </div>
      )}

      {r && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="relative w-32 h-32 mx-auto mb-3">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#g)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${r.score * 2.64} 264`} />
                <defs><linearGradient id="g"><stop offset="0%" stopColor="#38BDF8" /><stop offset="100%" stopColor="#8B5CF6" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div><p className="text-3xl font-black">{r.score}</p><p className={`text-xs font-bold ${gradeColor(r.grade)}`}>{r.grade}</p></div>
              </div>
            </div>
            <p className="text-xs text-white/60" dir="ltr">{r.url}</p>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
              <div className="rounded-xl bg-white/5 p-2.5"><p className="text-[10px] text-white/50 font-bold">الاستجابة</p><p className="font-black">{r.ms}ms</p></div>
              <div className="rounded-xl bg-white/5 p-2.5"><p className="text-[10px] text-white/50 font-bold">حجم الصفحة</p><p className="font-black">{r.sizeKB}KB</p></div>
              <div className="rounded-xl bg-white/5 p-2.5"><p className="text-[10px] text-white/50 font-bold">الصور</p><p className="font-black">{r.images}</p></div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-2">
            {r.checks.map((c: any, i: number) => (
              <div key={i} className={`rounded-xl p-3 flex gap-3 ${c.ok ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <span className="text-lg">{c.ok ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm">{c.label}</p>
                  {!c.ok && <p className="text-xs text-white/60 mt-0.5">💡 {c.tip}</p>}
                </div>
              </div>
            ))}
          </div>

          {r.score < 85 && (
            <div className="rounded-3xl border border-purple-400/30 bg-purple-400/10 p-6 text-center">
              <p className="font-extrabold text-lg mb-1">تريد موقعاً يسجّل 95+؟ 🚀</p>
              <p className="text-sm text-white/70 mb-4">متاجر يمن زون تأتي بسرعة وSEO وأمان مضبوطين مسبقاً — بلا برمجة ولا استضافة</p>
              <a href="/auth/seller-register" className="inline-block px-8 py-3 rounded-full bg-gradient-to-l from-purple-600 to-fuchsia-600 font-extrabold text-sm shadow-lg shadow-purple-500/30">أنشئ متجرك مجاناً</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
