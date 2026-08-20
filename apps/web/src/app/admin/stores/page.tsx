'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';

// الصلاحيات القابلة للمنح — تطابق FEATURE_AR في الخادم
const GRANTABLE: Record<string, string> = {
  analytics: '📊 الإحصائيات المتقدمة',
  coupons: '🎟️ الكوبونات',
  api: '🔑 API للمطورين',
  customDesign: '🎨 تخصيص التصميم',
  customDomain: '🌐 النطاق الخاص',
  campaigns: '📣 حملات الزبائن',
};

const STATUS_AR: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'نشط', color: '#059669', bg: 'rgba(5,150,105,.12)' },
  suspended: { label: 'معلق', color: '#d97706', bg: 'rgba(217,119,6,.12)' },
  banned: { label: 'محظور', color: '#dc2626', bg: 'rgba(220,38,38,.12)' },
};

// إدارة المتاجر والتجار: بحث/تفعيل/تعليق/توثيق/تمييز/صلاحيات/حذف
export default function AdminStores() {
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [grantStore, setGrantStore] = useState<any>(null);
  const [grants, setGrants] = useState<Record<string, boolean>>({});
  const [savingGrants, setSavingGrants] = useState(false);

  async function load() {
    setLoading(true);
    try { setStores(await api(`/admin/stores?q=${encodeURIComponent(q)}&status=${filter}`)); }
    catch (e: any) { toast(e.message, 'error'); }
    setLoading(false);
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, [filter]);

  async function act(fn: () => Promise<any>, msg: string) {
    try { await fn(); toast(msg); await load(); }
    catch (e: any) { toast(e.message, 'error'); }
  }

  function openGrants(s: any) {
    setGrantStore(s);
    const g: Record<string, boolean> = {};
    for (const k of Object.keys(GRANTABLE)) g[k] = !!(s.grants as any)?.[k];
    setGrants(g);
  }

  async function saveGrants() {
    if (!grantStore) return;
    setSavingGrants(true);
    try {
      await api(`/admin/stores/${grantStore.id}/grants`, { method: 'PATCH', body: JSON.stringify({ grants }) });
      toast('🔑 حُفظت الصلاحيات — تعمل فوراً على متجر البائع');
      setGrantStore(null);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSavingGrants(false);
  }

  const featuredRequests = stores.filter(s => s.featuredRequested && !s.isFeatured);
  // 🗂️ متاجر نشطة لم تُدرج في الدليل بعد — بانتظار موافقة الإدارة
  const pendingListing = stores.filter(s => s.status === 'active' && !s.isListed);
  const counts = {
    all: stores.length,
    active: stores.filter(s => s.status === 'active').length,
    suspended: stores.filter(s => s.status === 'suspended').length,
    banned: stores.filter(s => s.status === 'banned').length,
    verified: stores.filter(s => s.isVerified).length,
  };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <div className="row between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
            <div>
              <h1 className="text-2xl font-black" style={{ marginBottom: '.15rem' }}>🏪 إدارة المتاجر والتجار</h1>
              <p className="text-sm muted">توثيق، تمييز، صلاحيات استثنائية، وحالات المتاجر — قرارك نهائي</p>
            </div>
          </div>

          {/* شريط الإحصاءات */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 my-4">
            {[
              { icon: '🏪', v: counts.all, l: 'إجمالي المتاجر', c: 'var(--primary, #6C3DF5)' },
              { icon: '✅', v: counts.active, l: 'نشطة', c: '#059669' },
              { icon: '⏸️', v: counts.suspended, l: 'معلقة', c: '#d97706' },
              { icon: '🚫', v: counts.banned, l: 'محظورة', c: '#dc2626' },
              { icon: '🎖️', v: counts.verified, l: 'موثقة', c: '#0d9488' },
            ].map((s, i) => (
              <div key={i} className="card !mb-0 !p-3 text-center">
                <div className="text-xl font-black" style={{ color: s.c }}>{s.icon} {s.v}</div>
                <div className="text-[10px] muted font-bold">{s.l}</div>
              </div>
            ))}
          </div>

          {/* بحث + فلترة */}
          <div className="card !p-3 mb-3">
            <div className="flex gap-2">
              <input value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load()}
                placeholder="🔍 ابحث باسم المتجر أو البائع..."
                className="flex-1" style={{ marginBottom: 0 }} />
              <button onClick={load} className="btn primary">بحث</button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[['', 'الكل'], ['active', '✅ نشط'], ['suspended', '⏸️ معلق'], ['banned', '🚫 محظور']].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)} className={'btn small ' + (filter === v ? 'primary' : 'ghost')}>{l}</button>
              ))}
            </div>
          </div>

          {/* 🗂️ متاجر بانتظار الظهور في دليل المتاجر */}
          {pendingListing.length > 0 && (
            <div className="card" style={{ border: '1.5px solid rgba(13,148,136,.4)', background: 'rgba(13,148,136,.05)' }}>
              <div className="font-extrabold text-sm mb-2" style={{ color: '#0f766e' }}>🗂️ متاجر بانتظار موافقتك للظهور في الدليل ({pendingListing.length})</div>
              {pendingListing.map(s => (
                <div key={s.id} className="row between" style={{ padding: '.35rem 0' }}>
                  <span className="text-sm font-bold">{s.type?.icon} {s.name} <span className="muted text-xs">👤 {s.seller.name}</span></span>
                  <div className="flex gap-1.5">
                    <button onClick={() => act(() => api(`/admin/stores/${s.id}/listed`, { method: 'PATCH' }), '🗂️ أُدرج في الدليل — يظهر الآن للزوار')}
                      className="btn small" style={{ background: 'rgba(13,148,136,.15)', color: '#0f766e' }}>✓ إدراج في الدليل</button>
                    <a href={`/store/${s.slug}`} target="_blank" className="btn small ghost" style={{ textDecoration: 'none' }}>👁️</a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ⭐ طلبات التمييز المعلقة */}
          {featuredRequests.length > 0 && (
            <div className="card" style={{ border: '1.5px solid rgba(217,119,6,.4)', background: 'rgba(217,119,6,.05)' }}>
              <div className="font-extrabold text-sm mb-2" style={{ color: '#b45309' }}>⭐ طلبات تمييز بانتظار قرارك ({featuredRequests.length})</div>
              {featuredRequests.map(s => (
                <div key={s.id} className="row between" style={{ padding: '.35rem 0' }}>
                  <span className="text-sm font-bold">{s.type?.icon} {s.name}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => act(() => api(`/admin/stores/${s.id}/featured`, { method: 'PATCH' }), '⭐ تم التمييز — يظهر الآن في الرئيسية')}
                      className="btn small" style={{ background: 'rgba(217,119,6,.15)', color: '#b45309' }}>⭐ موافقة</button>
                    <button onClick={() => act(() => api(`/admin/stores/${s.id}/featured-reject`, { method: 'PATCH' }), 'تم رفض الطلب')}
                      className="btn small danger">رفض</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* القائمة */}
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
          ) : (
            <div className="space-y-2 stagger">
              {stores.map(s => {
                const st = STATUS_AR[s.status] || STATUS_AR.active;
                return (
                  <div key={s.id} className="card !mb-0 !p-3">
                    <div className="flex items-start gap-3">
                      {/* الشعار */}
                      <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-xl shrink-0"
                        style={{ background: 'rgba(127,127,127,.1)', border: '1px solid rgba(127,127,127,.15)' }}>
                        {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover" /> : (s.type?.icon || '🏪')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <b className="text-[15px]">{s.name}</b>
                          {s.isVerified && <span title="موثق">✅</span>}
                          {s.isFeatured && <span title="متميز">⭐</span>}
                          <span title={s.isListed ? 'ظاهر في دليل المتاجر' : 'مخفي من دليل المتاجر — بانتظار الموافقة'}
                            style={{ opacity: s.isListed ? 1 : .45 }}>{s.isListed ? '🗂️' : '🚫🗂️'}</span>
                          {s.sellerLevel && s.sellerLevel.id !== 'bronze' && (
                            <span className="badge" style={{ color: s.sellerLevel.color, background: 'rgba(127,127,127,.1)' }}
                              title={`مستوى البائع: ${s.sellerLevel.name}`}>
                              {s.sellerLevel.icon} {s.sellerLevel.name}
                            </span>
                          )}
                          <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                        <div className="text-xs muted mt-1">
                          👤 {s.seller.name} • 📱 <span dir="ltr">{s.seller.phone}</span> • {s.subscription?.plan?.name || 'مجاني'}
                          {Object.keys((s.grants as any) || {}).length > 0 && <span style={{ color: '#059669' }}> • 🔑 صلاحيات خاصة</span>}
                        </div>
                        <div className="text-xs muted mt-1">
                          🛒 {s._count.orders} طلب • 📦 {s._count.products} منتج • ⭐ {s.ratingAvg?.toFixed(1)} • 🧠 {s.smartScore.toFixed(0)}
                        </div>
                      </div>
                    </div>
                    {/* الإجراءات */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <button onClick={() => act(() => api(`/admin/stores/${s.id}/verify`, { method: 'PATCH' }), s.isVerified ? 'تم إلغاء التوثيق' : '🎖️ تم التوثيق')}
                        className="btn small" style={s.isVerified ? { background: 'rgba(217,119,6,.14)', color: '#b45309' } : { background: 'rgba(5,150,105,.12)', color: '#047857' }}>
                        {s.isVerified ? 'إلغاء التوثيق' : '🎖️ توثيق'}
                      </button>
                      <button onClick={() => act(() => api(`/admin/stores/${s.id}/featured`, { method: 'PATCH' }), s.isFeatured ? 'تم إلغاء التمييز' : '⭐ تم التمييز — يظهر في الرئيسية')}
                        className="btn small" style={s.isFeatured ? { background: 'rgba(217,119,6,.2)', color: '#b45309' } : {}}>
                        {s.isFeatured ? '⭐ متميز — إلغاء' : '☆ تمييز'}
                      </button>
                      <button onClick={() => act(() => api(`/admin/stores/${s.id}/listed`, { method: 'PATCH' }), s.isListed ? 'أُخفي من دليل المتاجر' : '🗂️ أُدرج في الدليل — يظهر الآن للزوار')}
                        className="btn small" style={s.isListed ? { background: 'rgba(13,148,136,.14)', color: '#0f766e' } : {}}>
                        {s.isListed ? '🗂️ مُدرج — إخفاء' : '🗂️ إدراج بالدليل'}
                      </button>
                      <button onClick={() => openGrants(s)} className="btn small" style={{ background: 'rgba(108,61,245,.12)', color: 'var(--primary, #6C3DF5)' }}>
                        🔑 صلاحيات
                      </button>
                      {s.status !== 'active' && (
                        <button onClick={() => act(() => api(`/admin/stores/${s.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) }), '✅ تم التفعيل')}
                          className="btn small" style={{ background: 'rgba(5,150,105,.12)', color: '#047857' }}>تفعيل</button>
                      )}
                      {s.status === 'active' && (
                        <button onClick={() => act(() => api(`/admin/stores/${s.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'suspended' }) }), '⏸️ تم التعليق')}
                          className="btn small" style={{ background: 'rgba(217,119,6,.14)', color: '#b45309' }}>تعليق</button>
                      )}
                      <button onClick={() => act(() => api(`/admin/sellers/${s.seller.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'banned' }) }), '🚫 تم حظر البائع')}
                        className="btn small danger">حظر البائع</button>
                      <a href={`/store/${s.slug}`} target="_blank" className="btn small ghost" style={{ textDecoration: 'none' }}>👁️ معاينة</a>
                      <button onClick={() => { if (confirm(`حذف متجر "${s.name}" نهائياً مع كل بياناته؟`)) act(() => api(`/admin/stores/${s.id}`, { method: 'DELETE' }), '🗑️ تم الحذف'); }}
                        className="btn small danger">🗑️ حذف</button>
                    </div>
                  </div>
                );
              })}
              {stores.length === 0 && (
                <div className="card text-center py-8 muted">لا نتائج مطابقة للبحث</div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* 🔑 نافذة منح الصلاحيات الاستثنائية */}
      {grantStore && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-end sm:items-center justify-center p-3"
          onClick={() => setGrantStore(null)}>
          <div className="card w-full max-w-md anim-bounce-in" onClick={e => e.stopPropagation()}>
            <h2 className="font-extrabold mb-1">🔑 صلاحيات خاصة — {grantStore.name}</h2>
            <p className="text-xs muted mb-4">
              هذه الصلاحيات <b>تتجاوز حدود الخطة</b> — أنت المتحكم الوحيد بها، وتعمل فور حفظها
            </p>
            <div className="space-y-2 mb-4">
              {Object.entries(GRANTABLE).map(([k, label]) => {
                const planHas = !!(grantStore.subscription?.plan?.features as any)?.[k];
                return (
                  <button key={k} onClick={() => setGrants({ ...grants, [k]: !grants[k] })}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all"
                    style={grants[k]
                      ? { background: 'rgba(5,150,105,.12)', color: '#047857', border: '1px solid rgba(5,150,105,.35)' }
                      : { background: 'rgba(127,127,127,.07)', border: '1px solid rgba(127,127,127,.15)' }}>
                    <span>{label}</span>
                    <span className="text-xs">{grants[k] ? '🎁 ممنوحة' : planHas ? 'ضمن خطته' : '—'}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] muted mb-3">💡 "ضمن خطته" = الميزة مفتوحة أصلاً بخطته الحالية — لا حاجة لمنحها</p>
            <div className="flex gap-2">
              <button onClick={saveGrants} disabled={savingGrants}
                className="btn primary flex-1" style={{ justifyContent: 'center' }}>
                {savingGrants ? '⏳ جاري الحفظ...' : '💾 حفظ الصلاحيات'}
              </button>
              <button onClick={() => setGrantStore(null)} className="btn ghost">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
