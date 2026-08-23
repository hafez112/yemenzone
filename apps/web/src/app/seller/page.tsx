'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '@/lib/api';
import SellerSidebar from '@/components/SellerSidebar';
import DashboardPwa from '@/components/DashboardPwa';
import { DashStat, DashPanel } from '@/components/dash/DashKit';
import { KIND_INFO, type StoreKind } from '@/lib/activity';
import { TOOLS } from '@/lib/tools';
import { myTools, addMyTool, removeMyTool, type MyToolRow } from '@/lib/tool-db';
import { toast } from '@/components/Toast';

// لوحة البائع — تتكيف تلقائياً مع نوع المتجر (إعداد الذكاء المحلي)
export default function SellerDashboard() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noStore, setNoStore] = useState(false);
  const [advice, setAdvice] = useState<any>(null);
  const [inv, setInv] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  // 🧰 خدمات التاجر المثبتة على الرئيسية
  const [toolRows, setToolRows] = useState<MyToolRow[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const loadTools = () => myTools().then(setToolRows).catch(() => {});

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    loadTools();
    api('/stores/my')
      .then(s => {
        setStore(s);
        // 🤖 جلب نصائح الذكاء المحلي
        api('/seller/ai-advice').then(setAdvice).catch(() => {});
        // 📦 ملخص المخزون — متاجر المنتجات فقط، لا معنى له في الفنادق/الإيجارات/الخدمات
        if (['products', 'restaurants', 'malls'].includes(s.type?.kind || 'products')) api('/seller/inventory').then(setInv).catch(() => {});
        // 🏠 مهام اليوم + النبض المالي + نصيحة اليوم
        api('/seller/home-insights').then(setInsights).catch(() => {});
      })
      .catch(() => setNoStore(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <main className="min-h-screen pt-20 px-3 max-w-6xl mx-auto">
      <div className="skeleton h-40 rounded-3xl mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-3xl" />)}
      </div>
    </main>
  );

  // لا يوجد متجر → توجيه للمعالج
  if (noStore) return (
    <main className="min-h-screen pt-24 pb-24 px-3 flex items-center justify-center">
      <div className="glass rounded-3xl p-10 text-center max-w-md anim-bounce-in">
        <div className="text-6xl mb-4 anim-float">🏪</div>
        <h1 className="text-2xl font-black mb-2">أنشئ متجرك الأول!</h1>
        <p className="text-gray-500 text-sm mb-6">
          الذكاء الاصطناعي المحلي سيجهّز لوحة تحكم تناسب نشاطك التجاري تلقائياً
        </p>
        <button onClick={() => router.push('/seller/setup')}
          className="btn-primary text-white font-extrabold px-8 py-4 rounded-full text-lg anim-pulse-glow">
          🤖 ابدأ الإعداد الذكي — مجاناً
        </button>
      </div>
    </main>
  );

  const dash = (store.themeJson as any)?.dashboard || {};
  const terms = dash.terms || { item: 'منتج', items: 'المنتجات', order: 'طلب', addNew: 'إضافة' };
  const primary = (store.themeJson as any)?.primary || 'var(--primary)';
  const kind: StoreKind = (store.type?.kind || 'products') as StoreKind;
  const kn = KIND_INFO[kind] || KIND_INFO.products;
  const isProducts = kind === 'products' || kind === 'restaurants' || kind === 'malls'; // 🍽️🏬 المطاعم والمولات على محرك المنتجات
  // 🧬 عدد عناصر النشاط من عدّادات الخادم
  const itemsCount = isProducts ? (store._count?.products || 0)
    : kind === 'hotel' ? (store._count?.rooms || 0)
    : kind === 'rentals' ? (store._count?.rentalUnits || 0)
    : (store._count?.services || 0);
  const bookingsCount = store.bookingsCount || 0;

  // 🧰 خدمات التاجر — المثبتة على الرئيسية + المتاحة للإضافة
  const merchantTools = TOOLS.filter((t) => t.cat === 'merchant');
  const addedSlugs = toolRows.map((r) => r.slug);
  const myToolMetas = addedSlugs.map((sl) => TOOLS.find((t) => t.slug === sl)).filter(Boolean) as any[];

  const pinTool = async (slug: string) => {
    try { await addMyTool(slug); toast('✅ أُضيفت الخدمة إلى رئيسية لوحتك'); loadTools(); }
    catch (e: any) { toast(e.message || 'تعذرت الإضافة', 'error'); }
  };
  const unpinTool = async (slug: string) => {
    try { await removeMyTool(slug); toast('🗑️ أُزيلت الخدمة من الرئيسية'); loadTools(); }
    catch (e: any) { toast(e.message || 'تعذرت الإزالة', 'error'); }
  };

  // ⚡ تحويل نص الإجراء السريع إلى وجهة حقيقية — الروابط السريعة تعمل الآن
  const actionRoute = (q: string): string => {
    if (q.includes('إضافة')) {
      return ({ products: '/seller/products', rentals: '/seller/rentals', hotel: '/seller/rooms', services: '/seller/services' } as any)[kind] || '/seller/products';
    }
    if (q.includes('كوبون')) return '/seller/coupons';
    if (q.includes('تقييم')) return '/seller/reviews';
    if (q.includes('حجوزات') || q.includes('الحجوزات') || q.includes('إشغال') || q.includes('تقويم')) {
      return kind === 'hotel' ? '/seller/rooms' : '/seller/rentals';
    }
    if (q.includes('طلبات') || q.includes('الواردة')) return kind === 'services' ? '/seller/services' : '/seller/orders';
    if (q.includes('مبيعات') || q.includes('إيرادات') || q.includes('دخل')) return '/seller/finance';
    return '/seller';
  };

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />

        <div className="flex-1">
          {/* بطاقة الترحيب بلون المتجر */}
          <div className="rounded-3xl p-6 text-white shadow-xl mb-4 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primary}, ${(store.themeJson as any)?.secondary || '#00E5C7'})` }}>
            <div className="absolute -top-8 -left-8 w-32 h-32 anim-blob opacity-20 bg-white" />
            <div className="flex items-center justify-between relative">
              <div>
                <div className="f-sm opacity-80">{store.type?.icon} {store.type?.nameAr}</div>
                <h1 className="f-2xl font-black flex items-center gap-1.5">
                  {store.name} {store.isVerified && <span className="verified-badge">✓</span>}
                </h1>
                <div className="f-xs opacity-80 mt-1">
                  الخطة: {store.subscription?.plan?.name || 'مجاني'} •
                  الرابط: <span dir="ltr" className="font-bold">{store.slug}.yemenzone.com</span>
                </div>
              </div>
              <div className="text-4xl anim-float">{store.type?.icon || '🏪'}</div>
            </div>
          </div>

          {/* 🗂️ تنبيه الظهور في الدليل — المتاجر الجديدة تُراجع من الإدارة قبل إدراجها */}
          {!store.isListed && (
            <div className="glass rounded-3xl p-4 mb-4 flex items-center gap-3" style={{ border: '1.5px solid rgba(217,119,6,.35)' }}>
              <span className="text-2xl">🗂️</span>
              <div className="flex-1">
                <div className="font-extrabold text-sm" style={{ color: '#b45309' }}>{kn.yours} قيد المراجعة للظهور في الدليل</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  رابطك يعمل ويمكنك مشاركته واستقبال {isProducts ? 'الطلبات' : 'الحجوزات'} الآن — وبعد موافقة الإدارة ستظهر في دليل المنصة العام وقوائمه.
                </div>
              </div>
            </div>
          )}

          {/* ✅ مهام تحتاجك اليوم — كل مهمة تنقلك للإجراء مباشرة */}
          {insights && (
            <DashPanel icon="✅" title="مهام تحتاجك اليوم" className="mb-4">
              {insights.tasks.length > 0 ? (
                <div className="space-y-2">
                  {insights.tasks.map((t: any, i: number) => (
                    <Link key={i} href={t.href}
                      className="flex items-center gap-3 bg-white/70 hover:bg-white rounded-2xl px-4 py-3 transition-all card-hover group">
                      <span className="text-xl">{t.icon}</span>
                      <span className="flex-1 text-sm font-bold text-gray-700">{t.label}</span>
                      <span className="text-xs font-black text-white bg-red-500 min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center anim-soft-pulse">
                        {t.count}
                      </span>
                      <span className="text-gray-300 group-hover:text-purple-500 transition-colors">←</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="f-sm text-gray-400 text-center py-2">✨ كل شيء تحت السيطرة — لا مهام معلقة اليوم</p>
              )}
            </DashPanel>
          )}

          {/* 🧰 خدماتي السريعة — التاجر يثبّت أي خدمة من أدواته على الرئيسية */}
          <DashPanel icon="🧰" title="خدماتي على الرئيسية" className="mb-4" href="/seller/tools" hrefLabel="كل الأدوات ←">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {myToolMetas.map((t: any) => (
                <div key={t.slug} className="relative group">
                  <Link href={`/tools/${t.slug}`}
                    className="bg-white/70 hover:bg-white rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all card-hover text-center min-h-[92px]">
                    <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.grad} grid place-items-center text-xl shadow`}>{t.icon}</span>
                    <span className="text-[11px] font-extrabold text-gray-700 leading-tight line-clamp-2">{t.title}</span>
                  </Link>
                  <button onClick={() => unpinTool(t.slug)} title="إزالة من الرئيسية"
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black shadow opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
              <button onClick={() => setShowPicker(true)}
                className="rounded-2xl p-3 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-purple-300 text-purple-500 hover:bg-purple-50 transition-all min-h-[92px]">
                <span className="text-2xl leading-none">＋</span>
                <span className="text-[10px] font-extrabold">أضف خدمة</span>
              </button>
            </div>
            {myToolMetas.length === 0 && (
              <p className="text-[11px] text-gray-400 font-bold mt-2 text-center">ثبّت خدماتك المفضلة هنا — تُفتح بضغطة واحدة من رئيسية لوحتك دائماً</p>
            )}
          </DashPanel>

          {/* 💡 نصيحة اليوم — قاعدة محلية تتجدد يومياً */}
          {insights?.tip && (
            <div className="rounded-3xl p-4 mb-4 relative overflow-hidden anim-bounce-in"
              style={{ background: 'linear-gradient(135deg, #0d9488, #059669)' }}>
              <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/15 anim-bobble" />
              <div className="flex items-center gap-3 relative">
                <span className="text-2xl">{insights.tip.icon}</span>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-teal-100 mb-0.5">💡 نصيحة اليوم — ذكاء محلي يتجدد يومياً</div>
                  <p className="text-white text-sm font-bold leading-relaxed">{insights.tip.text}</p>
                </div>
              </div>
            </div>
          )}

          {/* 💹 النبض المالي — مبيعات للمنتجات، إيرادات حجوزات لباقي الأنشطة */}
          {insights && (
            <DashPanel icon="💹" className="mb-4"
              title={isProducts ? 'نبض مبيعاتك' : kind === 'services' ? 'نبض دخلك من الخدمات' : 'نبض إيرادات الحجوزات'}
              href={isProducts ? '/seller/finance' : kind === 'hotel' ? '/seller/rooms' : kind === 'rentals' ? '/seller/rentals' : '/seller/services'}
              hrefLabel={isProducts ? 'التقرير الكامل ←' : `إدارة ${kn.items} ←`}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/70 rounded-2xl p-3 text-center">
                  <div className="text-[11px] text-gray-400 font-bold mb-1">اليوم</div>
                  <div className="text-xl font-black grad-text">{insights.finance.today.toLocaleString()}</div>
                  {insights.finance.deltaPct !== 0 && (
                    <div className={`text-[10px] font-black mt-0.5 ${insights.finance.deltaPct > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {insights.finance.deltaPct > 0 ? '▲' : '▼'} {Math.abs(insights.finance.deltaPct)}% عن أمس
                    </div>
                  )}
                </div>
                <div className="bg-white/70 rounded-2xl p-3 text-center">
                  <div className="text-[11px] text-gray-400 font-bold mb-1">أمس</div>
                  <div className="text-xl font-black text-gray-500">{insights.finance.yesterday.toLocaleString()}</div>
                </div>
              </div>
              {/* شريط مصغّر لآخر 7 أيام */}
              <div className="flex items-end gap-1.5 h-16">
                {insights.finance.series.map((d: any, i: number) => {
                  const max = Math.max(...insights.finance.series.map((x: any) => x.total), 1);
                  const isToday = i === 6;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.label}: ${d.total.toLocaleString()}`}>
                      <div className="w-full rounded-t-lg transition-all duration-700"
                        style={{
                          height: `${Math.max((d.total / max) * 100, 6)}%`,
                          background: isToday
                            ? `linear-gradient(180deg, ${primary}, var(--secondary))`
                            : 'linear-gradient(180deg, rgba(108,61,245,.35), rgba(0,179,164,.25))',
                        }} />
                      <span className={`text-[8px] font-bold ${isToday ? 'text-purple-600' : 'text-gray-400'}`}>{d.label.slice(0, 5)}</span>
                    </div>
                  );
                })}
              </div>
            </DashPanel>
          )}

          {/* 👑 بانر الخطة الذهبية — يظهر لكل بائع لم يرقِّ بعد */}
          {store.subscription?.plan?.slug !== 'gold' && (
            <Link href="/seller/subscription"
              className="block rounded-3xl p-4 mb-4 relative overflow-hidden btn-shine group"
              style={{ background: 'linear-gradient(135deg, #92400e, #d97706, #f59e0b)' }}>
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/15 anim-bobble" />
              <div className="flex items-center gap-3 relative">
                <span className="text-3xl anim-soft-pulse">👑</span>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white text-sm">الخطة الذهبية — {kn.yours} يستحق التاج</div>
                  <div className="text-[11px] text-amber-100 truncate">بنرات إعلانية داخل صفحتك 🖼️ + تطبيق ويب تقدمي باسمك 📱 + كل الميزات مفتوحة</div>
                </div>
                <span className="shrink-0 bg-white text-amber-700 text-xs font-extrabold px-4 py-2 rounded-full group-hover:scale-105 transition-transform">
                  رقِّ الآن ←
                </span>
              </div>
            </Link>
          )}

          {/* 📱 تطبيق لوحة البائع — طلب يعتمد من الإدارة */}
          <div className="mb-4">
            <DashboardPwa app="seller" />
          </div>

          {/* إحصائيات سريعة — لكل نشاط بطاقاته (نظام اللوحات الموحد) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 stagger">
            {(isProducts ? [
              { icon: kind === 'restaurants' ? '🍽️' : kind === 'malls' ? '🏬' : '📦', n: itemsCount, l: terms.items, c: '#6C3DF5', href: '/seller/products' },
              { icon: '🛒', n: store._count?.orders || 0, l: 'الطلبات', c: '#F59E0B', href: '/seller/orders' },
              { icon: '⭐', n: store.ratingAvg?.toFixed(1) || '—', l: 'التقييم', c: '#FBBF24', href: '/seller/reviews' },
              { icon: '❤️', n: store.likesCount, l: 'الإعجابات', c: '#EC4899' },
            ] : [
              { icon: kn.icon, n: itemsCount, l: kn.items, c: '#6C3DF5', href: kind === 'hotel' ? '/seller/rooms' : kind === 'rentals' ? '/seller/rentals' : '/seller/services' },
              { icon: '📅', n: bookingsCount, l: kind === 'services' ? 'طلبات الخدمة' : 'الحجوزات', c: '#0EA5E9', href: kind === 'hotel' ? '/seller/rooms' : kind === 'rentals' ? '/seller/rentals' : '/seller/services' },
              { icon: '⭐', n: store.ratingAvg?.toFixed(1) || '—', l: 'التقييم', c: '#FBBF24', href: '/seller/reviews' },
              { icon: '❤️', n: store.likesCount, l: 'الإعجابات', c: '#EC4899' },
            ]).map(s => (
              <DashStat key={s.l} icon={s.icon} value={s.n} label={s.l} color={s.c} href={s.href} />
            ))}
          </div>

          {/* الإجراءات السريعة — من الذكاء المحلي */}
          <DashPanel icon="⚡" title="إجراءات سريعة" className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              {(dash.quickActions?.length ? dash.quickActions : [
                '➕ ' + (terms.addNew || 'إضافة'), '📦 الطلبات الجديدة', '⭐ التقييمات', '📊 مبيعات اليوم',
              ]).map((q: string) => (
                <Link key={q} href={actionRoute(q)}
                  className="bg-white/70 hover:bg-white rounded-2xl px-4 py-3 f-sm font-bold transition-all card-hover flex items-center justify-between gap-2 group">
                  <span>{q}</span>
                  <span className="text-gray-300 group-hover:text-purple-500 transition-colors">←</span>
                </Link>
              ))}
            </div>
          </DashPanel>

          {/* الدرجة الذكية */}
          <DashPanel icon="🧠" title={`الدرجة الذكية — ${kn.pageWord}`}
            extra={<span className="font-black f-xl grad-text">{store.smartScore?.toFixed(0) || 0}/100</span>}>
            <div className="h-3 rounded-full bg-gray-200/70 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(store.smartScore || 0, 100)}%`,
                  background: `linear-gradient(90deg, ${primary}, var(--secondary))`,
                }} />
            </div>
            <p className="f-xs text-gray-400 mt-2">تتحسن درجتك مع التقييمات والنشاط — ويظهر {kind === 'products' ? 'متجرك' : kind === 'restaurants' ? 'مطعمك' : kind === 'malls' ? 'مولك' : kn.noun === 'فندق' ? 'فندقك' : kn.pageWord === 'الإيجارات' ? 'معرضك' : 'مركزك'} أولاً للعملاء</p>
          </DashPanel>

          {/* 🤖 نصائح الذكاء المحلي لتحسين الدرجة */}
          {advice && advice.tips?.length > 0 && (
            <DashPanel icon="🤖" title={`الذكاء المحلي يقترح لك (${advice.tips.length})`} className="mt-4">
              <div className="space-y-2 stagger">
                {advice.tips.map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-white/70 rounded-2xl px-4 py-3 card-hover">
                    <span className="text-xl">{t.icon}</span>
                    <span className="flex-1 f-sm font-bold text-gray-700">{t.text}</span>
                    <span className="f-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">
                      {t.impact}
                    </span>
                  </div>
                ))}
              </div>
            </DashPanel>
          )}
        </div>
      </div>

      {/* 🧰 نافذة اختيار الخدمات — أي خدمة من أدوات التاجر تُثبَّت على الرئيسية */}
      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-3"
          onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-3xl p-4 w-full max-w-lg max-h-[75vh] overflow-y-auto anim-fade-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-sm">🧰 اختر خدمة لتثبيتها على رئيسية لوحتك</h3>
              <button onClick={() => setShowPicker(false)} className="w-8 h-8 rounded-full bg-gray-100 font-black text-sm">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {merchantTools.map((t) => {
                const added = addedSlugs.includes(t.slug);
                return (
                  <button key={t.slug} disabled={added} onClick={() => pinTool(t.slug)}
                    className={`rounded-2xl p-3 flex items-center gap-2 border text-right transition-all ${
                      added ? 'opacity-40 border-gray-100' : 'border-purple-100 hover:border-purple-300 hover:bg-purple-50'
                    }`}>
                    <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.grad} grid place-items-center text-lg shrink-0`}>{t.icon}</span>
                    <span className="text-[11px] font-extrabold text-gray-700 flex-1 leading-tight">{t.title}</span>
                    {added && <span className="text-emerald-500 text-xs font-black shrink-0">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
