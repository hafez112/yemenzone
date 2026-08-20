'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';
import ImageUpload from '@/components/ImageUpload';

// 📢 إدارة إعلانات المنصة — تظهر في الرئيسية حسب الموضع والجدولة
const STATUS_AR: Record<string, { label: string; cls: string }> = {
  live:      { label: '🟢 مباشر',   cls: 'bg-emerald-500/20 text-emerald-400' },
  paused:    { label: '⏸️ متوقف',  cls: 'bg-gray-500/20 text-gray-400' },
  scheduled: { label: '🕐 مجدول',  cls: 'bg-blue-500/20 text-blue-400' },
  expired:   { label: '⌛ منتهي',  cls: 'bg-red-500/20 text-red-400' },
};

const emptyAd = { id: '', title: '', image: '', link: '', position: 'home_top', size: 'wide', sort: 0, startsAt: '', endsAt: '', isActive: true };

export default function AdminAdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<any[]>([]);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [posFilter, setPosFilter] = useState('');
  const [form, setForm] = useState<any>({ ...emptyAd });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<any>({ home_top: 0, home_mid: 0 });
  const [showPricing, setShowPricing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  async function load() {
    const [a, p, pr, sz] = await Promise.all([api('/admin/ads'), api('/admin/ads/positions'), api('/admin/ads/pricing'), api('/admin/ads/sizes')]);
    setAds(a);
    setPositions(p);
    setPricing(pr);
    setSizes(sz);
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load().catch(() => router.push('/auth/admin-login'));
  }, []);

  async function save() {
    if (!form.title.trim()) return toast('⚠️ عنوان الإعلان مطلوب', 'error');
    if (!form.image) return toast('⚠️ ارفع صورة الإعلان من جهازك أولاً', 'error');
    setSaving(true);
    try {
      const body: any = { ...form };
      if (!body.id) delete body.id;
      if (!body.startsAt) delete body.startsAt;
      if (!body.endsAt) body.endsAt = null;
      await api('/admin/ads', { method: 'POST', body: JSON.stringify(body) });
      toast(form.id ? '✅ تم تحديث الإعلان' : '📢 نُشر الإعلان — يظهر الآن في الرئيسية');
      setForm({ ...emptyAd });
      setShowForm(false);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSaving(false);
  }

  async function act(fn: () => Promise<any>, msg: string) {
    try { await fn(); toast(msg); await load(); }
    catch (e: any) { toast(e.message, 'error'); }
  }

  async function savePricing() {
    setSavingPricing(true);
    try {
      await api('/admin/ads/pricing', { method: 'PATCH', body: JSON.stringify({ home_top: Number(pricing.home_top), home_mid: Number(pricing.home_mid), home_bottom: Number(pricing.home_bottom) }) });
      toast('💰 حُفظ تسعير الإعلانات — يعمل فوراً على طلبات البائعين الجديدة');
      setShowPricing(false);
    } catch (e: any) { toast(e.message, 'error'); }
    setSavingPricing(false);
  }

  const filtered = posFilter ? ads.filter(a => a.position === posFilter) : ads;
  const totalViews = ads.reduce((s, a) => s + a.views, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);
  const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h1 className="text-2xl font-black text-white">📢 إدارة الإعلانات</h1>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setShowPricing(!showPricing)}
                className="bg-white/10 text-gray-200 text-sm font-extrabold px-4 py-2.5 rounded-2xl">
                💰 التسعير
              </button>
              <button onClick={() => { setForm({ ...emptyAd }); setShowForm(true); }}
                className="btn-primary text-white text-sm font-extrabold px-5 py-2.5 rounded-2xl">
                ➕ إعلان جديد
              </button>
            </div>
          </div>

          {/* 💰 تسعير حجز البائعين */}
          {showPricing && (
            <div className="glass-dark rounded-3xl p-5 mb-4 border border-amber-400/30">
              <h2 className="font-extrabold text-white mb-1">💰 سعر الأسبوع لكل موضع</h2>
              <p className="text-[11px] text-gray-400 mb-3">البائع يحجز بهذا السعر — دفعته تصل لمركز المدفوعات وتوافق عليها من هناك</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {['home_top', 'home_mid', 'home_bottom'].filter(k => positions[k]).map((k) => (
                  <label key={k} className="text-[11px] text-gray-400">
                    {positions[k]}
                    <input type="number" value={pricing[k] ?? 0}
                      onChange={e => setPricing({ ...pricing, [k]: e.target.value })}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white outline-none" />
                  </label>
                ))}
              </div>
              <button onClick={savePricing} disabled={savingPricing}
                className="btn-primary w-full py-3 rounded-2xl text-white font-extrabold text-sm disabled:opacity-40">
                {savingPricing ? '⏳ جاري الحفظ...' : '💾 حفظ التسعير'}
              </button>
            </div>
          )}

          {/* إحصائيات */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              [ads.length, 'إعلان', '📢'],
              [ads.filter(a => a.smartStatus === 'live').length, 'مباشر', '🟢'],
              [totalViews.toLocaleString(), 'مشاهدة', '👁️'],
              [`${avgCtr}%`, 'نسبة النقر', '🎯'],
            ].map(([v, l, i]) => (
              <div key={String(l)} className="glass-dark rounded-2xl p-3 text-center">
                <div className="text-lg">{i}</div>
                <div className="text-white font-black text-sm">{v}</div>
                <div className="text-[10px] text-gray-500">{l}</div>
              </div>
            ))}
          </div>

          {/* فلتر الموضع */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setPosFilter('')}
              className={`px-4 py-2 rounded-full text-xs font-bold ${!posFilter ? 'text-white' : 'text-gray-400 bg-white/5'}`}
              style={!posFilter ? { background: 'var(--primary)' } : {}}>الكل</button>
            {Object.entries(positions).map(([k, label]) => (
              <button key={k} onClick={() => setPosFilter(k)}
                className={`px-4 py-2 rounded-full text-xs font-bold ${posFilter === k ? 'text-white' : 'text-gray-400 bg-white/5'}`}
                style={posFilter === k ? { background: 'var(--primary)' } : {}}>{label}</button>
            ))}
          </div>

          {/* نموذج إنشاء/تعديل */}
          {showForm && (
            <div className="glass-dark rounded-3xl p-5 mb-4 border border-purple-400/30">
              <h2 className="font-extrabold text-white mb-3">{form.id ? '✏️ تعديل إعلان' : '📢 إعلان جديد'}</h2>
              <div className="space-y-3">
                <ImageUpload endpoint="/admin/ads/upload" field="image" ratio="aspect-[16/6]"
                  value={form.image} onChange={url => setForm({ ...form, image: url })}
                  label="📷 ارفع صورة الإعلان من جهازك" hint="عريضة 16:6 — حتى 5MB" />
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="عنوان الإعلان (يظهر على البانر)"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 outline-none" />
                <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })}
                  placeholder="رابط عند الضغط (اختياري) — https://..." dir="ltr"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] text-gray-400">📍 المكانة في الرئيسية
                    <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none">
                      {Object.entries(positions).map(([k, label]) => <option key={k} value={k} className="text-gray-900">{label}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] text-gray-400">📐 حجم العرض
                    <select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none">
                      {Object.entries(sizes).map(([k, label]) => <option key={k} value={k} className="text-gray-900">{label}</option>)}
                    </select>
                  </label>
                </div>
                <input type="number" value={form.sort} onChange={e => setForm({ ...form, sort: Number(e.target.value) })}
                  placeholder="الترتيب (0 = أول)"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] text-gray-400">يبدأ
                    <input type="date" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white outline-none" />
                  </label>
                  <label className="text-[11px] text-gray-400">ينتهي (فارغ = دائم)
                    <input type="date" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white outline-none" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={save} disabled={saving}
                    className="flex-1 btn-primary text-white font-extrabold py-3 rounded-2xl text-sm disabled:opacity-40">
                    {saving ? '⏳ جاري النشر...' : form.id ? '💾 حفظ التعديلات' : '📢 نشر الإعلان'}
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="px-5 rounded-2xl bg-white/10 text-gray-300 font-bold text-sm">إلغاء</button>
                </div>
              </div>
            </div>
          )}

          {/* قائمة الإعلانات */}
          <div className="space-y-3 stagger">
            {filtered.map(a => (
              <div key={a.id} className="glass-dark rounded-3xl overflow-hidden">
                <div className="relative aspect-[16/5]">
                  <img src={imgUrl(a.image)} alt={a.title} className="absolute inset-0 w-full h-full object-cover" />
                  <span className={`absolute top-2 right-2 text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_AR[a.smartStatus]?.cls}`}>
                    {STATUS_AR[a.smartStatus]?.label}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="font-extrabold text-white text-sm">
                        {a.title}
                        {a.storeId && <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full mr-1.5">💰 إعلان بائع</span>}
                      </div>
                      <div className="text-[11px] text-gray-500">{a.positionLabel} • {a.sizeLabel || ''} • ترتيب {a.sort}{a.storeId ? ` • ${a.weeks} أسبوع` : ''}</div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-gray-400">👁️ {a.views.toLocaleString()} • 🎯 {a.ctr}%</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => { setForm({ ...a, startsAt: a.startsAt?.slice(0, 10) || '', endsAt: a.endsAt?.slice(0, 10) || '' }); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400">✏️ تعديل</button>
                    <button onClick={() => act(() => api(`/admin/ads/${a.id}/toggle`, { method: 'PATCH' }), a.isActive ? '⏸️ توقف الإعلان' : '▶️ الإعلان مباشر')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full ${a.isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {a.isActive ? '⏸️ إيقاف' : '▶️ تفعيل'}
                    </button>
                    <button onClick={() => { if (confirm(`حذف إعلان "${a.title}" نهائياً؟`)) act(() => api(`/admin/ads/${a.id}`, { method: 'DELETE' }), '🗑️ حُذف الإعلان'); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-500/20 text-red-400">🗑️ حذف</button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="glass-dark rounded-3xl p-10 text-center text-gray-500">
                لا إعلانات بعد — اضغط "➕ إعلان جديد" وارفع أول بانر من جهازك
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
