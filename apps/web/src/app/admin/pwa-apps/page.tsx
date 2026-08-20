'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';

const TYPE: Record<string, { icon: string; label: string; color: string }> = {
  seller:   { icon: '🏪', label: 'بائع',  color: '#6C3DF5' },
  driver:   { icon: '🛵', label: 'سائق',  color: '#0EA5E9' },
  customer: { icon: '👤', label: 'عميل',  color: '#0D9488' },
};
const STATUS: Record<string, { label: string; cls: string }> = {
  pending:  { label: '⏳ قيد المراجعة', cls: 'bg-amber-500/20 text-amber-300' },
  approved: { label: '✅ معتمد',        cls: 'bg-emerald-500/20 text-emerald-300' },
  rejected: { label: '❌ مرفوض',        cls: 'bg-red-500/20 text-red-300' },
};

// 📱 إدارة طلبات تطبيقات الويب التقدمية — الموافقة والرفض بيد الإدارة
export default function AdminPwaAppsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState('');

  const load = (s = filter) => {
    api(`/admin/pwa${s ? `?status=${s}` : ''}`).then(setData).catch(e => toast(e.message, 'error'));
  };
  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load('pending');
  }, []);

  const switchFilter = (s: string) => { setFilter(s); setData(null); load(s); };

  async function review(r: any, approve: boolean) {
    let note = '';
    if (!approve) {
      note = prompt('سبب الرفض (يظهر للمستخدم):') || '';
      if (note === null) return;
    }
    setBusy(r.id);
    try {
      await api(`/admin/pwa/${r.id}/review`, { method: 'POST', body: JSON.stringify({ approve, note }) });
      toast(approve ? `✅ اعتُمد تطبيق ${r.userName || ''} — ظهر له زر التثبيت` : '❌ رُفض الطلب');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy('');
  }

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-night">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-black text-white">📱 تطبيقات الويب التقدمية</h1>
            <p className="text-[11px] text-gray-400">البائع والسائق والعميل يطلبون — وأنت صاحب القرار</p>
          </div>

          {/* العدادات + الفلاتر */}
          <div className="flex gap-2 flex-wrap">
            {[
              { k: 'pending',  l: '⏳ معلقة',  n: data?.counts?.pending },
              { k: 'approved', l: '✅ معتمدة', n: data?.counts?.approved },
              { k: 'rejected', l: '❌ مرفوضة', n: data?.counts?.rejected },
              { k: '',         l: '📋 الكل',   n: undefined },
            ].map(f => (
              <button key={f.k} onClick={() => switchFilter(f.k)}
                className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all ${
                  filter === f.k ? 'text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
                style={filter === f.k ? { background: 'var(--primary)' } : {}}>
                {f.l}{f.n !== undefined ? ` (${f.n})` : ''}
              </button>
            ))}
          </div>

          {/* القائمة */}
          {!data ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-3xl opacity-20" />)}</div>
          ) : (
            <div className="space-y-3 stagger">
              {data.items.map((r: any) => {
                const t = TYPE[r.userType] || TYPE.customer;
                const s = STATUS[r.status] || STATUS.pending;
                return (
                  <div key={r.id} className="glass-dark rounded-3xl p-4 flex items-center gap-3 flex-wrap">
                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: `${t.color}25`, border: `1px solid ${t.color}50` }}>
                      {t.icon}
                    </span>
                    <div className="flex-1 min-w-[160px]">
                      <div className="font-extrabold text-white text-sm">{r.userName || t.label}</div>
                      <div className="text-[11px] text-gray-400">
                        {t.label} • {new Date(r.createdAt).toLocaleDateString('ar-YE')}
                        {r.reviewedAt && ` • رُوجع ${new Date(r.reviewedAt).toLocaleDateString('ar-YE')}`}
                      </div>
                      {r.note && <div className="text-[11px] text-red-300 mt-1">📝 {r.note}</div>}
                    </div>
                    <span className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => review(r, true)} disabled={busy === r.id}
                          className="px-4 py-2 rounded-xl text-xs font-extrabold text-white disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, #059669, #0D9488)' }}>
                          ✅ موافقة
                        </button>
                        <button onClick={() => review(r, false)} disabled={busy === r.id}
                          className="px-4 py-2 rounded-xl text-xs font-extrabold bg-red-500/20 text-red-300 disabled:opacity-40">
                          ❌ رفض
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {data.items.length === 0 && (
                <div className="glass-dark rounded-3xl p-10 text-center text-gray-500">
                  <div className="text-4xl mb-2">📱</div>
                  لا طلبات في هذه الحالة
                </div>
              )}
            </div>
          )}

          {/* كيف يعمل */}
          <div className="glass-dark rounded-3xl p-5">
            <h2 className="font-extrabold text-white mb-2">💡 كيف يعمل النظام؟</h2>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal pr-5">
              <li>البائع/السائق/العميل يطلب التطبيق من بطاقة «تطبيق اللوحة» في لوحته</li>
              <li>يصلك الطلب هنا وفي جرس التنبيهات 🔔</li>
              <li>عند الموافقة يظهر للمستخدم زر «📲 ثبّت لوحتك كتطبيق» فوراً</li>
              <li>التطبيق يُركَّب باسم اللوحة ولونها وأيقونة المنصة — مستقل على جواله</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
