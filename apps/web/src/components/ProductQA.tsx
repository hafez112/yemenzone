'use client';
import { useEffect, useState } from 'react';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';

// 💬 أسئلة وأجوبة المنتج — الزائر يسأل بالاسم، والمسجل يُشعَر بالرد
export default function ProductQA({ productId, primary, isDark }: { productId: string; primary: string; isDark?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', question: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let live = true;
    api(`/v1/products/${productId}/questions`)
      .then((r: any) => { if (live) { setItems(Array.isArray(r) ? r : []); setLoaded(true); } })
      .catch(() => setLoaded(true));
    return () => { live = false; };
  }, [productId]);

  const ask = async () => {
    if (form.question.trim().length < 3) return toast('✍️ اكتب سؤالك أولاً', 'error');
    setSending(true);
    try {
      const u = getUser();
      await api(`/v1/products/${productId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim() || u?.name || '',
          phone: form.phone.trim() || u?.phone || '',
          question: form.question.trim(),
        }),
      });
      toast('✅ وصل سؤالك للبائع — سيظهر الرد هنا');
      setForm({ name: '', phone: '', question: '' });
      setOpen(false);
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  };

  const card = isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm';
  const input = `w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`;

  return (
    <section className={`mt-8 rounded-3xl p-5 ${card}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-lg">💬 أسئلة وأجوبة {loaded && items.length > 0 && <span className="text-xs font-bold text-gray-400">({items.length})</span>}</h2>
        <button onClick={() => setOpen(!open)}
          className="text-xs font-extrabold text-white px-3.5 py-2 rounded-xl shadow transition-all hover:scale-105"
          style={{ background: primary }}>
          {open ? '✕ إغلاق' : '❓ اسأل البائع'}
        </button>
      </div>

      {open && (
        <div className={`rounded-2xl p-3.5 mb-3 anim-fade-up ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className={input} placeholder="اسمك" value={form.name} maxLength={60}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} placeholder="جوالك (اختياري — ليصلك الرد)" value={form.phone} maxLength={20} dir="ltr"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <textarea className={`${input} mb-2`} rows={2} placeholder="اكتب سؤالك عن المنتج…" value={form.question} maxLength={500}
            onChange={(e) => setForm({ ...form, question: e.target.value })} />
          <button onClick={ask} disabled={sending}
            className="w-full py-2.5 rounded-xl text-white font-extrabold text-sm shadow disabled:opacity-40"
            style={{ background: primary }}>
            {sending ? '⏳ جارٍ الإرسال…' : '📨 إرسال السؤال'}
          </button>
          <p className="text-[10px] font-bold text-gray-400 mt-1.5">💡 زوّد جوالك ليصلك إشعار فور رد البائع</p>
        </div>
      )}

      {loaded && items.length === 0 && (
        <p className="text-xs font-bold text-gray-400 text-center py-3">لا أسئلة بعد — كن أول من يسأل 👋</p>
      )}
      <div className="space-y-2.5">
        {items.map((q) => (
          <div key={q.id} className={`rounded-2xl p-3.5 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <div className="flex items-start gap-2">
              <span className="text-base">❓</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold leading-relaxed">{q.question}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{q.askerName} · {new Date(q.createdAt).toLocaleDateString('ar')}</p>
              </div>
            </div>
            {q.answer ? (
              <div className="flex items-start gap-2 mt-2.5 mr-5">
                <span className="text-base">🏪</span>
                <div className="flex-1 min-w-0 rounded-xl px-3 py-2" style={{ background: `${primary}12` }}>
                  <p className="text-sm font-bold leading-relaxed">{q.answer}</p>
                  <p className="text-[10px] font-bold mt-0.5" style={{ color: primary }}>رد البائع</p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-bold text-gray-400 mt-2 mr-5">⏳ بانتظار رد البائع…</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
