'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

// 🤖 أيقونة الذكاء الاصطناعي في الرئيسية — تظهر وتعمل حسب تحديد الإدارة
// تُجيب محلياً من قاعدة معرفة المنصة، وبالذكاء الخارجي إن فعّلته الإدارة
export default function AiAssistant() {
  const [cfg, setCfg] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ role: 'user' | 'bot'; text: string; source?: string }[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api('/v1/ai/config').then((c) => {
      if (c?.enabled) {
        setCfg(c);
        setMsgs([{ role: 'bot', text: c.welcome }]);
        setChips(c.topics || []);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  if (!cfg) return null;

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput(''); setBusy(true); setChips([]);
    try {
      const r = await api('/v1/ai/assistant', { method: 'POST', body: JSON.stringify({ message: q }) });
      setMsgs((m) => [...m, { role: 'bot', text: r.reply, source: r.source }]);
      setChips(r.chips || []);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: 'bot', text: e.message || 'تعذّر الرد الآن — حاول بعد قليل 🙏' }]);
    }
    setBusy(false);
  }

  return (
    <>
      {/* ✨ الأيقونة العائمة المميزة */}
      <button onClick={() => setOpen(!open)} aria-label={cfg.name}
        className="fixed bottom-24 md:bottom-6 left-3 md:left-5 z-[65] group">
        <span className="absolute inset-0 rounded-full anim-pulse-glow" style={{ background: 'var(--primary)', opacity: 0.35 }} />
        <span className="relative w-14 h-14 rounded-full text-white text-2xl shadow-2xl flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))' }}>
          {open ? '✕' : cfg.icon}
        </span>
        {!open && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
        )}
      </button>

      {/* نافذة المحادثة */}
      {open && (
        <div className="fixed bottom-40 md:bottom-24 left-3 md:left-5 z-[66] w-[calc(100vw-1.5rem)] max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-white flex flex-col"
          style={{ maxHeight: 'min(70vh, 560px)' }}>
          {/* الرأس */}
          <div className="p-3.5 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))' }}>
            <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm truncate">{cfg.name}</div>
              <div className="text-[10px] opacity-80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" />
                {cfg.mode === 'hybrid' ? 'ذكاء خارجي + محلي' : 'ذكاء محلي — فوري وخاص'}
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg px-1">✕</button>
          </div>

          {/* الرسائل */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50" style={{ minHeight: 220 }}>
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-white border border-slate-200 text-slate-700 rounded-tr-sm'
                    : 'text-white rounded-tl-sm shadow'
                }`} style={m.role === 'bot' ? { background: 'var(--primary)' } : {}}>
                  {m.text}
                  {m.source && m.source !== 'fallback' && (
                    <div className={`text-[9px] mt-1 ${m.role === 'bot' ? 'text-white/60' : 'text-slate-400'}`}>
                      {m.source === 'external' ? '🌐 رد بالذكاء الخارجي' : '🧠 رد بالذكاء المحلي'}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-end">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-white text-sm shadow" style={{ background: 'var(--primary)' }}>
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* اقتراحات سريعة */}
          {chips.length > 0 && (
            <div className="px-3 pt-2 pb-1 flex gap-1.5 flex-wrap bg-slate-50">
              {chips.map((c) => (
                <button key={c} onClick={() => send(c)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-600 transition-all">
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* الإدخال */}
          <div className="p-2.5 bg-white border-t border-slate-100 flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="اسألني عن المنصة…"
              className="flex-1 p-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 ring-purple-300" />
            <button onClick={() => send(input)} disabled={busy || !input.trim()}
              className="w-11 h-11 rounded-xl text-white text-lg flex items-center justify-center disabled:opacity-40 shrink-0"
              style={{ background: 'var(--primary)' }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}
