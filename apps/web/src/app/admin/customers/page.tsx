'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// إدارة العملاء: بحث/تفعيل/تعليق/حذف
export default function AdminCustomers() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState('');

  async function load() {
    setCustomers(await api(`/admin/customers?q=${encodeURIComponent(q)}`));
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load().catch(() => router.push('/auth/admin-login'));
  }, []);

  async function act(fn: () => Promise<any>, msg: string) {
    try { await fn(); toast(msg); await load(); }
    catch (e: any) { toast(e.message, 'error'); }
  }

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white mb-4">👥 العملاء ({customers.length})</h1>
          <div className="flex gap-2 mb-4">
            <input value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              placeholder="🔍 ابحث بالاسم أو الجوال..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 outline-none" />
            <button onClick={load} className="px-5 rounded-xl text-white font-bold" style={{ background: 'var(--primary)' }}>بحث</button>
          </div>

          <div className="space-y-2 stagger">
            {customers.map(c => (
              <div key={c.id} className="glass-dark rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-extrabold text-white">👤 {c.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${
                    c.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>{c.status === 'active' ? 'نشط' : c.status === 'suspended' ? 'معلق' : 'محظور'}</span>
                  <div className="text-xs text-gray-500 mt-1">
                    📱 <span dir="ltr">{c.phone}</span> • 🛒 {c._count.orders} طلب • ⭐ {c._count.reviews} تقييم
                    {c.governorate && ` • 📍 ${c.governorate}`}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {c.status !== 'active' ? (
                    <button onClick={() => act(() => api(`/admin/customers/${c.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) }), '✅ تم التفعيل')}
                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400">تفعيل</button>
                  ) : (
                    <button onClick={() => act(() => api(`/admin/customers/${c.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'suspended' }) }), '⏸️ تم التعليق')}
                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400">تعليق</button>
                  )}
                  <button onClick={() => { if (confirm(`حذف العميل "${c.name}"؟`)) act(() => api(`/admin/customers/${c.id}`, { method: 'DELETE' }), '🗑️ تم الحذف'); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-500/20 text-red-400">🗑️</button>
                </div>
              </div>
            ))}
            {customers.length === 0 && (
              <div className="glass-dark rounded-3xl p-10 text-center text-gray-500">لا نتائج</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
