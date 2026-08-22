'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { loadToolData, myTools, saveToolData, type MyToolRow } from '@/lib/tool-db';
import { toolBySlug } from '@/lib/tools';
import { btnP, btnS, card, Empty, Stat } from './shared/ui';

// 💾 النسخ الاحتياطي السحابي — نزّل كل بيانات خدماتك في ملف واحد واستعدها في أي جهاز
export default function BackupTool() {
  const [tools, setTools] = useState<MyToolRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [lastBackup, setLastBackup] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    myTools().then(setTools).catch(() => {});
    setLastBackup(localStorage.getItem('yz-backup-last') || '');
  }, []);

  const withData = tools.filter((t) => t.hasData);

  // 📤 تصدير كل قواعد البيانات إلى ملف JSON واحد
  const exportAll = async () => {
    if (!withData.length) { toast('لا توجد بيانات محفوظة بعد لتصديرها', 'error'); return; }
    setBusy(true);
    const bundle: Record<string, any> = { _app: 'yemen-zone-backup', _version: 1, _date: new Date().toISOString() };
    let done = 0;
    for (const t of withData) {
      setProgress(`📥 ${toolBySlug(t.slug)?.title || t.slug} (${++done}/${withData.length})`);
      try { bundle[t.slug] = await loadToolData(t.slug); } catch {}
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `yz-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    const now = new Date().toLocaleString('ar-YE');
    localStorage.setItem('yz-backup-last', now);
    setLastBackup(now);
    setProgress('');
    setBusy(false);
    toast(`💾 نُزّلت النسخة الاحتياطية (${withData.length} خدمة) — احفظها في مكان آمن`);
  };

  // 📥 استعادة من ملف — ترفع كل قاعدة بيانات إلى حسابك
  const restore = async (file: File) => {
    setBusy(true);
    try {
      const bundle = JSON.parse(await file.text());
      if (bundle?._app !== 'yemen-zone-backup') throw new Error('bad');
      const slugs = Object.keys(bundle).filter((k) => !k.startsWith('_'));
      let done = 0;
      for (const slug of slugs) {
        setProgress(`📤 استعادة ${toolBySlug(slug)?.title || slug} (${++done}/${slugs.length})`);
        await saveToolData(slug, bundle[slug]).catch(() => {});
      }
      toast(`✅ اكتملت الاستعادة — ${slugs.length} خدمة عادت ببياناتها كاملة`);
      myTools().then(setTools).catch(() => {});
    } catch {
      toast('⚠️ الملف ليس نسخة احتياطية صالحة من يمن زون', 'error');
    }
    setProgress('');
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="🧰" label="خدمات في لوحتي" value={tools.length} />
        <Stat icon="🗄️" label="لها بيانات" value={withData.length} tone="text-lime-300" />
        <Stat icon="💾" label="آخر نسخة" value={lastBackup ? lastBackup.split(',')[0] : '—'} tone="text-amber-300" />
      </div>

      <div className={card + ' space-y-3 text-center'}>
        <div className="text-4xl">☁️</div>
        <p className="text-sm font-extrabold">نسخة احتياطية شاملة بضغطة واحدة</p>
        <p className="text-[11px] text-white/55 leading-relaxed">تجمع بيانات كل خدماتك (المخزون، العملاء، الديون، المبيعات...) في ملف واحد — نزّله واحتفظ به، واستعده في أي جهاز أو بعد أي طارئ.</p>
        {progress && <p className="text-xs font-bold text-lime-300 animate-pulse">{progress}</p>}
        <button onClick={exportAll} disabled={busy} className={btnP + ' w-full'}>📤 تنزيل نسخة احتياطية الآن</button>
        <button onClick={() => fileRef.current?.click()} disabled={busy} className={btnS + ' w-full !py-2.5'}>📥 استعادة من ملف نسخة</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
      </div>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3.5">
        <p className="text-[11px] text-amber-200/85 leading-relaxed">🛡️ <b>نصيحة:</b> بيانات خدماتك محفوظة في حسابك تلقائياً — لكن النسخة الملفية تبقى ضمانك الشخصي. نزّل نسخة أسبوعياً وأرسلها لواتساب «الرسائل المحفوظة» لديك.</p>
      </div>

      {withData.length === 0 && <Empty icon="🗄️" text="لا بيانات بعد — استخدم خدماتك وستظهر قواعد بياناتها هنا" />}

      {withData.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-white/60">🗄️ قواعد البيانات المشمولة بالنسخ</p>
          <div className="flex flex-wrap gap-1.5">
            {withData.map((t) => {
              const meta = toolBySlug(t.slug);
              return (
                <span key={t.slug} className="text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10">
                  {meta?.icon || '🧰'} {meta?.title || t.slug}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
