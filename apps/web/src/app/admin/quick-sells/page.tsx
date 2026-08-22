
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';
import AdminSidebar from '@/components/AdminSidebar';

// 🔗 إدارة «بع برابط واحد» — إشراف على صفحات المنتجات الفورية (إظهار/إخفاء/حذف)
export default function AdminQuickSellsPage() {
  const { list: CURS, def: defCur } = useCurrency();
  const dsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const router = useRouter();
  const [data, setData] = useState<{ items: any[]; counts: any }>({ items: [], counts: {} });
  const [status, setStatus] = useState<'active' | 'hidden'>('active');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s = status, query = q) => {
    setLoading(true);
    try { setData(await api(`/admin/quick-sells?status=${s}${query ? `&q=${encodeURIComponent(query)}` : ''}`)); }
    catch (e: any) { toast(e.message || 'تعذّر التحميل', 'error'); }
    setLoading(false);
  }, [status, q]);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, []);

  const act = async (id: string, st: 'active' | 'hidden') => {
    try {
      await api(`/admin/quick-sells/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: st }) });
      toast(st === 'active' ? '✅ أُظهرت الصفحة' : '🙈 أُخفيت الصفحة عن الزوار');
      load();
    } catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`حذف صفحة «${name}» نهائياً؟`)) return;
    try { await api(`/admin/quick-sells/${id}`, { method: 'DELETE' }); toast('🗑️ حُذفت الصفحة'); load(); }
    catch (e: any) { toast(e.message || 'تعذّر', 'error'); }
  };

  const copyPage = (slug: string) => {
    navigator.clipboard.writeText(`${location.origin}/q/${slug}`).then(() => toast('📋 نُسخ رابط الصفحة')).catch(() => {});
  };

  const c = data.counts || {};
  const cur = (x: string) => dsym(x);

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0 space-y-5" dir="rtl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black">🔗 بع برابط واحد</h1>
              <p className="text-sm text-gray-500 mt-1">
                صفحات البيع الفورية التي أنشأها الزوار — {c.total || 0} صفحة · 👁️ {(c.views || 0).toLocaleString()} مشاهدة
              </p>
            </div>
            <a href="/tools/quick-sell" target="_blank" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500">👁️ معاينة الأداة</a>
          </div>

          {/* بحث + تبويبات */}
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => { setStatus('active'); load('active'); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all ${status === 'active' ? 'bg-gray-900 text-white shadow' : 'bg-white border border-gray-200 text-gray-600'}`}>
              ✅ نشطة ({c.active || 0})
            </button>
            <button onClick={() => { setStatus('hidden'); load('hidden'); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all ${status === 'hidden' ? 'bg-gray-900 text-white shadow' : 'bg-white border border-gray-200 text-gray-600'}`}>
              🙈 مخفية ({c.hidden || 0})
            </button>
            <div className="flex gap-1 mr-auto">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(status, q)}
                placeholder="🔍 ابحث باسم المنتج..." className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm w-48 focus:outline-none focus:border-emerald-400" />
              <button onClick={() => load(status, q)} className="px-3 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold">بحث</button>
            </div>
          </div>

          {loading ? (
            <div className="grid place-items-center py-24"><div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-emerald-500 animate-spin" /></div>
          ) : data.items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">
              <div className="text-5xl mb-3">📭</div><p className="font-bold">لا توجد صفحات في هذه القائمة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.items.map((b: any) => (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    {Array.isArray(b.images) && b.images[0] ? (
                      <img src={imgUrl(b.images[0])} alt="" className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-xl shrink-0">🛍️</div>
                    )}
                    <div className="flex-1 min-w-52">
                      <p className="font-extrabold text-gray-900">
                        {b.name} <span className="text-emerald-600">{Number(b.price).toLocaleString()} {cur(b.currency)}</span>
                        <span className="text-[10px] text-gray-400 font-normal mr-2">{new Date(b.createdAt).toLocaleDateString('ar-YE')}</span>
                      </p>
                      {b.desc && <p className="text-sm text-gray-600 mt-0.5 leading-relaxed line-clamp-2">{b.desc}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 font-bold">
                        <a href={`https://wa.me/${String(b.whatsapp).replace(/[^0-9]/g, '')}`} target="_blank" className="hover:text-green-600" dir="ltr">💬 {b.whatsapp}</a>
                        {b.phone && <a href={`tel:${b.phone}`} className="hover:text-emerald-600" dir="ltr">📞 {b.phone}</a>}
                        {b.governorate && <span>📍 {b.governorate}</span>}
                        <span>👁️ {b.views}</span>
                        <span className="text-gray-300" dir="ltr">/q/{b.slug}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <a href={`/q/${b.slug}`} target="_blank" className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-500">👁️ الصفحة</a>
                      <button onClick={() => copyPage(b.slug)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200">📋 الرابط</button>
                      {b.status === 'active' ? (
                        <button onClick={() => act(b.id, 'hidden')} className="px-4 py-2 rounded-xl bg-amber-100 text-amber-700 text-sm font-bold hover:bg-amber-200">🙈 إخفاء</button>
                      ) : (
                        <button onClick={() => act(b.id, 'active')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-500">✅ إظهار</button>
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
