'use client';
import { useEffect, useState } from 'react';
import { toast } from '@/components/Toast';
import { shareCreate, shareMine, type SharedDoc } from '@/lib/tool-db';
import { btnD, btnP, btnS, card, copyText, Empty, Field, inp, QrView, Stat } from './shared/ui';

// 🗳️ صانع الاستطلاعات — سؤال برابط عام، أصوات حقيقية ونتائج حية
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

export default function PollsTool() {
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const [busy, setBusy] = useState(false);
  const [polls, setPolls] = useState<SharedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    shareMine().then((docs) => { setPolls(docs.filter((d) => d.type === 'poll')); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const publish = async () => {
    const clean = opts.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) { toast('✍️ اكتب السؤال وخيارين على الأقل', 'error'); return; }
    setBusy(true);
    try {
      await shareCreate('poll', question.trim(), { question: question.trim(), options: clean.map((t) => ({ text: t, votes: 0 })) });
      setQuestion(''); setOpts(['', '']);
      toast('🎉 نُشر الاستطلاع — شارك رابطه واجمع الأصوات');
      load();
    } catch (e: any) { toast(e.message || 'تعذّر النشر', 'error'); }
    setBusy(false);
  };

  const totalVotes = polls.reduce((s, p) => s + ((p.payload?.options || []).reduce((x: number, o: any) => x + (Number(o.votes) || 0), 0)), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon="🗳️" label="استطلاعاتي" value={polls.length} />
        <Stat icon="📊" label="إجمالي الأصوات" value={totalVotes} tone="text-violet-300" />
      </div>

      <div className={card + ' space-y-3'}>
        <p className="text-sm font-extrabold">➕ استطلاع جديد</p>
        <Field label="❓ السؤال"><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="أي منتج ننزّل الأسبوع القادم؟" className={inp} /></Field>
        <div className="space-y-2">
          {opts.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input value={o} onChange={(e) => setOpts(opts.map((x, z) => z === i ? e.target.value : x))} placeholder={`الخيار ${i + 1}`} className={inp} />
              {opts.length > 2 && <button onClick={() => setOpts(opts.filter((_, z) => z !== i))} className={btnD}>✕</button>}
            </div>
          ))}
        </div>
        {opts.length < 6 && <button onClick={() => setOpts([...opts, ''])} className={btnS}>➕ خيار آخر</button>}
        <button onClick={publish} disabled={busy} className={btnP + ' w-full !py-3.5'}>{busy ? '⏳ جاري النشر...' : '🚀 نشر الاستطلاع'}</button>
      </div>

      {!loading && polls.length === 0 && <Empty icon="🗳️" text="لا استطلاعات بعد — اسأل جمهورك وشاهد النتائج حية" />}

      <div className="space-y-3">
        {polls.map((p) => {
          const options: any[] = p.payload?.options || [];
          const total = options.reduce((s, o) => s + (Number(o.votes) || 0), 0);
          const link = `${SITE()}/s/${p.slug}`;
          return (
            <div key={p.slug} className={card + ' space-y-3'}>
              <p className="font-extrabold text-sm leading-relaxed">🗳️ {p.payload?.question || p.title}</p>
              <div className="space-y-2">
                {options.map((o, i) => {
                  const v = Number(o.votes) || 0;
                  const pct = total ? Math.round((v / total) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] font-bold mb-1"><span>{o.text}</span><span className="text-violet-300">{v} ({pct}٪)</span></div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-l from-violet-400 to-purple-600 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/40">📊 {total.toLocaleString()} صوت · 👁️ {p.views} مشاهدة</p>
              <div className="flex items-center gap-3">
                <QrView data={link} size={90} color="#6D28D9" />
                <div className="flex-1 space-y-1.5">
                  <button onClick={() => copyText(link).then(() => toast('📋 نُسخ رابط الاستطلاع'))} className={btnS + ' w-full'}>📋 نسخ الرابط</button>
                  <a href={link} target="_blank" rel="noreferrer" className={btnS + ' block text-center'}>👁️ فتح</a>
                  <button onClick={load} className={btnS + ' w-full'}>🔄 تحديث النتائج</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
