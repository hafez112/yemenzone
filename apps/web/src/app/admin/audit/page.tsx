'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';

// 📜 سجل التدقيق الإداري — من فعل، ماذا، متى، من أي جهاز
const METHODS: Record<string, { c: string; bg: string; label: string }> = {
  POST: { c: '#34d399', bg: 'rgba(52,211,153,.15)', label: 'إنشاء' },
  PATCH: { c: '#fbbf24', bg: 'rgba(251,191,36,.15)', label: 'تعديل' },
  PUT: { c: '#60a5fa', bg: 'rgba(96,165,250,.15)', label: 'استبدال' },
  DELETE: { c: '#f87171', bg: 'rgba(248,113,113,.15)', label: 'حذف' },
};

const timeFmt = (d: string) => new Date(d).toLocaleString('ar-YE', { hour12: false });

export default function AdminAuditPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [method, setMethod] = useState('');
  const [adminId, setAdminId] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    const q = new URLSearchParams();
    if (method) q.set('method', method);
    if (adminId) q.set('adminId', adminId);
    if (search) q.set('search', search);
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    q.set('page', String(page));
    api(`/admin/audit-logs?${q}`).then(setData).catch((e) => toast(e.message, 'error'));
  };

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, [method, adminId, page]);

  const apply = () => { setPage(1); load(); };

  return (
    <div className="min-h-screen bg-night pt-20 pb-24 px-3">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0 text-white">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black">📜 سجل التدقيق الإداري</h1>
              <p className="text-xs text-gray-400 mt-1">كل إجراء معدِّل في لوحة الإدارة يُوثَّق تلقائياً — من نفّذه ومن أين ومتى</p>
            </div>
            {data && <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 text-gray-300">{data.total.toLocaleString()} إجراء موثّق</span>}
          </div>

          {/* الفلاتر */}
          <div className="glass-dark rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {['', 'POST', 'PATCH', 'DELETE'].map((m) => (
                <button key={m} onClick={() => { setMethod(m); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${method === m ? 'text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  style={method === m ? { background: 'linear-gradient(135deg, var(--primary), var(--secondary))' } : {}}>
                  {m ? METHODS[m].label : 'الكل'}
                </button>
              ))}
            </div>
            <select value={adminId} onChange={(e) => { setAdminId(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none">
              <option value="">👤 كل المديرين</option>
              {data?.admins?.map((a: any) => <option key={a.id} value={a.id} className="text-black">{a.name}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none" />
            <div className="flex gap-1.5 flex-1 min-w-[180px]">
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()}
                placeholder="🔍 ابحث في المسار... مثل payments" dir="ltr"
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 outline-none" />
              <button onClick={apply} className="px-3 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>تطبيق</button>
            </div>
          </div>

          {/* السجل */}
          {!data ? <div className="skeleton h-96 rounded-3xl" /> : (
            <>
              <div className="space-y-1.5">
                {data.rows.map((r: any) => {
                  const M = METHODS[r.method] || METHODS.POST;
                  const failed = r.status >= 400;
                  return (
                    <div key={r.id} className="glass-dark rounded-2xl px-3 py-2.5 flex items-center gap-2.5 flex-wrap">
                      <span className="text-[10px] font-black px-2 py-1 rounded-lg shrink-0" style={{ color: M.c, background: M.bg }} dir="ltr">
                        {r.method}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold truncate" dir="ltr" style={{ color: failed ? '#f87171' : undefined }}>{r.path}</div>
                        <div className="text-[9px] text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>👤 {r.adminName}</span>
                          {r.ip && <span dir="ltr">🌐 {r.ip}</span>}
                          {failed && <span className="text-red-400 font-bold">✕ فشل ({r.status})</span>}
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-500 shrink-0">{timeFmt(r.createdAt)}</span>
                    </div>
                  );
                })}
                {!data.rows.length && (
                  <div className="glass-dark rounded-3xl p-10 text-center text-gray-400">
                    <div className="text-4xl mb-2">📜</div>
                    لا إجراءات مطابقة للفلاتر الحالية
                  </div>
                )}
              </div>

              {/* الصفحات */}
              {data.pages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 text-xs font-bold disabled:opacity-30">→ السابق</button>
                  <span className="text-xs text-gray-400">صفحة {page} من {data.pages}</span>
                  <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 text-xs font-bold disabled:opacity-30">التالي ←</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
