'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

const STATUS_AR: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'نشط', color: '#059669', bg: 'rgba(5,150,105,.12)' },
  suspended: { label: 'معلق', color: '#d97706', bg: 'rgba(217,119,6,.12)' },
  banned: { label: 'محظور', color: '#dc2626', bg: 'rgba(220,38,38,.12)' },
};

// 🏬 إدارة المولات التجارية — إدارة منفصلة: نظرة شاملة + تفعيل/تعليق/توثيق/تمييز
export default function AdminMalls() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    try { setData(await api(`/admin/malls?q=${encodeURIComponent(q)}`)); }
    catch (e: any) { toast(e.message, 'error'); }
    setLoading(false);
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, []);

  async function act(fn: () => Promise<any>, msg: string) {
    try { await fn(); toast(msg); await load(); }
    catch (e: any) { toast(e.message, 'error'); }
  }

  const malls: any[] = data?.items || [];
  const t = data?.totals || { malls: 0, active: 0, products: 0, orders: 0, revenue: 0 };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <div className="row between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
            <div>
              <h1 className="text-2xl font-black" style={{ marginBottom: '.15rem' }}>🏬 إدارة المولات التجارية</h1>
              <p className="text-sm muted">السوق الإلكتروني الكبير — إشراف كامل على المولات وإيراداتها ومنتجاتها</p>
            </div>
            <a href="/admin/plans" className="btn ghost small">💎 خطط المولات</a>
          </div>

          {/* شريط الإحصاءات الشامل */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 my-4">
            {[
              { icon: '🏬', v: t.malls, l: 'مول تجاري', c: '#7C3AED' },
              { icon: '✅', v: t.active, l: 'نشط', c: '#059669' },
              { icon: '📦', v: t.products, l: 'منتج معروض', c: '#2563EB' },
              { icon: '🛒', v: t.orders, l: 'طلب', c: '#F59E0B' },
              { icon: '💰', v: `${t.revenue.toLocaleString()}`, l: 'إيرادات محققة (ر.ي)', c: '#0d9488' },
            ].map((s, i) => (
              <div key={i} className="card !mb-0 !p-3 text-center">
                <div className="text-lg font-black" style={{ color: s.c }}>{s.icon} {s.v}</div>
                <div className="text-[10px] muted font-bold">{s.l}</div>
              </div>
            ))}
          </div>

          {/* بحث */}
          <div className="card !p-3 mb-3">
            <div className="flex gap-2">
              <input value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load()}
                placeholder="🔍 ابحث باسم المول..."
                className="flex-1" style={{ marginBottom: 0 }} />
              <button onClick={load} className="btn primary">بحث</button>
            </div>
          </div>

          {/* قائمة المولات */}
          {loading ? (
            <div className="card text-center muted">⏳ جاري التحميل...</div>
          ) : malls.length === 0 ? (
            <div className="card text-center muted">
              <div className="text-4xl mb-2">🏬</div>
              لا مولات تجارية بعد — تُنشأ من أنواع المتاجر بنشاط «مول تجاري»
            </div>
          ) : (
            <div className="space-y-2">
              {malls.map((m: any) => {
                const st = STATUS_AR[m.status] || STATUS_AR.active;
                return (
                  <div key={m.id} className="card !mb-0 !p-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: 'rgba(124,58,237,.12)' }}>🏬</div>
                      <div className="flex-1 min-w-[160px]">
                        <div className="font-extrabold flex items-center gap-1.5">
                          {m.name}
                          {m.isVerified && <span title="موثق">✅</span>}
                          {m.isFeatured && <span title="مميز في الواجهة">⭐</span>}
                        </div>
                        <div className="text-[11px] muted">
                          👤 {m.seller?.name} · 📱 <span dir="ltr">{m.seller?.phone}</span>
                          {m.subscription?.plan && <> · 💎 {m.subscription.plan.name} ({Number(m.subscription.plan.priceMonthly).toLocaleString()} ر.ي/شهر)</>}
                        </div>
                      </div>
                      <div className="flex gap-3 text-center shrink-0">
                        <div><div className="font-black text-sm">{m._count.products}</div><div className="text-[9px] muted font-bold">منتج</div></div>
                        <div><div className="font-black text-sm">{m._count.categories}</div><div className="text-[9px] muted font-bold">صنف</div></div>
                        <div><div className="font-black text-sm">{m._count.orders}</div><div className="text-[9px] muted font-bold">طلب</div></div>
                        <div><div className="font-black text-sm" style={{ color: '#0d9488' }}>{m.revenue.toLocaleString()}</div><div className="text-[9px] muted font-bold">إيراد ر.ي</div></div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-1 rounded-full shrink-0"
                        style={{ color: st.color, background: st.bg }}>{st.label}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      <a href={`/store/${m.slug}`} target="_blank" className="btn ghost small">👁️ عرض</a>
                      <button onClick={() => act(() => api(`/admin/stores/${m.id}/verify`, { method: 'PATCH' }), m.isVerified ? 'أُلغي التوثيق' : '🎖️ تم التوثيق')}
                        className="btn ghost small">{m.isVerified ? '✕ إلغاء التوثيق' : '🎖️ توثيق'}</button>
                      <button onClick={() => act(() => api(`/admin/stores/${m.id}/featured`, { method: 'PATCH' }), m.isFeatured ? 'أُزيل من المميزة' : '⭐ أصبح مميزاً')}
                        className="btn ghost small">{m.isFeatured ? '✕ إزالة التمييز' : '⭐ تمييز'}</button>
                      {m.status === 'active' ? (
                        <button onClick={() => act(() => api(`/admin/stores/${m.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'suspended' }) }), '⏸️ عُلّق المول')}
                          className="btn ghost small" style={{ color: '#d97706' }}>⏸️ تعليق</button>
                      ) : (
                        <button onClick={() => act(() => api(`/admin/stores/${m.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) }), '✅ فُعّل المول')}
                          className="btn ghost small" style={{ color: '#059669' }}>✅ تفعيل</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
