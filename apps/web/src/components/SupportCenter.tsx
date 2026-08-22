'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

// 🎧 مركز الدعم الفني الموحّد — يعمل للعميل (/customer/support) والبائع (/seller/support)
// تذاكر بمحادثة كاملة + رد آلي ذكي خارج الدوام + مسار متابعة الاقتراحات

const CATS = [
  { id: 'support', icon: '🛠️', label: 'دعم فني', hint: 'مشكلة تواجهك في المنصة' },
  { id: 'inquiry', icon: '❓', label: 'استفسار', hint: 'سؤال عن خدمة أو ميزة' },
  { id: 'suggestion', icon: '💡', label: 'اقتراح', hint: 'فكرة تطوّر يمن زون' },
  { id: 'complaint', icon: '⚖️', label: 'بلاغ', hint: 'إساءة أو مخالفة' },
] as const;

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: '⏳ بانتظار الرد', cls: 'bg-amber-100 text-amber-700' },
  answered: { label: '💬 تم الرد', cls: 'bg-emerald-100 text-emerald-700' },
  closed: { label: '🔒 مغلقة', cls: 'bg-gray-100 text-gray-500' },
};

// 💡 مسار الاقتراح — من الفكرة إلى التنفيذ
const IDEA_STEPS = [
  { id: 'new', icon: '📥', label: 'وصلنا' },
  { id: 'studying', icon: '🔬', label: 'قيد الدراسة' },
  { id: 'planned', icon: '🗓️', label: 'مخطط للتنفيذ' },
  { id: 'done', icon: '🎉', label: 'تم التنفيذ' },
];

const catOf = (id: string) => CATS.find((c) => c.id === id) || CATS[0];

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return new Date(iso).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' });
}

export default function SupportCenter({ base }: { base: '/customer/support' | '/seller/support' }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [workNote, setWorkNote] = useState('');
  const [autoActive, setAutoActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'new'>('list');
  const [open, setOpen] = useState<any>(null);

  // نموذج جديد
  const [category, setCategory] = useState<string>('support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // رد داخل محادثة
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const load = () =>
    api(`${base}/mine`)
      .then((d) => { setTickets(d.tickets || []); setWorkNote(d.workNote || ''); setAutoActive(!!d.autoActive); })
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);
  useEffect(() => { threadRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }); }, [open?.messages?.length]);

  async function create() {
    if (!subject.trim() || !message.trim()) return toast('⚠️ أكمل العنوان والرسالة', 'error');
    setSending(true);
    try {
      const r = await api(base, { method: 'POST', body: JSON.stringify({ category, subject: subject.trim(), message: message.trim() }) });
      if (r.autoReplied) toast('🤖 رد عليك المساعد الآلي فوراً — افتح تذكرتك');
      else toast(category === 'suggestion' ? '💡 وصل اقتراحك لفريق التطوير — شكراً لك' : '✅ أُرسلت رسالتك — سنرد عليك قريباً');
      setSubject(''); setMessage(''); setCategory('support');
      setOpen(r.ticket); setTab('list');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSending(false); }
  }

  async function sendReply() {
    if (!reply.trim()) return toast('⚠️ اكتب ردك أولاً', 'error');
    setReplying(true);
    try {
      const r = await api(`${base}/${open.id}/reply`, { method: 'POST', body: JSON.stringify({ message: reply.trim() }) });
      setOpen(r.ticket); setReply('');
      toast('📨 أُرسل ردك للإدارة');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setReplying(false); }
  }

  // ════ عرض محادثة واحدة ════
  if (open) {
    const st = STATUS[open.status] || STATUS.open;
    const ideaIdx = IDEA_STEPS.findIndex((s) => s.id === (open.ideaStatus || 'new'));
    return (
      <div className="glass rounded-3xl overflow-hidden">
        {/* رأس المحادثة */}
        <div className="p-4 border-b border-gray-100 flex items-start gap-3">
          <button onClick={() => setOpen(null)} className="w-9 h-9 rounded-xl bg-gray-100 font-black text-gray-500 shrink-0">→</button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">{catOf(open.category).icon}</span>
              <h2 className="font-black text-sm truncate">{open.subject}</h2>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{catOf(open.category).label} • {timeAgo(open.createdAt)}</p>
          </div>
        </div>

        {/* 💡 مسار الاقتراح */}
        {open.category === 'suggestion' && (
          <div className="px-4 py-3 bg-gradient-to-l from-violet-50 to-fuchsia-50 border-b border-violet-100">
            {open.ideaStatus === 'declined' ? (
              <p className="text-xs font-extrabold text-gray-500 text-center">🙏 شكراً لاقتراحك — لم يكن مناسباً حالياً، وأفكارك القادمة محل ترحيب دائماً</p>
            ) : (
              <>
                <p className="text-[10px] font-extrabold text-violet-500 mb-2 text-center">💡 مسار اقتراحك في تطوير المنصة</p>
                <div className="flex items-center">
                  {IDEA_STEPS.map((s, i) => (
                    <div key={s.id} className="flex-1 flex flex-col items-center relative">
                      {i > 0 && <div className={`absolute top-3.5 right-1/2 w-full h-0.5 ${i <= ideaIdx ? 'bg-violet-400' : 'bg-gray-200'}`} />}
                      <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs ${i <= ideaIdx ? 'bg-violet-500 text-white shadow' : 'bg-gray-200 text-gray-400'}`}>{s.icon}</div>
                      <span className={`text-[8px] font-extrabold mt-1 ${i <= ideaIdx ? 'text-violet-600' : 'text-gray-400'}`}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* الرسائل */}
        <div ref={threadRef} className="p-4 space-y-3 max-h-[45vh] overflow-y-auto bg-white/40">
          {(open.messages || []).map((m: any, i: number) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-start flex-row-reverse' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-line ${
                m.from === 'user'
                  ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-tl-md'
                  : m.from === 'ai'
                    ? 'bg-emerald-50 border border-emerald-200 text-gray-700 rounded-tr-md'
                    : 'bg-white border border-gray-200 text-gray-700 rounded-tr-md shadow-sm'
              }`}>
                <p className={`text-[9px] font-extrabold mb-1 ${m.from === 'user' ? 'text-white/70' : m.from === 'ai' ? 'text-emerald-600' : 'text-violet-600'}`}>
                  {m.from === 'user' ? 'أنت' : m.from === 'ai' ? '🤖 مساعد يمن زون الآلي' : '🛡️ إدارة يمن زون'} • {timeAgo(m.at)}
                </p>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* صندوق الرد */}
        {open.status !== 'closed' ? (
          <div className="p-3 border-t border-gray-100 bg-white/60 flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendReply()}
              placeholder="اكتب ردك أو تفاصيل إضافية..."
              className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-violet-400"
            />
            <button onClick={sendReply} disabled={replying}
              className="px-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-black text-sm disabled:opacity-50">
              {replying ? '...' : '📨'}
            </button>
          </div>
        ) : (
          <p className="p-3 text-center text-[11px] font-bold text-gray-400 bg-white/60">🔒 أُغلقت هذه التذكرة — أنشئ رسالة جديدة إن احتجت شيئاً</p>
        )}
      </div>
    );
  }

  // ════ القائمة + إنشاء ════
  return (
    <div className="space-y-4">
      {/* شريط الحالة */}
      <div className={`rounded-2xl p-3 text-xs font-extrabold flex items-center gap-2 ${autoActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>
        <span className="text-base">{autoActive ? '🤖' : '🕐'}</span>
        <span>{autoActive ? 'المساعد الآلي يرد فوراً الآن — وفريق الدعم يتابع تذكرتك في الدوام' : workNote || 'فريق الدعم جاهز لخدمتك'}</span>
      </div>

      {/* تبويبات */}
      <div className="tabs">
        <button className={'tab' + (tab === 'list' ? ' active' : '')} onClick={() => setTab('list')}>🎫 رسائلي ({tickets.length})</button>
        <button className={'tab' + (tab === 'new' ? ' active' : '')} onClick={() => setTab('new')}>✉️ رسالة جديدة</button>
      </div>

      {tab === 'new' ? (
        <div className="glass rounded-3xl p-4 space-y-3">
          <p className="font-extrabold text-sm">ما موضوع رسالتك؟</p>
          <div className="grid grid-cols-2 gap-2">
            {CATS.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={`rounded-2xl p-3 text-right border-2 transition-all ${category === c.id ? 'border-violet-400 bg-violet-50' : 'border-transparent bg-white/70'}`}>
                <div className="font-black text-sm">{c.icon} {c.label}</div>
                <div className="text-[10px] text-gray-400 font-bold mt-0.5">{c.hint}</div>
              </button>
            ))}
          </div>
          {category === 'suggestion' && (
            <p className="text-[11px] font-bold text-violet-600 bg-violet-50 rounded-xl p-2.5">
              💡 اقتراحك يصل مباشرة لفريق تطوير المنصة — وستتابع مساره من هنا: دراسة ← تخطيط ← تنفيذ 🎉
            </p>
          )}
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120}
            placeholder="📌 عنوان مختصر — مثال: تأخر طلبي رقم 1234"
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000}
            placeholder="✍️ اشرح بالتفصيل... كلما زادت التفاصيل (أرقام طلبات، أسماء صفحات) كان الرد أسرع وأدق"
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-violet-400 resize-none" />
          <p className="text-left text-[10px] text-gray-400 font-bold" dir="ltr">{message.length}/2000</p>
          <button onClick={create} disabled={sending}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-black disabled:opacity-50">
            {sending ? '⏳ جارٍ الإرسال...' : '📨 إرسال إلى إدارة المنصة'}
          </button>
        </div>
      ) : loading ? (
        <div className="glass rounded-3xl p-8 text-center text-gray-400 font-bold text-sm">⏳ جارٍ التحميل...</div>
      ) : tickets.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <div className="text-4xl mb-2">🎧</div>
          <p className="font-black text-sm mb-1">لا رسائل بعد</p>
          <p className="text-xs text-gray-400 font-bold mb-4">فريق الدعم جاهز لخدمتك — أرسل أول رسالة</p>
          <button onClick={() => setTab('new')} className="px-6 py-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-black text-sm">✉️ راسل الإدارة</button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => {
            const st = STATUS[t.status] || STATUS.open;
            const last = (t.messages || [])[t.messages.length - 1];
            return (
              <button key={t.id} onClick={() => setOpen(t)} className="w-full glass rounded-3xl p-4 text-right card-hover">
                <div className="flex items-center gap-2 mb-1">
                  <span>{catOf(t.category).icon}</span>
                  <span className="font-black text-sm flex-1 truncate">{t.subject}</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-xs text-gray-400 font-bold truncate mr-6">
                  {last ? `${last.from === 'user' ? 'أنت: ' : last.from === 'ai' ? '🤖 ' : '🛡️ '}${last.text}` : ''}
                </p>
                <p className="text-[10px] text-gray-300 font-bold mt-1 mr-6">
                  {timeAgo(t.updatedAt)}
                  {t.autoReplied && <span className="text-emerald-500"> • 🤖 رُدّ آلياً</span>}
                  {t.category === 'suggestion' && <span className="text-violet-500"> • 💡 {IDEA_STEPS.find((s) => s.id === (t.ideaStatus || 'new'))?.label}</span>}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
