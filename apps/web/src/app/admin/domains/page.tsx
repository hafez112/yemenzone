'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

const ST: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'بانتظار المراجعة', color: '#92400e', bg: '#fef3c7', icon: '⏳' },
  approved: { label: 'معتمد', color: '#065f46', bg: '#d1fae5', icon: '✅' },
  rejected: { label: 'مرفوض', color: '#991b1b', bg: '#fee2e2', icon: '❌' },
};

// 🌐 إدارة طلبات النطاقات الحقيقية — الاعتماد والرفض من الإدارة وحدها
export default function AdminDomainsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState('');

  const load = () => api(`/admin/domains${filter ? `?status=${filter}` : ''}`)
    .then(setData).catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, [filter]);

  async function review(storeId: string, approve: boolean) {
    const note = (notes[storeId] || '').trim();
    if (!approve && !note) return toast('⚠️ اذكر سبب الرفض أولاً', 'error');
    setActing(storeId);
    try {
      await api(`/admin/domains/${storeId}/review`, { method: 'POST', body: JSON.stringify({ approve, note }) });
      toast(approve ? '✅ اعتُمد النطاق — أُشعر البائع' : '❌ رُفض الطلب — أُشعر البائع');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    setActing('');
  }

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🌐 طلبات النطاقات الحقيقية</h1>
          <p className="text-sm text-gray-500 mb-4">
            ربط نطاقات البائعين بمتاجرهم — القرار النهائي للإدارة. نطاق المنصة: <code dir="ltr">{data?.platformDomain || '...'}</code>
          </p>

          {data && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="card text-center"><div className="text-2xl font-black text-amber-600">{data.counts.pending}</div><div className="text-xs text-gray-500">⏳ بانتظار</div></div>
              <div className="card text-center"><div className="text-2xl font-black text-emerald-600">{data.counts.approved}</div><div className="text-xs text-gray-500">✅ معتمد</div></div>
              <div className="card text-center"><div className="text-2xl font-black text-red-600">{data.counts.rejected}</div><div className="text-xs text-gray-500">❌ مرفوض</div></div>
            </div>
          )}

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {[['', 'الكل'], ['pending', '⏳ بانتظار'], ['approved', '✅ معتمد'], ['rejected', '❌ مرفوض']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} className={'btn whitespace-nowrap ' + (filter === v ? 'primary' : 'ghost')}>{l}</button>
            ))}
          </div>

          {!data ? <div className="skeleton h-64 rounded-3xl" /> : data.stores.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">لا توجد طلبات نطاقات {filter ? 'بهذه الحالة' : 'بعد'}</div>
          ) : (
            data.stores.map((s: any) => {
              const st = ST[s.customDomainStatus] || ST.pending;
              return (
                <div key={s.id} className="card mb-3">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="font-black text-lg" dir="ltr">{s.customDomain}</div>
                      <div className="text-sm text-gray-500">
                        🏪 {s.name} · 👤 {s.seller?.name} · <span dir="ltr">{s.seller?.phone}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {s._count.products} منتج · {s._count.orders} طلب
                        {s.domainRequestedAt && <> · طُلب {new Date(s.domainRequestedAt).toLocaleDateString('ar-YE')}</>}
                      </div>
                    </div>
                    <span className="badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                  </div>

                  {s.customDomainStatus === 'rejected' && s.customDomainNote && (
                    <p className="text-sm text-red-600 mt-2">سبب الرفض السابق: {s.customDomainNote}</p>
                  )}

                  {s.customDomainStatus !== 'approved' && (
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                      <input className="input flex-1 min-w-[200px]" placeholder="ملاحظة / سبب الرفض (إلزامي عند الرفض)"
                        value={notes[s.id] || ''} onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })} />
                      <button className="btn success" disabled={acting === s.id} onClick={() => review(s.id, true)}>✅ اعتماد</button>
                      <button className="btn btn-danger" disabled={acting === s.id} onClick={() => review(s.id, false)}>❌ رفض</button>
                    </div>
                  )}
                  {s.customDomainStatus === 'approved' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a className="btn ghost" href={`https://${s.customDomain}`} target="_blank" rel="noreferrer">🔗 فحص النطاق</a>
                      <button className="btn btn-danger" disabled={acting === s.id} onClick={() => review(s.id, false)}>⛔ إلغاء الاعتماد</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}
