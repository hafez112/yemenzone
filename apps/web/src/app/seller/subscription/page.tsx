'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';
import { KIND_INFO, type StoreKind } from '@/lib/activity';

// 💎 اشتراكي — الخطة الحالية + الميزات + الترقية بموافقة الإدارة + طلب التمييز
const LOCKABLE = ['analytics', 'coupons', 'api', 'customDesign', 'customDomain', 'campaigns', 'storeAds', 'pwa', 'finance', 'inventory', 'crm'] as const;

// 🧬 حد العناصر حسب نوع المتجر — لكل نشاط مفتاحه ومصطلحه
const LIMIT_META: Record<StoreKind, { key: string; icon: string; unlimited: string; limited: (v: number) => string }> = {
  products: { key: 'maxProducts', icon: '📦', unlimited: 'منتجات غير محدودة', limited: (v) => `حتى ${v} منتجاً` },
  rentals:  { key: 'maxUnits',    icon: '🏠', unlimited: 'وحدات غير محدودة', limited: (v) => `حتى ${v} وحدة إيجار` },
  hotel:    { key: 'maxRooms',    icon: '🛎️', unlimited: 'غرف غير محدودة',   limited: (v) => `حتى ${v} غرفة فندقية` },
  services: { key: 'maxServices', icon: '🛠️', unlimited: 'خدمات غير محدودة', limited: (v) => `حتى ${v} خدمة` },
  restaurants: { key: 'maxProducts', icon: '🍽️', unlimited: 'أصناف منيو غير محدودة', limited: (v) => `حتى ${v} صنفاً في المنيو` },
  malls: { key: 'maxProducts', icon: '🏬', unlimited: 'منتجات غير محدودة', limited: (v) => `حتى ${v} منتجاً في المول` },
};

function limitText(f: any, kind: StoreKind) {
  const m = LIMIT_META[kind] || LIMIT_META.products;
  const v = f?.[m.key];
  if (v === -1 || v === undefined || v === null) return `${m.icon} ${m.unlimited}`;
  return `${m.icon} ${m.limited(Number(v))}`;
}

function FeatureRow({ icon, label, on, granted }: { icon: string; label: string; on: boolean; granted?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold ${
      on ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
    }`}>
      <span>{icon} {label}</span>
      {on
        ? <span className="text-xs">{granted ? '🎁 منحة الإدارة' : '✅ مفعّلة'}</span>
        : <span className="text-xs">🔒 مقفلة</span>}
    </div>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [featuredBusy, setFeaturedBusy] = useState(false);

  async function load() {
    const d = await api('/seller/subscription');
    setData(d);
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    load().catch(() => router.push('/seller/setup'));
  }, []);

  async function subscribe(planId: string, price: number) {
    setSending(true);
    try {
      const r = await api('/seller/subscription/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId, method: 'transfer' }),
      });
      toast(r.activated ? '✅ ' + r.message : '📩 ' + r.message);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  async function requestFeatured() {
    setFeaturedBusy(true);
    try {
      const r = await api('/stores/my/featured-request', { method: 'POST' });
      toast('⭐ ' + r.message);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setFeaturedBusy(false);
  }

  if (!data) return null;
  const { store, plans, current, pendingPayment, features, featureLabels, subscriptionActive, grants } = data;
  const planFeat = (current?.plan?.features as any) || {};
  const storeKind: StoreKind = store?.type?.kind || 'products';
  const kindInfo = KIND_INFO[storeKind] || KIND_INFO.products;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={{ ...store, features }} />
        <div className="flex-1 min-w-0 space-y-4">
          <h1 className="text-2xl font-black">💎 اشتراكي وصلاحياتي</h1>

          {/* بطاقة الخطة الحالية */}
          <div className="rounded-3xl p-5 text-white shadow-xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}>
            <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full bg-white/10" />
            <div className="flex items-center justify-between relative">
              <div>
                <div className="text-sm opacity-80">خطتك الحالية</div>
                <div className="text-2xl font-black">{current?.plan?.name || 'مجاني'}</div>
                <div className="text-xs opacity-80 mt-1">
                  {subscriptionActive
                    ? current?.expiresAt
                      ? `سارية حتى ${new Date(current.expiresAt).toLocaleDateString('ar-YE')} ✅`
                      : 'سارية ✅'
                    : '⏸️ لا يوجد اشتراك ساري — الميزات المدفوعة مقفلة'}
                </div>
              </div>
              <div className="text-4xl">💎</div>
            </div>
          </div>

          {/* طلب اشتراك معلق */}
          {pendingPayment && (
            <div className="glass rounded-3xl p-4 border-2 border-amber-300">
              <div className="font-extrabold text-amber-600">⏳ طلب اشتراكك قيد مراجعة الإدارة</div>
              <div className="text-sm text-gray-500 mt-1">
                الفاتورة <a href={`/receipt/${pendingPayment.number}`} dir="ltr" className="font-bold underline decoration-purple-400 underline-offset-4 text-purple-700">{pendingPayment.number}</a> —
                تُفعّل خطتك فور الموافقة، وتنفتح كل ميزاتها تلقائياً
              </div>
            </div>
          )}

          {/* ميزاتي الحالية */}
          <div className="glass rounded-3xl p-5">
            <h2 className="font-extrabold mb-3">🔐 ميزاتي الحالية</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              <FeatureRow icon={kindInfo.icon} label={limitText(features, storeKind).replace(/^[^\s]+\s/, '')} on />
              <FeatureRow icon="🖼️" label={`${features.maxImages} صور لكل منتج`} on />
              {LOCKABLE.map((k) => (
                <FeatureRow key={k}
                  icon={(featureLabels?.[k] || k).split(' ')[0]}
                  label={(featureLabels?.[k] || k).split(' ').slice(1).join(' ')}
                  on={!!features[k]}
                  granted={!planFeat[k] && !!grants?.[k]} />
              ))}
            </div>
            {Object.keys(grants || {}).length > 0 && (
              <p className="text-[11px] text-emerald-600 font-bold mt-2">🎁 لديك صلاحيات خاصة منحتها لك الإدارة — تبقى حتى لو غيّرت خطتك</p>
            )}
          </div>

          {/* ⭐ تمييز المتجر */}
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold">⭐ المتاجر المتميزة</h2>
                <p className="text-xs text-gray-500 mt-1">
                  الظهور في واجهة المنصة الرئيسية — <b>بموافقة الإدارة فقط</b>
                </p>
              </div>
              {store.isFeatured ? (
                <span className="shrink-0 text-xs font-extrabold bg-amber-100 text-amber-700 px-3 py-2 rounded-full">⭐ {kindInfo.yours} متميز</span>
              ) : store.featuredRequested ? (
                <span className="shrink-0 text-xs font-extrabold bg-blue-100 text-blue-600 px-3 py-2 rounded-full">⏳ طلبك قيد المراجعة</span>
              ) : (
                <button onClick={requestFeatured} disabled={featuredBusy}
                  className="shrink-0 btn-primary text-white text-xs font-extrabold px-4 py-2.5 rounded-full disabled:opacity-40">
                  ⭐ اطلب التمييز
                </button>
              )}
            </div>
          </div>

          {/* الخطط المتاحة */}
          <h2 className="font-extrabold pt-2">⬆️ رقِّ {kindInfo.yours}</h2>
          <div className="grid md:grid-cols-3 gap-3 stagger">
            {plans.map((p: any) => {
              const isCurrent = current?.planId === p.id && subscriptionActive;
              const isGold = p.slug === 'gold';
              const f = p.features as any;
              return (
                <div key={p.id} className={`rounded-3xl p-5 card-hover relative ${
                  isCurrent ? 'glass-dark text-white ring-2 ring-emerald-400'
                  : isGold ? 'glass gradient-border'
                  : 'glass'
                }`}>
                  {isCurrent && (
                    <span className="absolute -top-2 right-4 text-[10px] font-extrabold bg-emerald-500 text-white px-3 py-0.5 rounded-full">
                      خطتك الحالية ✓
                    </span>
                  )}
                  {isGold && !isCurrent && (
                    <span className="absolute -top-2 right-4 text-[10px] font-extrabold text-white px-3 py-0.5 rounded-full anim-soft-pulse"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      👑 الأكثر تميزاً
                    </span>
                  )}
                  <h3 className="font-extrabold">{p.name}</h3>
                  {p.kind && KIND_INFO[p.kind as StoreKind] && (
                    <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full mt-1 ${isCurrent ? 'bg-white/15 text-white' : 'bg-purple-100 text-purple-700'}`}>
                      {KIND_INFO[p.kind as StoreKind].icon} مصممة لـ{KIND_INFO[p.kind as StoreKind].label}
                    </span>
                  )}
                  <div className="my-3">
                    <span className="text-3xl font-black grad-text">
                      {Number(p.priceMonthly) === 0 ? 'مجاناً' : Number(p.priceMonthly).toLocaleString()}
                    </span>
                    {Number(p.priceMonthly) > 0 && <span className="text-xs opacity-70"> ر.ي/شهر</span>}
                  </div>
                  <ul className={`space-y-1.5 text-xs mb-4 ${isCurrent ? 'text-gray-300' : 'text-gray-500'}`}>
                    <li>{limitText(f, storeKind)}</li>
                    <li>🖼️ {f.maxImages} صور لكل منتج</li>
                    <li>{f.analytics ? '✅' : '🔒'} إحصائيات متقدمة</li>
                    <li>{f.coupons ? '✅' : '🔒'} كوبونات الخصم</li>
                    <li>{f.customDesign ? '✅' : '🔒'} تخصيص التصميم</li>
                    <li>{f.api ? '✅' : '🔒'} API للمطورين</li>
                    <li>{f.storeAds ? '✅' : '🔒'} بنرات المتجر الإعلانية</li>
                    <li>{f.pwa ? '✅' : '🔒'} تطبيق الويب التقدمي 📱</li>
                  </ul>
                  {!isCurrent && !pendingPayment && (
                    <button onClick={() => subscribe(p.id, Number(p.priceMonthly))} disabled={sending}
                      className={`w-full py-2.5 rounded-xl text-white font-extrabold text-sm disabled:opacity-40 ${isGold ? 'btn-shine' : 'btn-primary'}`}
                      style={isGold ? { background: 'linear-gradient(135deg, #f59e0b, #b45309)' } : {}}>
                      {Number(p.priceMonthly) === 0 ? 'التحويل للمجاني' : isGold ? '👑 اطلب الخطة الذهبية' : '⬆️ اطلب الترقية'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* خطوات الترقية */}
          <div className="glass rounded-3xl p-5">
            <h2 className="font-extrabold mb-3">💳 خطوات الترقية</h2>
            <div className="space-y-2">
              {[
                ['1️⃣', 'اختر الخطة المناسبة واضغط "اطلب الترقية"'],
                ['2️⃣', 'حوّل المبلغ عبر الحوالة أو المحفظة المتفق عليها مع الإدارة'],
                ['3️⃣', 'تراجع الإدارة طلبك وتعتمد الدفعة'],
                ['4️⃣', 'تُفعّل خطتك وتنفتح كل الميزات المقفلة فوراً ✅'],
              ].map(([n, t]) => (
                <div key={n} className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{n}</span><span>{t}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">📩 للاستفسار تواصل مع إدارة المنصة — القرار النهائي للإدارة وحدها</p>
          </div>
        </div>
      </div>
    </main>
  );
}
