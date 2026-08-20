'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser, imgUrl } from '@/lib/api';
import { onChatMessage } from '@/lib/realtime';
import { toast } from '@/components/Toast';

// 💬 محادثة العميل مع المتجر — ⚡ فورية عبر WebSocket + استطلاع احتياطي
export default function CustomerChatPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = (silent = false) => {
    api(`/customer/chats/${slug}`)
      .then(setData)
      .catch((e) => { if (!silent) toast(e.message, 'error'); });
  };

  useEffect(() => {
    if (!getUser()) { router.push('/auth/customer-login'); return; }
    load();
    // ⚡ البث اللحظي — الرسالة تظهر فور وصولها، والاستطلاع يبقى احتياطاً متباعداً
    const off = onChatMessage((p) => {
      setLive(true);
      if (p?.message?.fromType === 'seller') load(true);
    });
    const t = setInterval(() => load(true), 15000);
    return () => { off(); clearInterval(t); };
  }, [slug]);

  // انزلاق لآخر رسالة عند وصول جديد
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages?.length]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api(`/customer/chats/${slug}`, { method: 'POST', body: JSON.stringify({ body: text }) });
      setText('');
      load(true);
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  };

  if (!data) return <main className="min-h-screen pt-20 px-3 max-w-2xl mx-auto"><div className="skeleton h-96 rounded-3xl" /></main>;

  return (
    <main className="min-h-screen pt-20 pb-28 px-3 bg-gradient-to-br from-teal-50 to-purple-50">
      <div className="max-w-2xl mx-auto">
        {/* رأس المحادثة */}
        <div className="glass rounded-3xl p-3.5 mb-3 flex items-center gap-3 sticky top-16 z-20">
          <Link href={`/store/${data.store.slug}`}
            className="w-11 h-11 rounded-2xl skeleton shrink-0 flex items-center justify-center text-xl"
            style={data.store.logo ? { background: `url(${imgUrl(data.store.logo)}) center/cover`, animation: 'none' } : {}}>
            {!data.store.logo && '🏪'}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm truncate">{data.store.name}</div>
            <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 anim-soft-pulse" />
              {live ? '⚡ متصل لحظياً — الرسائل تصل فوراً' : 'محادثة مباشرة — ردّه يصلك هنا'}
            </div>
          </div>
          <Link href={`/store/${data.store.slug}`} className="text-xs font-bold shrink-0" style={{ color: 'var(--primary)' }}>المتجر ←</Link>
        </div>

        {/* الرسائل */}
        <div className="space-y-2">
          {data.messages.length === 0 && (
            <div className="glass rounded-3xl p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">👋</div>
              <p className="text-sm">ابدأ المحادثة — اسأل عن منتج، التوصيل، أو أي استفسار</p>
            </div>
          )}
          {data.messages.map((m: any) => {
            const mine = m.fromType === 'customer';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm anim-bounce-in ${
                  mine ? 'text-white rounded-tl-md' : 'glass rounded-tr-md'
                }`} style={mine ? { background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' } : {}}>
                  <p className="text-sm leading-relaxed">{m.body}</p>
                  <div className={`text-[9px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                    {new Date(m.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                    {mine && (m.readAt ? ' · ✓✓ قُرئت' : ' · ✓')}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* صندوق الإرسال */}
      <div className="fixed bottom-20 inset-x-3 z-30 max-w-2xl mx-auto">
        <div className="glass-strong rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
          <input value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="اكتب رسالتك للمتجر…" maxLength={500}
            className="flex-1 bg-transparent outline-none text-sm px-2 py-2" />
          <button onClick={send} disabled={sending || !text.trim()}
            className="w-10 h-10 rounded-xl text-white font-black shrink-0 disabled:opacity-40 transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
            ➤
          </button>
        </div>
      </div>
    </main>
  );
}
