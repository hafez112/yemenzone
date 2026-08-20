'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 💬 أسئلة العملاء عن منتجاتي — الرد السريع يصنع البيع
export default function SellerQuestionsPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [sending, setSending] = useState(false);

  const load = (f = filter) =>
    api(`/v1/seller/questions?filter=${f}`).then(setData).catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load('pending');
  }, []);

  const switchFilter = (f: 'pending' | 'all') => { setFilter(f); load(f); };

  const sendAnswer = async (id: string) => {
    if (answerText.trim().length < 2) return toast('⚠️ اكتب الإجابة أولاً', 'error');
    setSending(true);
    try {
      await api(`/v1/seller/questions/${id}/answer`, { method: 'POST', body: JSON.stringify({ answer: answerText.trim() }) });
      toast('✅ نُشرت إجابتك — وصل السائل تنبيه 🔔');
      setAnswerFor(null); setAnswerText('');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  };

  const toggleVisibility = async (id: string, isPublic: boolean) => {
    try {
      await api(`/v1/seller/questions/${id}/visibility`, { method: 'PATCH', body: JSON.stringify({ isPublic }) });
      toast(isPublic ? '👁️ السؤال ظاهر الآن في صفحة المنتج' : '🚫 أُخفي السؤال عن صفحة المنتج');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-soft)' }}>
      <SellerSidebar store={store} />
      <main className="flex-1 min-w-0 p-4 md:p-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-black mb-1">💬 أسئلة العملاء</h1>
          <p className="text-xs font-bold text-gray-400 mb-4">إجابتك تظهر في صفحة المنتج للجميع — سؤال مجاب = عميل أقرب للشراء</p>

          {data && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => switchFilter('pending')}
                className={`rounded-2xl p-3 text-center transition-all ${filter === 'pending' ? 'text-white shadow-lg' : 'bg-white shadow-sm'}`}
                style={filter === 'pending' ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : {}}>
                <div className="text-xl font-black">{data.pending}</div>
                <div className="text-[11px] font-extrabold">⏳ بانتظار الرد</div>
              </button>
              <button onClick={() => switchFilter('all')}
                className={`rounded-2xl p-3 text-center transition-all ${filter === 'all' ? 'text-white shadow-lg' : 'bg-white shadow-sm'}`}
                style={filter === 'all' ? { background: 'var(--primary)' } : {}}>
                <div className="text-xl font-black">{data.total}</div>
                <div className="text-[11px] font-extrabold">📋 كل الأسئلة</div>
              </button>
            </div>
          )}

          {!data && <p className="text-center text-sm font-bold text-gray-400 py-16">⏳ جارٍ التحميل…</p>}
          {data && data.items.length === 0 && (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
              <div className="text-5xl mb-3">🎉</div>
              <p className="font-black">{filter === 'pending' ? 'لا أسئلة معلّقة — أحسنت!' : 'لا أسئلة بعد'}</p>
              <p className="text-xs font-bold text-gray-400 mt-1">أسئلة عملائك عن منتجاتك تصل هنا فوراً</p>
            </div>
          )}

          <div className="space-y-3">
            {(data?.items || []).map((q: any) => (
              <div key={q.id} className={`bg-white rounded-3xl p-4 shadow-sm ${!q.answer ? 'border-r-4 border-amber-400' : ''}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <Link href={`/store/${q.product.store.slug}/product/${q.product.id}`} target="_blank"
                    className="w-12 h-12 rounded-xl shrink-0 overflow-hidden"
                    style={q.product.images?.[0] ? { background: `url(${API}${q.product.images[0]}) center/cover` } : { background: '#e5e7eb' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm truncate">{q.product.name}</p>
                    <p className="text-[10px] font-bold text-gray-400">
                      {q.askerName} · {new Date(q.createdAt).toLocaleDateString('ar')}
                      {!q.isPublic && <span className="text-red-400"> · 🚫 مخفي</span>}
                    </p>
                  </div>
                  {!q.answer && <span className="text-[10px] font-extrabold bg-amber-100 text-amber-600 px-2 py-1 rounded-full shrink-0">⏳ معلّق</span>}
                </div>

                <div className="bg-gray-50 rounded-2xl p-3 mb-2">
                  <p className="text-sm font-bold leading-relaxed">❓ {q.question}</p>
                </div>

                {q.answer && (
                  <div className="rounded-2xl p-3 mb-2" style={{ background: 'rgba(108,61,245,.07)' }}>
                    <p className="text-sm font-bold leading-relaxed">✅ {q.answer}</p>
                    <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--primary)' }}>ردك — ظاهر للجميع في صفحة المنتج</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {!q.answer && answerFor !== q.id && (
                    <button onClick={() => { setAnswerFor(q.id); setAnswerText(''); }}
                      className="flex-1 py-2.5 rounded-xl text-white font-extrabold text-xs shadow"
                      style={{ background: 'var(--primary)' }}>
                      ✍️ أجب الآن
                    </button>
                  )}
                  <button onClick={() => toggleVisibility(q.id, !q.isPublic)}
                    className="py-2.5 px-3 rounded-xl bg-gray-100 text-gray-500 font-extrabold text-xs">
                    {q.isPublic ? '🚫 إخفاء' : '👁️ إظهار'}
                  </button>
                </div>

                {answerFor === q.id && (
                  <div className="mt-2 anim-fade-up">
                    <textarea rows={2} value={answerText} maxLength={1000} autoFocus
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="اكتب إجابة واضحة ومقنعة…"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 mb-2" />
                    <div className="flex gap-2">
                      <button onClick={() => sendAnswer(q.id)} disabled={sending}
                        className="flex-1 py-2.5 rounded-xl text-white font-extrabold text-xs shadow disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                        {sending ? '⏳…' : '📨 نشر الإجابة'}
                      </button>
                      <button onClick={() => setAnswerFor(null)}
                        className="py-2.5 px-4 rounded-xl bg-gray-100 text-gray-500 font-extrabold text-xs">إلغاء</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
