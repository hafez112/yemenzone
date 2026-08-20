'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { onChatMessage } from '@/lib/realtime';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

// 💬 محادثات البائع مع العملاء — قائمة + رد مباشر (بديل داخلي عن واتساب)
export default function SellerChatsPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null); // {id, customer, messages}
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = () => api('/seller/chats').then(setList).catch((e) => toast(e.message, 'error'));
  const loadConv = (id: string, silent = false) =>
    api(`/seller/chats/${id}/messages`).then((d) => { setOpen({ id, ...d }); if (!silent) return; }).catch(() => {});

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    loadList();
  }, []);

  // ⚡ بث لحظي + 🔄 استطلاع احتياطي متباعد
  useEffect(() => {
    const off = onChatMessage((p) => {
      if (p?.message?.fromType !== 'customer') return;
      loadList();
      if (open?.id && p.conversationId === open.id) loadConv(open.id, true);
      toast('💬 رسالة جديدة من عميل');
    });
    const t = setInterval(() => { loadList(); if (open?.id) loadConv(open.id, true); }, 15000);
    return () => { off(); clearInterval(t); };
  }, [open?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [open?.messages?.length]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api(`/seller/chats/${open.id}/messages`, { method: 'POST', body: JSON.stringify({ body: text }) });
      setText('');
      loadConv(open.id, true);
      loadList();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  };

  const totalUnread = list.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">💬 محادثات العملاء</h1>
          <p className="text-sm text-gray-500 mb-4">
            رسائل مباشرة داخل المنصة — سجل محفوظ وتنبيه فوري للطرفين
            {totalUnread > 0 && <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>{totalUnread} غير مقروءة</span>}
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            {/* القائمة */}
            <section className="card !mb-0 md:max-h-[70vh] md:overflow-y-auto">
              {list.length === 0 && (
                <p className="text-center muted py-10">لا محادثات بعد — زر «💬 راسل البائع» في متجرك يفتح قناة العميل معك</p>
              )}
              {list.map((c) => (
                <button key={c.id} onClick={() => loadConv(c.id)}
                  className={`w-full text-right p-3 rounded-2xl mb-1.5 transition-all flex items-center gap-3 ${
                    open?.id === c.id ? 'ring-2 ring-purple-400' : ''
                  }`} style={{ background: 'rgba(127,127,127,.05)' }}>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                    {c.customer.name?.[0] || '؟'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <b className="text-sm truncate">{c.customer.name}</b>
                      {c.unread > 0 && (
                        <span className="bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center anim-soft-pulse">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] muted truncate">
                      {c.lastMessage ? (c.lastMessage.fromType === 'seller' ? 'أنت: ' : '') + c.lastMessage.body : 'بدأ المحادثة'}
                    </div>
                  </div>
                  {c.lastMessage && (
                    <span className="text-[9px] muted shrink-0">
                      {new Date(c.lastMessage.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </button>
              ))}
            </section>

            {/* المحادثة المفتوحة */}
            <section className="card !mb-0 flex flex-col" style={{ minHeight: '50vh' }}>
              {!open ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center muted py-10">
                  <div className="text-4xl mb-2">💬</div>
                  اختر محادثة من القائمة للرد على العميل
                </div>
              ) : (
                <>
                  <div className="row between mb-2 pb-2" style={{ borderBottom: '1px solid rgba(127,127,127,.15)' }}>
                    <b className="text-sm">👤 {open.customer.name}</b>
                    <a href={`tel:${open.customer.phone}`} className="text-xs font-bold" style={{ color: 'var(--primary)' }} dir="ltr">
                      📞 {open.customer.phone}
                    </a>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[45vh] pl-1">
                    {open.messages.map((m: any) => {
                      const mine = m.fromType === 'seller';
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                            mine ? 'text-white rounded-tl-md' : 'rounded-tr-md'
                          }`} style={mine ? { background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' } : { background: 'rgba(127,127,127,.1)' }}>
                            {m.body}
                            <div className={`text-[9px] mt-0.5 ${mine ? 'text-white/70' : 'muted'}`}>
                              {new Date(m.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                              {mine && (m.readAt ? ' · ✓✓' : ' · ✓')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <input value={text} onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && send()}
                      placeholder="اكتب ردك…" maxLength={500}
                      style={{ marginBottom: 0 }} />
                    <button className="btn primary shrink-0" onClick={send} disabled={sending || !text.trim()}>
                      {sending ? '⏳' : '➤'}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
