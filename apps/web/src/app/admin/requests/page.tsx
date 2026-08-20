'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// 📢 إدارة «اطلبها ونوفرها» — اعتماد الطلبات ومراجعة ردود التجار
export default function AdminRequestsPage() {
  const router = useRouter();
  const [section, setSection] = useState<'requests' | 'replies'>('requests');
  const [reqs, setReqs] = useState<{ items: any[]; counts: any }>({ items: [], counts: {} });
  const [reps, setReps] = useState<{ items: any[]; counts: any }>({ items: [], counts: {} });
  const [rStatus, setRStatus] = useState<'pending' | 'approved' | 'closed'>('pending');
  const [pStatus, setPStatus] = useState<'pending' | 'approved' | 'hidden'>('pending');
  const [loading, setLoading] = useState(true);

  const loadReqs = useCallback(async (s = rStatus) => {
    setLoading(true);
    try { setReqs(await api(`/admin/requests?status=${s}`)); }
    catch (e: any) { toast(e.message || 'تعذّر التحميل', 'error'); }
    setLoading(false);
  }, [rStatus]);

  const loadReps = useCallback(async (s = pStatus) => {
    setLoading(true);
    try { setReps(await api(`/admin/request-replies?status=${s}`)); }
    catch (e: any) { toast(e.message || 'تعذّر التحميل', 'error'); }
    setLoading(false);
  }, [pStatus]);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    loadReqs(); loadReps();
  }, []);

  const reqAct = async (id: string, st: string) => {
    try {
      const r = await api(`/admin/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: st }) });
      if (st === 'approved') {
        navigator.clipboard.writeText(`${location.origin}/r/${r.slug}`).catch(() => {});
        toast(`✅ اعتُمد ونُشر — نُسخ رابطه: /r/${r.slug}`);
      } else toast(st === 'closed' ? '🔒 أُغلق الطلب' : '↩️ أُعيد للمراجعة');
      loadReqs();
    } catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const reqRemove = async (id: string, title: string) => {
    if (!confirm(`حذف طلب «${title.slice(0, 40)}» وكل ردوده نهائياً؟`)) return;
    try { await api(`/admin/requests/${id}`, { method: 'DELETE' }); toast('🗑️ حُذف الطلب وردوده'); loadReqs(); }
    catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const repAct = async (id: string, st: 'approved' | 'hidden') => {
    try {
      await api(`/admin/request-replies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: st }) });
      toast(st === 'approved' ? '✅ ظهر الرد تحت الطلب' : '🙈 أُخفي الرد');
      loadReps();
    } catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const repRemove = async (id: string) => {
    if (!confirm('حذف هذا الرد نهائياً؟')) return;
    try { await api(`/admin/request-replies/${id}`, { method: 'DELETE' }); toast('🗑️ حُذف الرد'); loadReps(); }
    catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const cur = (x: string) => (x === 'SAR' ? 'ر.س' : x === 'USD' ? '$' : 'ر.ي');
  const rc = reqs.counts || {}, pc = reps.counts || {};
  const tabBtn = (on: boolean) => `px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all ${on ? 'bg-gray-900 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0 space-y-5" dir="rtl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black">📢 اطلبها ونوفرها</h1>
              <p className="text-sm text-gray-500 mt-1">طلبات الزبائن المعروضة للتجار + ردودهم — 👁️ {(rc.views || 0).toLocaleString()} مشاهدة للطلبات</p>
            </div>
            <a href="/tools/requests" target="_blank" className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500">👁️ معاينة السوق</a>
          </div>

          {/* القسمان */}
          <div className="flex gap-2">
            <button onClick={() => setSection('requests')} className={tabBtn(section === 'requests')}>📝 الطلبات ({(rc.pending || 0) + (rc.approved || 0) + (rc.closed || 0)})</button>
            <button onClick={() => setSection('replies')} className={tabBtn(section === 'replies')}>
              💬 ردود التجار {(pc.pending || 0) > 0 && <span className="text-red-500">({pc.pending} بانتظارك)</span>}
            </button>
          </div>

          {section === 'requests' ? (
            <>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setRStatus('pending'); loadReqs('pending'); }} className={tabBtn(rStatus === 'pending')}>⏳ بانتظار ({rc.pending || 0})</button>
                <button onClick={() => { setRStatus('approved'); loadReqs('approved'); }} className={tabBtn(rStatus === 'approved')}>✅ منشورة ({rc.approved || 0})</button>
                <button onClick={() => { setRStatus('closed'); loadReqs('closed'); }} className={tabBtn(rStatus === 'closed')}>🔒 مغلقة ({rc.closed || 0})</button>
              </div>
              {loading ? (
                <div className="grid place-items-center py-24"><div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-orange-500 animate-spin" /></div>
              ) : reqs.items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400"><div className="text-5xl mb-3">📭</div><p className="font-bold">لا طلبات هنا</p></div>
              ) : (
                <div className="space-y-3">
                  {reqs.items.map((r: any) => (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 grid place-items-center text-xl shrink-0">📢</div>
                        <div className="flex-1 min-w-52">
                          <p className="font-extrabold text-gray-900">{r.title} <span className="text-[10px] text-gray-400 font-normal">{new Date(r.createdAt).toLocaleDateString('ar-YE')}</span></p>
                          {r.details && <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{r.details}</p>}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 font-bold">
                            {r.budget && <span>💰 {Number(r.budget).toLocaleString()} {cur(r.currency)}</span>}
                            {r.governorate && <span>📍 {r.governorate}</span>}
                            <a href={`https://wa.me/${String(r.whatsapp).replace(/[^0-9]/g, '')}`} target="_blank" className="hover:text-green-600" dir="ltr">💬 {r.whatsapp}</a>
                            <span>👁️ {r.views}</span>
                            <span>💬 {r._count?.replies || 0} رد</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 flex-wrap">
                          {r.status === 'pending' && (
                            <button onClick={() => reqAct(r.id, 'approved')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-500">✅ اعتماد ونشر</button>
                          )}
                          {r.status === 'approved' && (
                            <>
                              <a href={`/r/${r.slug}`} target="_blank" className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-500">👁️ الصفحة</a>
                              <button onClick={() => reqAct(r.id, 'closed')} className="px-4 py-2 rounded-xl bg-amber-100 text-amber-700 text-sm font-bold hover:bg-amber-200">🔒 إغلاق</button>
                            </>
                          )}
                          {r.status === 'closed' && (
                            <button onClick={() => reqAct(r.id, 'approved')} className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-bold hover:bg-emerald-200">↩️ إعادة نشر</button>
                          )}
                          <button onClick={() => reqRemove(r.id, r.title)} className="w-9 h-9 grid place-items-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setPStatus('pending'); loadReps('pending'); }} className={tabBtn(pStatus === 'pending')}>⏳ بانتظار ({pc.pending || 0})</button>
                <button onClick={() => { setPStatus('approved'); loadReps('approved'); }} className={tabBtn(pStatus === 'approved')}>✅ ظاهرة ({pc.approved || 0})</button>
                <button onClick={() => { setPStatus('hidden'); loadReps('hidden'); }} className={tabBtn(pStatus === 'hidden')}>🙈 مخفية ({pc.hidden || 0})</button>
              </div>
              {loading ? (
                <div className="grid place-items-center py-24"><div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-orange-500 animate-spin" /></div>
              ) : reps.items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400"><div className="text-5xl mb-3">📭</div><p className="font-bold">لا ردود هنا</p></div>
              ) : (
                <div className="space-y-3">
                  {reps.items.map((p: any) => (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 grid place-items-center text-white text-lg font-black shrink-0">{p.sellerName[0]}</div>
                        <div className="flex-1 min-w-52">
                          <p className="font-extrabold text-gray-900">{p.sellerName}
                            {p.price && <span className="text-emerald-600 text-sm mr-2">{Number(p.price).toLocaleString()}</span>}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{p.message}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 font-bold">
                            <span>📢 على: {p.request?.title?.slice(0, 40)}</span>
                            <a href={`https://wa.me/${String(p.whatsapp).replace(/[^0-9]/g, '')}`} target="_blank" className="hover:text-green-600" dir="ltr">💬 {p.whatsapp}</a>
                            {p.request?.slug && <a href={`/r/${p.request.slug}`} target="_blank" className="hover:text-sky-600">👁️ الطلب</a>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {p.status !== 'approved' && (
                            <button onClick={() => repAct(p.id, 'approved')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-500">✅ إظهار</button>
                          )}
                          {p.status === 'approved' && (
                            <button onClick={() => repAct(p.id, 'hidden')} className="px-4 py-2 rounded-xl bg-amber-100 text-amber-700 text-sm font-bold hover:bg-amber-200">🙈 إخفاء</button>
                          )}
                          <button onClick={() => repRemove(p.id)} className="w-9 h-9 grid place-items-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
