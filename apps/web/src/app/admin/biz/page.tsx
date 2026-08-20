'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// 🚀 إدارة طلبات «أضفني إلى محركات البحث» — مراجعة واعتماد صفحات المحلات
export default function AdminBizPage() {
  const router = useRouter();
  const [data, setData] = useState<{ items: any[]; counts: any }>({ items: [], counts: {} });
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s = status) => {
    setLoading(true);
    try { setData(await api(`/admin/biz?status=${s}`)); }
    catch (e: any) { toast(e.message || 'تعذّر التحميل', 'error'); }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, []);

  const act = async (id: string, st: 'approved' | 'rejected') => {
    try {
      const r = await api(`/admin/biz/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: st }) });
      if (st === 'approved') {
        const url = `${location.origin}/biz/${r.slug}`;
        navigator.clipboard.writeText(url).catch(() => {});
        toast(`✅ اعتُمد ونُشرت صفحته — نُسخ رابطها: /biz/${r.slug}`);
      } else toast('🚫 رُفض الطلب');
      load();
    } catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`حذف طلب «${name}» نهائياً؟`)) return;
    try { await api(`/admin/biz/${id}`, { method: 'DELETE' }); toast('🗑️ حُذف الطلب'); load(); }
    catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const copyPage = (slug: string) => {
    navigator.clipboard.writeText(`${location.origin}/biz/${slug}`).then(() => toast('📋 نُسخ رابط الصفحة')).catch(() => {});
  };

  const c = data.counts || {};
  const tabs = [
    { id: 'pending', label: `⏳ بانتظار المراجعة (${c.pending || 0})`, cls: 'amber' },
    { id: 'approved', label: `✅ معتمدة (${c.approved || 0})`, cls: 'emerald' },
    { id: 'rejected', label: `🚫 مرفوضة (${c.rejected || 0})`, cls: 'red' },
  ] as const;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0 space-y-5" dir="rtl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black">🚀 طلبات «أضفني إلى محركات البحث»</h1>
              <p className="text-sm text-gray-500 mt-1">راجع طلبات المحلات — الموافقة تنشئ صفحة رسمية مفهرسة فوراً · 👁️ {(c.views || 0).toLocaleString()} زيارة للصفحات</p>
            </div>
            <a href="/tools/add-me" target="_blank" className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500">👁️ معاينة النموذج</a>
          </div>

          {/* التبويبات */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => { setStatus(t.id); load(t.id); }}
                className={`px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all ${status === t.id ? 'bg-gray-900 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid place-items-center py-24"><div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-orange-500 animate-spin" /></div>
          ) : data.items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">
              <div className="text-5xl mb-3">📭</div><p className="font-bold">لا توجد طلبات في هذه القائمة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.items.map((b: any) => (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center text-xl font-black text-white shrink-0">{b.name[0]}</div>
                    <div className="flex-1 min-w-52">
                      <p className="font-extrabold text-gray-900">{b.name} <span className="text-[10px] text-gray-400 font-normal">{new Date(b.createdAt).toLocaleDateString('ar-YE')}</span></p>
                      <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{b.desc}</p>
                      {b.keywords && <p className="text-[11px] text-purple-600 mt-1">🔍 {b.keywords}</p>}
                      {b.note && <p className="text-[11px] text-amber-600 mt-0.5">📌 ملاحظة: {b.note}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 font-bold">
                        <a href={`tel:${b.phone}`} className="hover:text-emerald-600" dir="ltr">📞 {b.phone}</a>
                        <a href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" className="hover:text-green-600" dir="ltr">💬 {b.whatsapp}</a>
                        <a href={`https://maps.google.com/?q=${b.lat},${b.lng}`} target="_blank" className="hover:text-sky-600">📍 الخريطة</a>
                        {b.website && <a href={b.website} target="_blank" className="hover:text-indigo-600" dir="ltr">🌐 {b.website.slice(0, 30)}</a>}
                        <span>👁️ {b.views}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      {b.status === 'pending' && (
                        <>
                          <button onClick={() => act(b.id, 'approved')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-500">✅ اعتماد ونشر</button>
                          <button onClick={() => act(b.id, 'rejected')} className="px-4 py-2 rounded-xl bg-red-100 text-red-600 text-sm font-bold hover:bg-red-200">🚫 رفض</button>
                        </>
                      )}
                      {b.status === 'approved' && (
                        <>
                          <a href={`/biz/${b.slug}`} target="_blank" className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-500">👁️ الصفحة</a>
                          <button onClick={() => copyPage(b.slug)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200">📋 نسخ الرابط</button>
                        </>
                      )}
                      {b.status === 'rejected' && (
                        <button onClick={() => act(b.id, 'approved')} className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-bold hover:bg-emerald-200">↩️ اعتماد بعداً</button>
                      )}
                      <button onClick={() => remove(b.id, b.name)} className="w-9 h-9 grid place-items-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
