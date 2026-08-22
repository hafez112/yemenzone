'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { shareCreate, shareUpdate } from '@/lib/tool-db';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, copyText, Empty, Field, inp, QrView, Stat, uid } from './shared/ui';

// 🎓 منشئ الاختبارات والشهادات — اصنع اختباراً برابط، يحلّه طلابك ويحصلون على شهادة فورية
interface Q { id: number; q: string; opts: string[]; correct: number }
interface Quiz { title: string; passPct: number; questions: Q[]; slug: string }

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

export default function QuizMakerTool() {
  const { data: quiz, setData: setQuiz } = useToolDB<Quiz>('quiz-maker', { title: '', passPct: 60, questions: [], slug: '' }, 'yz-quiz-v1');
  const [text, setText] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);

  const link = quiz.slug ? `${SITE()}/s/${quiz.slug}` : '';

  const addQ = () => {
    if (!text.trim() || opts.filter((o) => o.trim()).length < 2) { toast('✍️ اكتب السؤال وخيارين على الأقل', 'error'); return; }
    if (!opts[correct]?.trim()) { toast('⚠️ الإجابة الصحيحة فارغة — اختر خياراً مكتوباً', 'error'); return; }
    setQuiz({ ...quiz, questions: [...quiz.questions, { id: uid(), q: text.trim(), opts: opts.map((o) => o.trim()).filter(Boolean), correct: opts.slice(0, correct + 1).filter((o) => o.trim()).length - 1 }] });
    setText(''); setOpts(['', '', '', '']); setCorrect(0);
    toast('❓ أُضيف السؤال');
  };

  const publish = async () => {
    if (!quiz.title.trim() || quiz.questions.length < 1) { toast('✍️ أدخل العنوان وأضف سؤالاً واحداً على الأقل', 'error'); return; }
    setBusy(true);
    const payload = { title: quiz.title, passPct: quiz.passPct, questions: quiz.questions.map((q) => ({ q: q.q, opts: q.opts, correct: q.correct })) };
    try {
      if (quiz.slug) {
        await shareUpdate(quiz.slug, quiz.title, payload);
        toast('🔄 حُدّث الاختبار — الرابط نفسه');
      } else {
        const r = await shareCreate('quiz', quiz.title, payload);
        setQuiz({ ...quiz, slug: r.slug });
        toast('🎉 نُشر الاختبار! شارك رابطه مع طلابك');
      }
    } catch (e: any) { toast(e.message || 'تعذّر النشر', 'error'); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="❓" label="الأسئلة" value={quiz.questions.length} />
        <Stat icon="🎯" label="درجة النجاح" value={`${quiz.passPct}٪`} />
        <Stat icon={quiz.slug ? '🟢' : '⚪'} label="الحالة" value={quiz.slug ? 'منشور' : 'مسودة'} tone={quiz.slug ? 'text-lime-300' : 'text-white'} />
      </div>

      <div className={card + ' space-y-3'}>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><Field label="🎓 عنوان الاختبار"><input value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} placeholder="اختبار دورة التسويق — المستوى الأول" className={inp} /></Field></div>
          <Field label="🎯 النجاح من 100"><input inputMode="numeric" value={quiz.passPct} onChange={(e) => setQuiz({ ...quiz, passPct: Math.min(100, Math.max(10, Number(e.target.value.replace(/[^0-9]/g, '')) || 60)) })} className={inp} /></Field>
        </div>
      </div>

      {/* بناء سؤال */}
      <div className={card + ' space-y-3'}>
        <p className="text-sm font-extrabold">➕ سؤال جديد</p>
        <Field label="❓ نص السؤال"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="ما هي عاصمة اليمن؟" className={inp} /></Field>
        <div className="space-y-2">
          {opts.map((o, i) => (
            <div key={i} className="flex gap-2 items-center">
              <button type="button" onClick={() => setCorrect(i)} title="الإجابة الصحيحة"
                className={`w-9 h-9 rounded-xl grid place-items-center text-sm font-black shrink-0 transition ${correct === i ? 'bg-lime-500 text-white shadow-lg' : 'bg-white/10 text-white/40'}`}>
                {correct === i ? '✓' : ['أ', 'ب', 'ج', 'د'][i]}
              </button>
              <input value={o} onChange={(e) => setOpts(opts.map((x, z) => z === i ? e.target.value : x))} placeholder={`الخيار ${['أ', 'ب', 'ج', 'د'][i]}`} className={inp} />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/40">💡 اضغط حرف الخيار الصحيح ليصبح ✓ أخضر</p>
        <button onClick={addQ} className={btnP + ' w-full'}>➕ إضافة السؤال</button>
      </div>

      {/* الأسئلة المضافة */}
      {quiz.questions.length > 0 && (
        <div className="space-y-2">
          {quiz.questions.map((q, qi) => (
            <div key={q.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm flex-1">{qi + 1}. {q.q}</p>
                <button onClick={() => { setQuiz({ ...quiz, questions: quiz.questions.filter((x) => x.id !== q.id) }); toast('🗑️ حُذف السؤال'); }} className={btnD}>✕</button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {q.opts.map((o, i) => (
                  <span key={i} className={`text-[10px] font-bold px-2 py-1 rounded-full ${i === q.correct ? 'bg-lime-500/20 text-lime-300' : 'bg-white/5 text-white/50'}`}>{i === q.correct ? '✓ ' : ''}{o}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={publish} disabled={busy} className={btnP + ' w-full !py-3.5 text-base'}>
        {busy ? '⏳ جاري النشر...' : quiz.slug ? '🔄 تحديث الاختبار المنشور' : '🚀 نشر الاختبار والحصول على الرابط'}
      </button>

      {quiz.slug && (
        <div className={card + ' text-center space-y-3'}>
          <p className="text-sm font-extrabold text-lime-300">🎉 اختبارك مباشر — الطلاب يحلّون ويستلمون شهاداتهم فوراً</p>
          <div className="flex justify-center"><QrView data={link} size={170} color="#1D4ED8" /></div>
          <div className="flex gap-2">
            <input readOnly value={link} className={inp + ' text-center text-xs'} dir="ltr" onClick={(e) => (e.target as HTMLInputElement).select()} />
            <button onClick={() => copyText(link).then(() => toast('📋 نُسخ الرابط — أرسله لطلابك'))} className={btnS + ' shrink-0'}>📋 نسخ</button>
          </div>
          <a href={link} target="_blank" rel="noreferrer" className={btnS + ' block text-center'}>👁️ جرّب الاختبار كطالب</a>
        </div>
      )}

      {quiz.questions.length === 0 && <Empty icon="🎓" text="أضف أسئلتك ثم انشر — كل ناجح يحصل على شهادة PDF باسمه تلقائياً" />}
    </div>
  );
}
