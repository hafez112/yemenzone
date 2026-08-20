'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';
import ImageUpload from '@/components/ImageUpload';

// 📢 إعلاناتي المدفوعة — أحجز مساحة في الرئيسية، الإدارة توافق، يُبث فوراً
const STATUS_AR: Record<string, { label: string; cls: string }> = {
  live:      { label: '🟢 مباشر',        cls: 'bg-emerald-100 text-emerald-700' },
  paused:    { label: '⏸️ بانتظار الموافقة', cls: 'bg-amber-100 text-amber-700' },
  scheduled: { label: '🕐 مجدول',        cls: 'bg-blue-100 text-blue-700' },
  expired:   { label: '⌛ منتهي',        cls: 'bg-gray-100 text-gray-500' },
};

export default function SellerAdsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'store' | 'platform'>('store');
  const [form, setForm] = useState<any>({ title: '', image: '', link: '', position: 'home_top', weeks: 1 });
  const [bannerForm, setBannerForm] = useState<any>({ title: '', image: '', link: '' });
  const [showForm, setShowForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [sending, setSending] = useState(false);

  async function load() { setData(await api('/seller/ads')); }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    load().catch(() => router.push('/seller/setup'));
  }, []);

  async function create() {
    if (!form.title.trim()) return toast('⚠️ عنوان الإعلان مطلوب', 'error');
    if (!form.image) return toast('⚠️ ارفع صورة الإعلان من جهازك', 'error');
    setSending(true);
    try {
      const r = await api('/seller/ads', { method: 'POST', body: JSON.stringify({ ...form, weeks: Number(form.weeks) }) });
      toast('📢 ' + r.message);
      setForm({ title: '', image: '', link: '', position: 'home_top', weeks: 1 });
      setShowForm(false);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  // 🖼️ إنشاء بانر داخلي — فوري ومجاني (الخطة الذهبية)
  async function createBanner() {
    if (!bannerForm.title.trim()) return toast('⚠️ عنوان البانر مطلوب', 'error');
    if (!bannerForm.image) return toast('⚠️ ارفع صورة البانر من جهازك', 'error');
    setSending(true);
    try {
      const r = await api('/seller/ads', { method: 'POST', body: JSON.stringify({ ...bannerForm, position: 'store_top' }) });
      toast('✅ ' + r.message);
      setBannerForm({ title: '', image: '', link: '' });
      setShowBannerForm(false);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  async function toggleBanner(a: any) {
    try { await api(`/seller/ads/${a.id}/toggle`, { method: 'PATCH' }); toast(a.isActive ? '⏸️ أُوقف البانر مؤقتاً' : '▶️ البانر مباشر الآن'); await load(); }
    catch (e: any) { toast(e.message, 'error'); }
  }

  async function removeBanner(a: any) {
    if (!confirm(`حذف بانر "${a.title}" نهائياً؟`)) return;
    try { await api(`/seller/ads/${a.id}`, { method: 'DELETE' }); toast('🗑️ حُذف البانر'); await load(); }
    catch (e: any) { toast(e.message, 'error'); }
  }

  if (!data) return null;
  const { store, ads, pricing, positions, pendingPayment, features } = data;
  const total = (pricing?.[form.position] || 0) * Number(form.weeks || 1);
  const storeBanners = ads.filter((a: any) => a.isStoreBanner);
  const platformAds = ads.filter((a: any) => !a.isStoreBanner);

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-black">📢 إعلاناتي</h1>
            {tab === 'platform' && !pendingPayment && (
              <button onClick={() => setShowForm(!showForm)}
                className="btn-primary text-white text-sm font-extrabold px-5 py-2.5 rounded-2xl">
                ➕ إعلان جديد
              </button>
            )}
            {tab === 'store' && features?.storeAds && (
              <button onClick={() => setShowBannerForm(!showBannerForm)}
                className="btn-primary text-white text-sm font-extrabold px-5 py-2.5 rounded-2xl">
                🖼️ بانر جديد
              </button>
            )}
          </div>

          {/* التبويبات */}
          <div className="flex gap-2">
            <button onClick={() => setTab('store')}
              className={`px-4 py-2 rounded-full text-sm font-extrabold transition-all ${tab === 'store' ? 'text-white shadow' : 'bg-white/70 text-gray-500'}`}
              style={tab === 'store' ? { background: 'var(--primary)' } : {}}>
              🖼️ بنرات متجري ({storeBanners.length})
            </button>
            <button onClick={() => setTab('platform')}
              className={`px-4 py-2 rounded-full text-sm font-extrabold transition-all ${tab === 'platform' ? 'text-white shadow' : 'bg-white/70 text-gray-500'}`}
              style={tab === 'platform' ? { background: 'var(--primary)' } : {}}>
              🏠 إعلانات الرئيسية ({platformAds.length})
            </button>
          </div>

          {/* ═══ تبويب بنرات المتجر — ميزة الخطة الذهبية ═══ */}
          {tab === 'store' && (
            <>
              {!features?.storeAds ? (
                <div className="glass rounded-3xl p-8 text-center relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full opacity-15 anim-blob" style={{ background: '#f59e0b' }} />
                  <div className="text-4xl mb-2">👑</div>
                  <h2 className="font-black text-lg mb-1">بنرات المتجر الإعلانية — ميزة ذهبية</h2>
                  <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                    اعرض عروضك ومنتجاتك المميزة ببانرات متحركة أعلى صفحة متجرك — تُبث فوراً وبدون رسوم، حتى 5 بنرات مع تتبع المشاهدات والنقرات
                  </p>
                  <a href="/seller/subscription" className="inline-block text-white font-extrabold px-8 py-3 rounded-2xl text-sm"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    👑 الترقية للخطة الذهبية
                  </a>
                </div>
              ) : (
                <>
                  {showBannerForm && (
                    <div className="glass rounded-3xl p-5 space-y-3 gradient-border">
                      <h2 className="font-extrabold">🖼️ بانر جديد داخل متجرك</h2>
                      <ImageUpload endpoint="/seller/ads/upload" field="image" ratio="aspect-[16/5]"
                        value={bannerForm.image} onChange={url => setBannerForm({ ...bannerForm, image: url })}
                        label="📷 ارفع تصميم البانر من جهازك" hint="عريضة 16:5 — حتى 5MB" />
                      <input value={bannerForm.title} onChange={e => setBannerForm({ ...bannerForm, title: e.target.value })}
                        placeholder="عنوان البانر (يظهر على الصورة)"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                      <input value={bannerForm.link} onChange={e => setBannerForm({ ...bannerForm, link: e.target.value })}
                        placeholder="رابط عند الضغط (اختياري — مثلاً صفحة منتج)" dir="ltr"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                      <button onClick={createBanner} disabled={sending}
                        className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
                        {sending ? '⏳ جاري النشر...' : '🚀 انشر البانر فوراً في متجري'}
                      </button>
                    </div>
                  )}
                  <div className="space-y-3 stagger">
                    {storeBanners.map((a: any) => (
                      <div key={a.id} className="glass rounded-3xl overflow-hidden">
                        <div className="relative aspect-[16/5]">
                          <img src={imgUrl(a.image)} alt={a.title} className="absolute inset-0 w-full h-full object-cover" />
                          <span className={`absolute top-2 right-2 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {a.isActive ? '🟢 مباشر في متجرك' : '⏸️ موقوف'}
                          </span>
                        </div>
                        <div className="p-4 flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <div className="font-extrabold text-sm">{a.title}</div>
                            <div className="text-[11px] text-gray-400">👁️ {a.views.toLocaleString()} مشاهدة • 🎯 {a.ctr}% نقر</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => toggleBanner(a)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white border border-gray-200">
                              {a.isActive ? '⏸️ إيقاف' : '▶️ تفعيل'}
                            </button>
                            <button onClick={() => removeBanner(a)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-600">🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {storeBanners.length === 0 && !showBannerForm && (
                      <div className="glass rounded-3xl p-10 text-center text-gray-400">
                        <div className="text-4xl mb-2">🖼️</div>
                        لا بنرات بعد — أضف أول بانر يظهر أعلى متجرك فوراً
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══ تبويب إعلانات الرئيسية المدفوعة ═══ */}
          {tab === 'platform' && (
            <>

          {/* طلب معلق */}
          {pendingPayment && (
            <div className="glass rounded-3xl p-4 border-2 border-amber-300">
              <div className="font-extrabold text-amber-600">⏳ طلب إعلانك قيد مراجعة الإدارة</div>
              <div className="text-sm text-gray-500 mt-1">
                الفاتورة <a href={`/receipt/${pendingPayment.number}`} dir="ltr" className="font-bold underline decoration-purple-400 underline-offset-4 text-purple-700">{pendingPayment.number}</a> —
                أكمل التحويل وأرسل إثباته، يُبث إعلانك فور الموافقة
              </div>
            </div>
          )}

          {/* نموذج إعلان جديد */}
          {showForm && !pendingPayment && (
            <div className="glass rounded-3xl p-5 space-y-3">
              <h2 className="font-extrabold">📢 احجز مساحتك في الصفحة الرئيسية</h2>
              <ImageUpload endpoint="/seller/ads/upload" field="image" ratio="aspect-[16/6]"
                value={form.image} onChange={url => setForm({ ...form, image: url })}
                label="📷 ارفع تصميم إعلانك من جهازك" hint="عريضة 16:6 — حتى 5MB" />
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان الإعلان (يظهر على البانر)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })}
                placeholder={`رابط عند الضغط — افتراضياً متجرك /store/${store.slug}`} dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}
                  className="px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white">
                  {Object.entries(positions || {}).map(([k, label]) => (
                    <option key={k} value={k}>
                      {String(label)} — {(pricing?.[k] || 0).toLocaleString()} ر.ي/أسبوع
                    </option>
                  ))}
                </select>
                <select value={form.weeks} onChange={e => setForm({ ...form, weeks: e.target.value })}
                  className="px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white">
                  {[1, 2, 3, 4, 6, 8, 12].map(w => <option key={w} value={w}>{w} {w === 1 ? 'أسبوع' : 'أسابيع'}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between bg-purple-50 rounded-2xl px-4 py-3">
                <span className="text-sm font-bold text-gray-600">الإجمالي</span>
                <span className="text-xl font-black grad-text">{total.toLocaleString()} ر.ي</span>
              </div>
              <button onClick={create} disabled={sending}
                className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
                {sending ? '⏳ جاري الإرسال...' : '📩 إرسال الطلب للإدارة'}
              </button>
            </div>
          )}

          {/* إعلاناتي في الرئيسية */}
          <div className="space-y-3 stagger">
            {platformAds.map((a: any) => (
              <div key={a.id} className="glass rounded-3xl overflow-hidden">
                <div className="relative aspect-[16/5]">
                  <img src={imgUrl(a.image)} alt={a.title} className="absolute inset-0 w-full h-full object-cover" />
                  <span className={`absolute top-2 right-2 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${STATUS_AR[a.smartStatus]?.cls}`}>
                    {STATUS_AR[a.smartStatus]?.label}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-sm">{a.title}</div>
                    <div className="text-[11px] text-gray-400">
                      {a.positionLabel} • {a.weeks} أسبوع
                      {a.endsAt && a.smartStatus === 'live' && ` • ينتهي ${new Date(a.endsAt).toLocaleDateString('ar-YE')}`}
                    </div>
                  </div>
                  {a.smartStatus !== 'paused' && (
                    <div className="text-left shrink-0">
                      <div className="text-xs font-bold text-gray-500">👁️ {a.views.toLocaleString()}</div>
                      <div className="text-xs font-bold text-emerald-600">🎯 {a.ctr}% نقر</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {platformAds.length === 0 && !showForm && (
              <div className="glass rounded-3xl p-10 text-center text-gray-400">
                <div className="text-4xl mb-2">📢</div>
                لا إعلانات بعد — احجز مساحتك في الرئيسية وضاعف زوار متجرك
              </div>
            )}
          </div>

          {/* كيف يعمل */}
          <div className="glass rounded-3xl p-5">
            <h2 className="font-extrabold mb-2">💡 كيف تُعلن؟</h2>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal pr-5">
              <li>صمّم بانرك وارفعه من جهازك مع العنوان</li>
              <li>اختر الموضع والمدة — يظهر الإجمالي فوراً</li>
              <li>حوّل المبلغ للإدارة وأرسل إثبات التحويل</li>
              <li>تُوافق الإدارة ← يُبث إعلانك في الرئيسية فوراً وتتابع مشاهداته ونقراته هنا</li>
            </ol>
          </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
