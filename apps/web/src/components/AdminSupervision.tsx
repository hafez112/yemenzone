'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';
import AdminSidebar from '@/components/AdminSidebar';

// إشراف المدير على الإيجارات/الغرف/الخدمات — فلترة/إخفاء/حذف + الحجوزات
export default function AdminSupervision({ kind, title, icon }: { kind: string; title: string; icon: string }) {
  const { list: CURS, def: defCur } = useCurrency();
  const dsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<'items' | 'bookings'>('items');
  const [q, setQ] = useState('');

  async function load() {
    const [its, bks] = await Promise.all([
      api(`/admin/supervision/${kind}/items?q=${encodeURIComponent(q)}`),
      api(`/admin/supervision/${kind}/bookings`),
    ]);
    setItems(its); setBookings(bks);
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
          <h1 className="text-2xl font-black text-white mb-4">{icon} {title}</h1>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab('items')}
              className={`px-5 py-2 rounded-full text-sm font-bold ${tab === 'items' ? 'text-white' : 'text-gray-400 bg-white/5'}`}
              style={tab === 'items' ? { background: 'var(--primary)' } : {}}>
              العناصر ({items.length})
            </button>
            <button onClick={() => setTab('bookings')}
              className={`px-5 py-2 rounded-full text-sm font-bold ${tab === 'bookings' ? 'text-white' : 'text-gray-400 bg-white/5'}`}
              style={tab === 'bookings' ? { background: 'var(--primary)' } : {}}>
              الحجوزات ({bookings.length})
            </button>
          </div>

          {tab === 'items' && (
            <>
              <div className="flex gap-2 mb-4">
                <input value={q} onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && load()}
                  placeholder="🔍 بحث..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 outline-none" />
                <button onClick={load} className="px-5 rounded-xl text-white font-bold" style={{ background: 'var(--primary)' }}>بحث</button>
              </div>
              <div className="space-y-2 stagger">
                {items.map((it: any) => (
                  <div key={it.id} className={`glass-dark rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2 ${it.isHidden ? 'opacity-50' : ''}`}>
                    <div>
                      <span className="font-extrabold text-white text-sm">{it.title}</span>
                      {it.isHidden && <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full font-bold mr-2">🙈 مخفي</span>}
                      <div className="text-xs text-gray-500 mt-1">
                        🏪 {it.store.name} • 💰 {Number(it.pricePerDay || it.pricePerNight || it.price).toLocaleString()} {dsym(it.currency)} • 📅 {it._count.bookings} حجز
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => act(() => api(`/admin/supervision/${kind}/${it.id}/hide`, { method: 'PATCH' }), it.isHidden ? '👁️ تم الإظهار' : '🙈 تم الإخفاء')}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400">
                        {it.isHidden ? 'إظهار' : 'إخفاء'}
                      </button>
                      <button onClick={() => { if (confirm(`حذف "${it.title}"؟`)) act(() => api(`/admin/supervision/${kind}/${it.id}`, { method: 'DELETE' }), '🗑️ تم الحذف'); }}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-500/20 text-red-400">🗑️</button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="glass-dark rounded-3xl p-10 text-center text-gray-500">لا عناصر</div>}
              </div>
            </>
          )}

          {tab === 'bookings' && (
            <div className="space-y-2 stagger">
              {bookings.map((b: any) => {
                const item = b.unit || b.room || b.service;
                return (
                  <div key={b.id} className="glass-dark rounded-2xl p-4">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-white text-sm">{item?.title}</span>
                      <span className="text-xs font-bold text-amber-400">{b.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      🏪 {item?.store?.name} • 👤 {b.customerName} • 📱 <span dir="ltr">{b.customerPhone}</span>
                      • 💰 {Number(b.total).toLocaleString()} {dsym(b.currency)}
                    </div>
                  </div>
                );
              })}
              {bookings.length === 0 && <div className="glass-dark rounded-3xl p-10 text-center text-gray-500">لا حجوزات</div>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
