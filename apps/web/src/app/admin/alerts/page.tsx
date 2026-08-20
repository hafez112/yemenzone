'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// 🔔 مركز تنبيهات الإدارة — كل ما يحتاج إجراءً الآن في مكان واحد
export default function AdminAlertsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  const load = () => api('/admin/alerts').then(setData).catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
    const t = setInterval(load, 30000); // تحديث حي كل 30 ثانية
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-black mb-1">🔔 تنبيهات الإدارة</h1>
              <p className="text-sm text-gray-500">العناصر التي تحتاج إجراءً الآن — تتحدث تلقائياً كل ٣٠ ثانية</p>
            </div>
            <button className="btn" onClick={load}>🔄 تحديث</button>
          </div>

          {!data && <div className="card text-center py-10">⏳ جارٍ التحميل…</div>}

          {data && (
            <>
              {/* بطاقة الإجمالي */}
              <div className="card mb-4 text-center"
                style={data.total > 0
                  ? { background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #f59e0b' }
                  : { background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #10b981' }}>
                <div className="text-4xl mb-1">{data.total > 0 ? '⏳' : '✨'}</div>
                <b className={data.total > 0 ? 'text-amber-800' : 'text-emerald-800'}>
                  {data.total > 0 ? `${data.total} عنصر بانتظار إجرائك` : 'لا شيء معلّق — كل شيء تحت السيطرة'}
                </b>
              </div>

              {/* مجموعات التنبيهات */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {data.groups.map((g: any) => (
                  <Link key={g.key} href={g.link}
                    className={`card text-center transition-all hover:-translate-y-0.5 hover:shadow-lg ${g.count > 0 ? '' : 'opacity-50'}`}>
                    <div className="text-2xl mb-1">{g.icon}</div>
                    <div className="text-2xl font-black" style={{ color: g.count > 0 ? 'var(--primary)' : '#9ca3af' }}>{g.count}</div>
                    <div className="text-[11px] font-bold text-gray-500">{g.label}</div>
                  </Link>
                ))}
              </div>

              {/* أحدث العناصر المعلقة */}
              <div className="card">
                <h3 className="font-black mb-3">⚡ أحدث ما يحتاج إجراءً</h3>
                {data.recent.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">لا عناصر معلقة حالياً 🎉</p>
                )}
                <div className="space-y-2">
                  {data.recent.map((r: any, i: number) => (
                    <Link key={i} href={r.link}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-purple-50 transition-all">
                      <span className="text-xl shrink-0">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <b className="text-sm block truncate">{r.title}</b>
                        <span className="text-[11px] text-gray-400 block truncate">{r.body}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {r.at ? new Date(r.at).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </span>
                      <span className="text-purple-400 shrink-0">←</span>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
