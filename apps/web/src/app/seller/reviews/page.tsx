'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

// ⭐ تقييمات متجري — الرد على العملاء يبني الثقة ويرفع الدرجة الذكية
export default function SellerReviewsPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'replied'>('all');
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => api('/seller/reviews').then(setData).catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load();
  }, []);

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return toast('⚠️ اكتب نص الرد أولاً', 'error');
    setSending(true);
    try {
      await api(`/seller/reviews/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply: replyText.trim() }) });
      toast('✅ نُشر ردك — وصل العميل تنبيه 💬');
      setReplyFor(null); setReplyText('');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  };

  const removeReply = async (id: string) => {
    if (!confirm('حذف ردك على هذا التقييم؟')) return;
    try {
      await api(`/seller/reviews/${id}/reply`, { method: 'DELETE' });
      toast('🗑️ حُذف الرد');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const reviews = (data?.reviews || []).filter((r: any) =>
    filter === 'all' ? true : filter === 'unreplied' ? !r.reply : !!r.reply
  );
  const st = data?.stats;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">⭐ تقييمات متجري</h1>
          <p className="text-sm text-gray-500 mb-4">ردّ على عملائك — الرد يصلهم تنبيهاً ويظهر في صفحة متجرك</p>

          {/* الإحصائيات */}
          {st && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="card text-center !mb-0">
                <div className="text-2xl font-black grad-text">{st.avg || '—'}</div>
                <div className="text-xs text-gray-400 font-bold">المتوسط</div>
              </div>
              <div className="card text-center !mb-0">
                <div className="text-2xl font-black">{st.total}</div>
                <div className="text-xs text-gray-400 font-bold">تقييم</div>
              </div>
              <div className="card text-center !mb-0">
                <div className="text-2xl font-black text-amber-500">{st.unreplied}</div>
                <div className="text-xs text-gray-400 font-bold">بانتظار ردك</div>
              </div>
              <div className="card !mb-0">
                {st.dist.map((d: any) => (
                  <div key={d.stars} className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-amber-400 font-black w-6">{d.stars}★</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${st.total ? (d.count / st.total) * 100 : 0}%`, background: 'var(--primary)' }} />
                    </div>
                    <span className="text-gray-400 w-5 text-left">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* الفلاتر */}
          <div className="tabs">
            {([['all', 'الكل'], ['unreplied', '⏳ بانتظار ردك'], ['replied', '💬 تم الرد']] as const).map(([k, l]) => (
              <button key={k} className={'tab' + (filter === k ? ' active' : '')} onClick={() => setFilter(k as any)}>
                {l}{k === 'unreplied' && st?.unreplied ? ` (${st.unreplied})` : ''}
              </button>
            ))}
          </div>

          {/* القائمة */}
          {reviews.map((r: any) => (
            <div key={r.id} className="card">
              <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                <b className="text-sm">👤 {r.customer?.name || 'عميل'}</b>
                {r.orderId && <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700" title={r.orderNumber ? `مرتبط بالطلب ${r.orderNumber}` : ''}>✅ موثّق</span>}
                <span className="text-amber-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              <div className="text-[10px] text-gray-400 mb-1">
                {new Date(r.createdAt).toLocaleDateString('ar-YE')}
                {r.product?.name && <> · على منتج: 📦 {r.product.name}</>}
                {!r.isApproved && <span className="text-red-400 font-bold"> · مخفي بقرار الإدارة</span>}
              </div>
              {r.comment && <p className="text-sm text-gray-600 mb-2">{r.comment}</p>}

              {/* الرد الحالي */}
              {r.reply && (
                <div className="p-3 rounded-2xl bg-purple-50 border-r-4 mb-2" style={{ borderColor: 'var(--primary)' }}>
                  <div className="flex items-center justify-between">
                    <b className="text-xs" style={{ color: 'var(--primary)' }}>💬 ردّك</b>
                    <div className="flex items-center gap-2">
                      {r.replyHidden && <span className="text-[10px] text-red-400 font-bold">🙈 أخفته الإدارة</span>}
                      <button className="text-[10px] font-bold text-red-400" onClick={() => removeReply(r.id)}>حذف</button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{r.reply}</p>
                </div>
              )}

              {/* صندوق الرد */}
              {replyFor === r.id ? (
                <div>
                  <textarea className="input w-full" rows={2} maxLength={500} autoFocus
                    placeholder="اكتب رداً لطيفاً… (شكراً لثقتك 🌹 / نعتذر وسنحسّن الخدمة)"
                    value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                  <div className="flex gap-2">
                    <button className="btn small flex-1" disabled={sending} onClick={() => sendReply(r.id)}>
                      {sending ? '⏳…' : r.reply ? '💾 تحديث الرد' : '💬 نشر الرد'}
                    </button>
                    <button className="btn small btn-danger" onClick={() => { setReplyFor(null); setReplyText(''); }}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <button className="btn small ghost" onClick={() => { setReplyFor(r.id); setReplyText(r.reply || ''); }}>
                  {r.reply ? '✏️ تعديل الرد' : '💬 رد على التقييم'}
                </button>
              )}
            </div>
          ))}

          {data && reviews.length === 0 && (
            <div className="card text-center py-10 text-gray-400">
              {filter === 'unreplied' ? '🎉 رددت على كل التقييمات — عمل رائع!' : 'لا تقييمات بعد — شارك متجرك لتحصل على أول تقييم ⭐'}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
