'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { shareGet, shareVote, type SharedDoc } from '@/lib/tool-db';
import { elementToPdf } from '@/components/tools/pdfHelper';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

// 📢 صفحة العرض العامة للمستندات المشتركة — منيو / اختبار / استطلاع / فعالية
// تعمل بدون تسجيل دخول — يراها كل من يملك الرابط

const GRAD: Record<string, string> = {
  menu: 'linear-gradient(160deg, #1a0f05 0%, #2d1a08 50%, #1f1206 100%)',
  quiz: 'linear-gradient(160deg, #0a0f1e 0%, #101c3a 50%, #0c1428 100%)',
  poll: 'linear-gradient(160deg, #0d0a1e 0%, #1c1038 50%, #140c26 100%)',
  ticket: 'linear-gradient(160deg, #041a12 0%, #0a2e1e 50%, #072014 100%)',
};
const ACCENT: Record<string, string> = { menu: '#F59E0B', quiz: '#60A5FA', poll: '#A78BFA', ticket: '#34D399' };

export default function SharedPage() {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<SharedDoc | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'bad'>('loading');

  useEffect(() => {
    shareGet(slug).then((d) => { setDoc(d); setState(d ? 'ok' : 'bad'); });
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center text-white" dir="rtl" style={{ background: GRAD.menu }}>
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-amber-400 animate-spin" />
      </div>
    );
  }

  if (state === 'bad' || !doc) {
    return (
      <div className="min-h-screen grid place-items-center text-white px-6" dir="rtl" style={{ background: GRAD.menu }}>
        <div className="text-center">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-xl font-black mb-2">الرابط غير موجود</h1>
          <p className="text-white/50 text-sm">ربما حُذف المحتوى أو كُتب الرابط ناقصاً</p>
          <a href="/" className="inline-block mt-5 px-6 py-2.5 rounded-full bg-white/10 text-sm font-bold">⚡ منصة يمن زون</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" dir="rtl" style={{ background: GRAD[doc.type] || GRAD.menu }}>
      <main className="max-w-md mx-auto px-5 pt-10 pb-12">
        {doc.type === 'menu' && <MenuView doc={doc} />}
        {doc.type === 'quiz' && <QuizView doc={doc} />}
        {doc.type === 'poll' && <PollView doc={doc} onVoted={setDoc} />}
        {doc.type === 'ticket' && <TicketView doc={doc} />}
        <div className="text-center mt-10">
          <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold text-white/70 border border-white/15 bg-white/5">
            ⚡ عبر منصة يمن زون
          </a>
        </div>
      </main>
    </div>
  );
}

// 🍽️ منيو المطعم
function MenuView({ doc }: { doc: SharedDoc }) {
  const p = doc.payload || {};
  const cats: any[] = Array.isArray(p.cats) ? p.cats : [];
  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto rounded-[1.6rem] grid place-items-center text-4xl shadow-2xl mb-3 rotate-3" style={{ background: 'linear-gradient(135deg,#F59E0B,#DC2626)' }}>🍽️</div>
        <h1 className="text-2xl font-black">{p.name || doc.title}</h1>
        {p.note && <p className="text-white/55 text-xs mt-1.5">{p.note}</p>}
      </div>
      <div className="space-y-5">
        {cats.map((c, ci) => (
          <div key={ci}>
            <h2 className="text-sm font-black text-amber-300 mb-2 flex items-center gap-2"><span className="h-px flex-1 bg-white/10" />{c.name}<span className="h-px flex-1 bg-white/10" /></h2>
            <div className="space-y-2">
              {(c.items || []).map((it: any, ii: number) => (
                <div key={ii} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm">{it.name}</p>
                    {it.desc && <p className="text-[11px] text-white/45 mt-0.5">{it.desc}</p>}
                  </div>
                  <span className="font-black text-amber-300 text-sm shrink-0">{Number(it.price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {p.whatsapp && (
        <a href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(`السلام عليكم 🌹\nأريد الطلب من منيو ${p.name || ''}`)}`} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold mt-6 shadow-xl"
          style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
          💬 اطلب الآن واتساب
        </a>
      )}
    </div>
  );
}

// 🎓 الاختبار التفاعلي + الشهادة
function QuizView({ doc }: { doc: SharedDoc }) {
  const p = doc.payload || {};
  const qs: any[] = Array.isArray(p.questions) ? p.questions : [];
  const passPct = Number(p.passPct) || 60;
  const [name, setName] = useState('');
  const [step, setStep] = useState(-1); // -1 = شاشة البداية
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState(-1);
  const [done, setDone] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const score = answers.filter((a, i) => a === qs[i]?.correct).length;
  const pct = qs.length ? Math.round((score / qs.length) * 100) : 0;
  const passed = pct >= passPct;

  const answer = () => {
    if (picked < 0) return;
    const next = [...answers, picked];
    setAnswers(next); setPicked(-1);
    if (step + 1 >= qs.length) setDone(true);
    else setStep(step + 1);
  };

  const downloadCert = async () => {
    if (!certRef.current) return;
    toast('⏳ جاري تجهيز الشهادة...');
    try { await elementToPdf(certRef.current, `شهادة-${name}.pdf`); toast('🎓 نُزّلت الشهادة'); }
    catch { toast('تعذّر إنشاء PDF', 'error'); }
  };

  if (done) {
    return (
      <div className="text-center space-y-5">
        <div className="text-6xl">{passed ? '🎉' : '💪'}</div>
        <h1 className="text-2xl font-black">{passed ? 'مبروك — نجحت!' : 'حاول مجدداً'}</h1>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-4xl font-black text-sky-300">{pct}٪</p>
          <p className="text-xs text-white/50 mt-1">أجبت صحيحاً على {score} من {qs.length} — درجة النجاح {passPct}٪</p>
        </div>
        {passed && (
          <>
            <div ref={certRef} dir="rtl" className="bg-white text-gray-900 rounded-2xl p-6 text-center space-y-2">
              <p className="text-amber-500 text-3xl">🎓</p>
              <p className="text-xs text-gray-400 font-bold">شهادة إتمام</p>
              <p className="text-lg font-black text-stone-800">{name}</p>
              <p className="text-xs text-gray-600 leading-relaxed">أتم بنجاح اختبار «{p.title || doc.title}»<br />بدرجة {pct}٪ — بتاريخ {new Date().toLocaleDateString('ar-YE')}</p>
              <p className="text-[9px] text-gray-400 pt-2 border-t border-gray-100">منصة يمن زون ⚡</p>
            </div>
            <button onClick={downloadCert} className="w-full py-3.5 rounded-2xl font-extrabold shadow-xl" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>📄 تنزيل الشهادة PDF</button>
          </>
        )}
        <button onClick={() => { setStep(-1); setAnswers([]); setDone(false); }} className="w-full py-3 rounded-2xl font-bold bg-white/10 text-sm">🔁 إعادة الاختبار</button>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className="text-center space-y-5">
        <div className="w-20 h-20 mx-auto rounded-[1.6rem] grid place-items-center text-4xl shadow-2xl rotate-3" style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>🎓</div>
        <h1 className="text-2xl font-black">{p.title || doc.title}</h1>
        <p className="text-white/55 text-sm">{qs.length} سؤال — درجة النجاح {passPct}٪ — الناجح يحصل على شهادة فورية باسمه</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="✍️ اكتب اسمك الكامل (للشهادة)"
          className="w-full bg-white/10 border border-white/15 rounded-2xl py-3.5 px-4 text-center font-bold outline-none focus:border-sky-400 placeholder:text-white/30" />
        <button onClick={() => { if (!name.trim()) { toast('✍️ اكتب اسمك أولاً', 'error'); return; } setStep(0); }}
          className="w-full py-4 rounded-2xl font-extrabold shadow-xl" style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)' }}>
          🚀 ابدأ الاختبار
        </button>
      </div>
    );
  }

  const q = qs[step];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-l from-sky-400 to-blue-500 transition-all" style={{ width: `${(step / qs.length) * 100}%` }} />
        </div>
        <span className="text-xs font-black text-sky-300 shrink-0">{step + 1}/{qs.length}</span>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="font-extrabold text-base leading-relaxed">{q.q}</p>
      </div>
      <div className="space-y-2">
        {(q.opts || []).map((o: string, i: number) => (
          <button key={i} onClick={() => setPicked(i)}
            className={`w-full text-right rounded-2xl border p-3.5 text-sm font-bold transition-all ${picked === i ? 'border-sky-400 bg-sky-500/15 shadow-lg' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
            <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-white/10 text-xs ml-2">{['أ', 'ب', 'ج', 'د'][i]}</span> {o}
          </button>
        ))}
      </div>
      <button onClick={answer} disabled={picked < 0} className="w-full py-4 rounded-2xl font-extrabold shadow-xl disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)' }}>
        {step + 1 >= qs.length ? '🏁 إنهاء وعرض النتيجة' : '⬅️ السؤال التالي'}
      </button>
    </div>
  );
}

// 🗳️ الاستطلاع — صوت وشاهد النتائج
function PollView({ doc, onVoted }: { doc: SharedDoc; onVoted: (d: SharedDoc) => void }) {
  const p = doc.payload || {};
  const opts: any[] = Array.isArray(p.options) ? p.options : [];
  const [voted, setVoted] = useState<number>(typeof window !== 'undefined' ? Number(localStorage.getItem(`yz-voted-${doc.slug}`) ?? -1) : -1);
  const [busy, setBusy] = useState(false);
  const total = opts.reduce((s, o) => s + (Number(o.votes) || 0), 0);

  const vote = async (i: number) => {
    setBusy(true);
    try {
      const r = await shareVote(doc.slug, i);
      localStorage.setItem(`yz-voted-${doc.slug}`, String(i));
      setVoted(i);
      onVoted({ ...doc, payload: r.payload });
      toast('🗳️ سُجّل صوتك — شكراً لمشاركتك');
    } catch (e: any) { toast(e.message || 'تعذّر التصويت', 'error'); }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto rounded-[1.6rem] grid place-items-center text-4xl shadow-2xl mb-3 rotate-3" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}>🗳️</div>
        <h1 className="text-xl font-black leading-relaxed">{p.question || doc.title}</h1>
        <p className="text-white/45 text-xs mt-1.5">{total.toLocaleString()} صوت حتى الآن</p>
      </div>
      {voted < 0 ? (
        <div className="space-y-2">
          {opts.map((o, i) => (
            <button key={i} onClick={() => vote(i)} disabled={busy}
              className="w-full text-right rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-400/40 p-4 text-sm font-bold transition-all disabled:opacity-50">
              {o.text}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {opts.map((o, i) => {
            const v = Number(o.votes) || 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            return (
              <div key={i} className={`rounded-2xl border p-3.5 ${i === voted ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex justify-between text-sm font-bold mb-1.5">
                  <span>{o.text} {i === voted && <span className="text-violet-300">✓ صوتك</span>}</span>
                  <span className="text-violet-300">{pct}٪</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-l from-violet-400 to-purple-600 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-white/40 mt-1">{v.toLocaleString()} صوت</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 🎫 صفحة الفعالية
function TicketView({ doc }: { doc: SharedDoc }) {
  const { list } = useCurrency();
  const csym = (code?: string) => list.find((c) => c.code === String(code || 'YER').toUpperCase())?.symbol || code || 'ر.ي';
  const p = doc.payload || {};
  return (
    <div className="text-center space-y-5">
      <div className="w-24 h-24 mx-auto rounded-[1.8rem] grid place-items-center text-5xl shadow-2xl rotate-3" style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>🎪</div>
      <div>
        <h1 className="text-2xl font-black leading-tight">{p.name || doc.title}</h1>
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {p.date && <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/10">📅 {new Date(p.date).toLocaleString('ar-YE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>}
          {p.place && <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/10">📍 {p.place}</span>}
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-white/50 text-xs mb-1">سعر التذكرة</p>
        <p className="text-3xl font-black text-emerald-300">{Number(p.price) > 0 ? `${Number(p.price).toLocaleString()} ${csym(p.currency)}` : 'مجانية 🎉'}</p>
      </div>
      {p.whatsapp && (
        <a href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(`السلام عليكم 🌹\nأريد حجز تذكرة لفعالية: ${p.name || ''}`)}`} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold shadow-xl"
          style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
          🎫 احجز تذكرتك واتساب
        </a>
      )}
      <p className="text-[11px] text-white/40">🛡️ التذاكر تصدر بأكواد تحقق فريدة تُفحص عند البوابة</p>
    </div>
  );
}
