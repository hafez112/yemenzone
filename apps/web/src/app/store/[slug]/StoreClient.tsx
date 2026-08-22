'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import CartDrawer from '@/components/CartDrawer';
import MallClient from './MallClient';
import BookingSection from '@/components/BookingSection';
import ReviewsSection from '@/components/ReviewsSection';
import { addToCart, saveCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import { toast } from '@/components/Toast';
import { KIND_INFO, type StoreKind } from '@/lib/activity';
import { adImgUrl } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// ═══════════════════════════════════════════════
//  واجهة المتجر — تُعرض حسب القالب الذي اختاره البائع
//  default | modern | dark | elegant
//  والمنتجات مجمعة حسب أصناف المتجر
// ═══════════════════════════════════════════════
export default function StoreClient({ store }: { store: any }) {
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);

  // 🖼️ بانرات المتجر الإعلانية — ميزة الخطة الذهبية، تُجلب من API
  useEffect(() => {
    fetch(`${API}/api/v1/ads/store/${store.slug}`).then(r => r.json())
      .then(d => setBanners(Array.isArray(d) ? d : [])).catch(() => {});
  }, [store.slug]);

  // 🔗 «اشترِ مع صديق» — استيراد سلة مشتركة عبر الرابط
  useEffect(() => {
    try {
      const payload = new URLSearchParams(window.location.search).get('cart');
      if (!payload) return;
      const items: { i: string; q: number }[] = JSON.parse(decodeURIComponent(escape(atob(payload))));
      if (!Array.isArray(items) || !items.length) return;
      // حلّ الأصناف من بيانات المتجر الحية — أسعار اليوم لا أسعار الرابط
      const resolved = items.map((it) => {
        const p = allProducts.find((x) => x.id === it.i);
        if (!p || p.stock <= 0) return null;
        return { productId: p.id, name: p.name, price: Number(p.salePrice || p.price), image: p.images?.[0], qty: Math.min(it.q || 1, 99) };
      }).filter(Boolean) as any[];
      if (!resolved.length) { toast('⚠️ أصناف السلة المشتركة لم تعد متوفرة', 'error'); return; }
      saveCart(store.slug, resolved);
      window.dispatchEvent(new Event('yz-open-cart'));
      toast(`🔗 استلمت سلة صديقك — ${resolved.length} صنف جاهز للطلب 🛒`);
      // تنظيف الرابط
      window.history.replaceState({}, '', `/store/${store.slug}`);
    } catch { /* رابط تالف — تجاهل بهدوء */ }
  }, []);

  // تدوير البانرات تلقائياً كل 5 ثوانٍ
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const theme = (store.themeJson as any) || {};
  const primary = theme.primary || '#6C3DF5';
  const secondary = theme.secondary || '#00E5C7';
  const template = store.template || 'default';
  const isDark = template === 'dark';
  // 🧬 فصل كامل بين الأنشطة — كل نوع بواجهته ومصطلحاته الخاصة
  const kind: StoreKind = (store.type?.kind || 'products') as StoreKind;
  // 🍽️ المطاعم تسير على محرك المنتجات — المنيو = الأصناف
  const isProducts = kind === 'products' || kind === 'restaurants';
  const isRestaurant = kind === 'restaurants';
  const kn = KIND_INFO[kind] || KIND_INFO.products;

  // تجميع كل المنتجات مع صنفها
  const allProducts = useMemo(() => {
    const list: any[] = [];
    for (const c of store.categories || []) {
      for (const p of c.products) list.push({ ...p, catName: c.name, catId: c.id });
    }
    for (const p of store.uncategorized || []) list.push({ ...p, catName: 'عام', catId: null });
    return list;
  }, [store]);

  const shown = allProducts.filter(p =>
    (activeCat === 'all' || p.catId === activeCat || (activeCat === 'none' && !p.catId)) &&
    (!search || p.name.includes(search))
  );

  // أنماط القوالب الستة
  const styles: Record<string, any> = {
    default:  { page: 'bg-gray-50 text-gray-900', card: 'bg-white rounded-2xl shadow-sm', header: '' },
    modern:   { page: 'text-gray-900', card: 'glass rounded-3xl', header: '' },
    dark:     { page: 'text-white', card: 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl', header: '' },
    elegant:  { page: 'bg-amber-50/40 text-gray-900', card: 'bg-white rounded-lg border border-amber-200/60 shadow-sm', header: '' },
    aurora:   { page: 'text-gray-900', card: 'glass-strong rounded-3xl glow-soft', header: 'aurora' },
    minimal:  { page: 'bg-white text-gray-900', card: 'bg-white rounded-md border border-gray-100 hover:border-gray-300 transition-colors', header: 'minimal' },
  };
  const st = styles[template] || styles.default;

  // 🎭 لمسات الثيمات الجاهزة
  const isSerif = theme.font === 'serif';
  const isHeritage = theme.pattern === 'heritage';

  // 🧩 ترتيب أقسام الواجهة — يحدده البائع من إعداداته
  const sectionsOrder: string[] = Array.isArray(theme.sectionsOrder) && theme.sectionsOrder.length
    ? theme.sectionsOrder
    : isProducts ? ['banners', 'products', 'booking', 'reviews'] : ['banners', 'booking', 'reviews'];

  // موضع كل قسم حسب ترتيب البائع
  const orderOf = (k: string) => { const i = sectionsOrder.indexOf(k); return i === -1 ? 99 : i; };

  // خلفية الصفحة حسب القالب + متغيرات ثيم النشاط (--tp/--ts) لطبقة التصميم
  const pageBg: any = isDark ? { background: 'linear-gradient(180deg, #0A0A14, #141428)' }
    : template === 'modern' ? { background: `linear-gradient(135deg, ${primary}08, ${secondary}08)` }
    : template === 'aurora' ? {
      background: `
        radial-gradient(ellipse 60% 45% at 15% 0%, ${primary}14, transparent),
        radial-gradient(ellipse 50% 40% at 90% 30%, ${secondary}12, transparent),
        radial-gradient(ellipse 55% 45% at 50% 100%, ${primary}0D, transparent),
        #fafaff`,
    } : {};

  // 🏬 المولات التجارية — واجهة منفصلة كلياً بقوالبها وأثيماتها الخاصة
  if (kind === 'malls') {
    return <MallClient store={store} banners={banners} bannerIdx={bannerIdx} setBannerIdx={setBannerIdx} />;
  }

  return (
    <main className={`min-h-screen pb-24 ${st.page} ${isSerif ? 'store-serif' : ''} ${isDark ? 'store-dark' : ''}`}
      style={{ '--tp': primary, '--ts': secondary, ...pageBg } as any}>

      {/* الشريطان العلوي والسفلي يوفرهما إطار المتجر الموحد (layout) */}

      {/* غلاف المتجر */}
      <header className="relative pt-14">
        <div className={`h-40 md:h-56 w-full ${template === 'aurora' && !store.cover ? 'anim-blob' : ''}`}
          style={{
            background: store.cover
              ? `url(${API}${store.cover}) center/cover`
              : template === 'aurora'
                ? `linear-gradient(120deg, ${primary}, ${secondary}, ${primary}88, ${secondary}88)`
                : template === 'minimal'
                  ? `linear-gradient(180deg, #fafafa, #f0f0f0)`
                  : `linear-gradient(135deg, ${primary}, ${secondary})`,
            backgroundSize: template === 'aurora' && !store.cover ? '300% 300%' : undefined,
          }} />
        {template === 'aurora' && !store.cover && (
          <div className="absolute inset-0 opacity-30"
            style={{ background: `radial-gradient(circle at 70% 30%, ${secondary}66, transparent 50%), radial-gradient(circle at 20% 80%, ${primary}55, transparent 50%)` }} />
        )}
        <div className={`absolute inset-0 ${isDark ? 'bg-black/40' : template === 'minimal' && !store.cover ? '' : 'bg-black/20'}`} />
        {!(template === 'minimal' && !store.cover) && <div className="absolute inset-0 cover-fade" />}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="max-w-5xl mx-auto flex items-end gap-3">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 border-white flex items-center justify-center text-3xl bg-white shrink-0"
              style={{ ...(store.logo ? { background: `url(${API}${store.logo}) center/cover` } : {}),
                       boxShadow: `0 10px 30px -8px rgba(0,0,0,.45), 0 0 0 4px ${primary}55` }}>
              {!store.logo && (store.type?.icon || '🏪')}
            </div>
            <div className={template === 'minimal' && !store.cover ? 'text-gray-800' : 'text-white'}>
              <h1 className="f-2xl font-black flex items-center gap-1.5" style={{ textShadow: template === 'minimal' && !store.cover ? 'none' : '0 2px 12px rgba(0,0,0,.45)' }}>
                {store.name} {store.isVerified && <span className="verified-badge">✓</span>}
              </h1>
              <div className="text-xs opacity-90 flex items-center gap-1.5 flex-wrap">
                <span>{store.type?.nameAr} • {store.governorate || 'اليمن'} • ⭐ {store.ratingAvg?.toFixed(1) || 'جديد'} • ❤️ {store.likesCount}</span>
                {isProducts && store.sellerLevel && store.sellerLevel.id !== 'bronze' && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/25 backdrop-blur"
                    title={`تاجر ${store.sellerLevel.name} — مستوى محسوب من الطلبات المكتملة`}>
                    {store.sellerLevel.icon} تاجر {store.sellerLevel.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ⏸️ لافتة الإغلاق المؤقت — يضعها البائع من إعداداته */}
      {store.pausedAt && (
        <div className="max-w-5xl mx-auto px-3 mt-4">
          <div className="rounded-3xl p-4 bg-gradient-to-l from-amber-400 to-orange-400 text-white shadow-lg flex items-center gap-3 anim-bounce-in">
            <span className="text-3xl">⏸️</span>
            <div className="flex-1">
              <div className="font-black">مغلق مؤقتاً</div>
              <p className="text-xs font-bold text-white/90 mt-0.5">
                {store.pauseNote || 'يعود لاستقبال الطلبات قريباً — تصفّح ما يحلو لك وعد لاحقاً 🌙'}
              </p>
            </div>
            {store.whatsapp && (
              <a href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank"
                className="shrink-0 bg-white text-amber-600 text-xs font-black px-4 py-2 rounded-full shadow">
                💬 اسألنا
              </a>
            )}
          </div>
        </div>
      )}

      {/* 🕌 شريط زخرفي للثيم التراثي اليمني */}
      {isHeritage && (
        <div className="heritage-band" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary}, ${primary})` }} />
      )}

      {/* 🧩 منطقة الأقسام — ترتيب مرن يحدده البائع */}
      <div className="flex flex-col">

      {/* 🖼️ بانرات المتجر الإعلانية — ميزة الخطة الذهبية */}
      {banners.length > 0 && (
        <div className="max-w-5xl mx-auto px-3 mt-4" style={{ order: orderOf('banners') }}>
          <div className="relative rounded-3xl overflow-hidden shadow-lg glow-soft">
            <div className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(${bannerIdx * 100}%)` }}>
              {banners.map((b: any, bi: number) => (
                <a key={b.id} href={b.link || undefined} target={b.link?.startsWith('http') ? '_blank' : undefined}
                  onClick={() => fetch(`${API}/api/v1/ads/${b.id}/click`, { method: 'POST' }).catch(() => {})}
                  className="relative w-full shrink-0 aspect-[16/5] block">
                  <img src={adImgUrl(b.image)} alt={b.title} loading={bi === 0 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-2/5"
                    style={{ background: 'linear-gradient(0deg, rgba(0,0,0,.65), transparent)' }} />
                  <div className="absolute bottom-2.5 right-3 text-white font-extrabold text-sm drop-shadow">{b.title}</div>
                </a>
              ))}
            </div>
            {banners.length > 1 && (
              <div className="absolute bottom-2 left-3 flex gap-1.5">
                {banners.map((_: any, i: number) => (
                  <button key={i} onClick={() => setBannerIdx(i)} aria-label={`بانر ${i + 1}`}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{ background: i === bannerIdx ? '#fff' : 'rgba(255,255,255,.45)', transform: i === bannerIdx ? 'scale(1.3)' : 'none' }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* وصف النشاط — يظهر لكل الأنواع */}
      {store.description && (
        <div className="max-w-5xl mx-auto px-3" style={{ order: 0 }}>
          <p className={`text-sm mt-4 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {store.description}
          </p>
        </div>
      )}

      {/* 🛍️🍽️ قسم العناصر الكامل — متاجر المنتجات والمطاعم (منيو)، لا يظهر في الفنادق/الإيجارات/الخدمات */}
      {isProducts && (
      <div className="max-w-5xl mx-auto px-3" style={{ order: orderOf('products') }}>
        {/* 🍽️ ترويسة المنيو — للمطاعم فقط */}
        {isRestaurant && allProducts.length > 0 && (
          <div className="mt-4 relative overflow-hidden rounded-3xl p-4 text-white flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 55%, #FFB800))`, boxShadow: `0 12px 30px -10px ${primary}88` }}>
            <div className="anim-blob absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
            <span className="text-3xl relative">🍽️</span>
            <div className="relative">
              <h2 className="font-black f-xl">قائمة الطعام</h2>
              <p className="f-xs text-white/85">
                {allProducts.length === 1 ? 'صنف واحد طازج' : allProducts.length === 2 ? 'صنفان طازجان' : allProducts.length <= 10 ? `${allProducts.length} أصناف طازجة` : `${allProducts.length} صنفاً طازجاً`} بانتظارك — اطلب ويصلك ساخناً 🔥
              </p>
            </div>
          </div>
        )}
        {/* شريط البحث */}
        <div className="mt-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isRestaurant ? '🔍 ابحث في المنيو...' : '🔍 ابحث في المتجر...'}
            className={`w-full px-4 py-3 rounded-2xl outline-none input-theme ${
              isDark ? 'bg-white/10 border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-200'
            }`} />
        </div>

        {/* أصناف المتجر — شريط تمرير أفقي */}
        <div className="flex gap-2 overflow-x-auto py-3 sticky top-14 z-30 edge-fade"
          style={{ background: isDark ? 'rgba(10,10,20,0.9)' : 'rgba(247,247,252,0.9)', backdropFilter: 'blur(12px)' }}>
          <button onClick={() => setActiveCat('all')}
            className={`theme-chip shrink-0 ${activeCat === 'all' ? 'on' : ''}`}>
            الكل
          </button>
          {(store.categories || []).map((c: any) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className={`theme-chip shrink-0 ${activeCat === c.id ? 'on' : ''}`}>
              {c.name} ({c.products.length})
            </button>
          ))}
          {store.uncategorized?.length > 0 && (
            <button onClick={() => setActiveCat('none')}
              className={`theme-chip shrink-0 ${activeCat === 'none' ? 'on' : ''}`}>
              عام
            </button>
          )}
        </div>

        {/* المنتجات حسب الصنف — عرض مجمّع */}
        {activeCat === 'all' && !search ? (
          // عرض مجمّع: كل صنف بقسمه الخاص
          <>
            {(store.categories || []).map((c: any) => (
              <section key={c.id} className="mt-5">
                <h2 className={`font-black text-lg mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                  <span className="w-1.5 h-6 rounded-full" style={{ background: primary }} />
                  {c.name}
                  {isRestaurant && <span className="f-xs font-bold text-gray-400">({c.products.length})</span>}
                </h2>
                <div className={isRestaurant ? 'grid md:grid-cols-2 gap-3' : 'grid grid-cols-2 md:grid-cols-4 gap-3'}>
                  {c.products.map((p: any) => isRestaurant
                    ? <MenuCard key={p.id} p={p} st={st} primary={primary} isDark={isDark} store={store} />
                    : <ProductCard key={p.id} p={p} st={st} primary={primary} isDark={isDark} store={store} />)}
                </div>
              </section>
            ))}
            {store.uncategorized?.length > 0 && (
              <section className="mt-5">
                <h2 className={`font-black text-lg mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                  <span className="w-1.5 h-6 rounded-full" style={{ background: primary }} />
                  {isRestaurant ? 'أصناف أخرى' : 'منتجات أخرى'}
                </h2>
                <div className={isRestaurant ? 'grid md:grid-cols-2 gap-3' : 'grid grid-cols-2 md:grid-cols-4 gap-3'}>
                  {store.uncategorized.map((p: any) => isRestaurant
                    ? <MenuCard key={p.id} p={p} st={st} primary={primary} isDark={isDark} store={store} />
                    : <ProductCard key={p.id} p={p} st={st} primary={primary} isDark={isDark} store={store} />)}
                </div>
              </section>
            )}
          </>
        ) : (
          // عرض مفلتر
          <div className={`${isRestaurant ? 'grid md:grid-cols-2 gap-3' : 'grid grid-cols-2 md:grid-cols-4 gap-3'} mt-4`}>
            {shown.map((p: any) => isRestaurant
              ? <MenuCard key={p.id} p={p} st={st} primary={primary} isDark={isDark} store={store} />
              : <ProductCard key={p.id} p={p} st={st} primary={primary} isDark={isDark} store={store} />)}
            {shown.length === 0 && (
              <div className={`col-span-full text-center py-16 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <div className="text-5xl mb-3">{isRestaurant ? '🍽️' : '🔍'}</div>
                {isRestaurant ? 'لا أصناف مطابقة في المنيو' : 'لا نتائج مطابقة'}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* 🧬 شريط النشاط — إحصاءات سريعة ودعوة للحجز (أنشطة الحجز فقط) */}
      {!isProducts && (() => {
        const items: any[] = kind === 'hotel' ? (store.rooms || []) : kind === 'rentals' ? (store.rentalUnits || []) : (store.services || []);
        const priceOf = (it: any) => Number(it.pricePerNight || it.pricePerDay || it.price || 0);
        const active = items.filter((it: any) => it.isActive !== false);
        const minPrice = active.length ? Math.min(...active.map(priceOf).filter((n: number) => n > 0)) : 0;
        return (
          <div className="max-w-5xl mx-auto px-3 mt-4" style={{ order: orderOf('booking') - 1 }}>
            <div className="grid grid-cols-3 gap-2.5 stagger">
              <div className={`${st.card} p-4 text-center card-hover`}>
                <div className="text-2xl">{kn.icon}</div>
                <div className="f-xl font-black mt-1 price-grad">{active.length}</div>
                <div className="f-xs font-bold text-gray-400">{kn.items} المتاحة</div>
              </div>
              <div className={`${st.card} p-4 text-center card-hover`}>
                <div className="text-2xl">💰</div>
                <div className="f-xl font-black mt-1 price-grad">
                  {minPrice > 0 ? minPrice.toLocaleString() : '—'}
                </div>
                <div className="f-xs font-bold text-gray-400">
                  {minPrice > 0 ? (kind === 'hotel' ? 'يبدأ من / ليلة' : kind === 'rentals' ? 'يبدأ من / يوم' : 'يبدأ من / خدمة') : 'الأسعار عند التواصل'}
                </div>
              </div>
              <div className={`${st.card} p-4 text-center card-hover`}>
                <div className="text-2xl stars-gold">★</div>
                <div className="f-xl font-black mt-1 price-grad">{store.ratingAvg?.toFixed(1) || 'جديد'}</div>
                <div className="f-xs font-bold text-gray-400">تقييم {kn.noun === 'فندق' ? 'الفندق' : kn.pageWord}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* أقسام الحجز حسب نوع المتجر */}
      <div style={{ order: orderOf('booking') }}>
        {store.type?.kind === 'rentals' && <BookingSection store={store} kind="rentals" />}
        {store.type?.kind === 'hotel' && <BookingSection store={store} kind="hotel" />}
        {store.type?.kind === 'services' && <BookingSection store={store} kind="services" />}
      </div>

      {/* التقييمات والإعجاب */}
      <div style={{ order: orderOf('reviews') }}>
        <ReviewsSection store={store} primary={primary} isDark={isDark} />
      </div>

      </div>{/* نهاية منطقة الأقسام المرنة */}

      {/* 📍 موقعنا — خريطة جوجل مدمجة + اتجاهات مباشرة */}
      {store.lat != null && store.lng != null && (
        <section className="max-w-5xl mx-auto px-3 mt-8">
          <div className={`${st.card} overflow-hidden`}>
            <div className="p-4 md:p-5 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shrink-0">📍</div>
              <div className="text-white min-w-0">
                <div className="font-black">موقعنا</div>
                <div className="text-[11px] opacity-90 truncate">
                  {[store.address, store.city, store.governorate].filter(Boolean).join(' — ') || `زورونا في ${isRestaurant ? 'مطعمنا' : kind === 'products' ? 'متجرنا الفعلي' : kind === 'hotel' ? 'فندقنا' : kind === 'rentals' ? 'مقرنا' : 'مركزنا'}`}
                </div>
              </div>
            </div>
            <div style={{ height: 260 }}>
              <iframe
                title={`موقع ${store.name}`}
                src={`https://maps.google.com/maps?q=${store.lat},${store.lng}&z=16&hl=ar&output=embed`}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
            <div className="p-3 flex gap-2">
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`} target="_blank"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-extrabold text-sm transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                🧭 الاتجاهات إلى {isRestaurant ? 'مطعمنا' : kind === 'products' ? 'متجرنا' : kind === 'hotel' ? 'فندقنا' : kind === 'rentals' ? 'مقرنا' : 'مركزنا'}
              </a>
              <a href={`https://www.google.com/maps?q=${store.lat},${store.lng}`} target="_blank"
                className={`px-5 py-3 rounded-2xl font-extrabold text-sm flex items-center ${
                  isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                🗺️ فتح الخريطة
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ═══ روابط المتجر — تذييل منظم ببطاقات ═══ */}
      <section className="max-w-5xl mx-auto px-3 mt-10">
        <div className={`${st.card} overflow-hidden`}>
          {/* رأس القسم */}
          <div className="p-4 md:p-5 flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shrink-0">🧭</div>
            <div className="text-white min-w-0">
              <div className="font-black">روابط {kn.pageWord}</div>
              <div className="text-[11px] opacity-90 truncate">كل ما تحتاجه عن {store.name} في مكان واحد</div>
            </div>
          </div>
          {/* بطاقات الروابط — لكل نشاط روابطه الخاصة */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 md:p-4">
            {[
              ...(isProducts ? [
                isRestaurant
                  ? { href: `/store/${store.slug}/products`, icon: '🍽️', title: 'المنيو الكامل', desc: 'تصفح كل الأصناف والأقسام' }
                  : { href: `/store/${store.slug}/products`, icon: '🛍️', title: 'كل المنتجات', desc: 'تصفح القائمة الكاملة' },
                { href: `/track`, icon: '🔍', title: 'تتبع طلبك', desc: 'حالة طلبك لحظة بلحظة' },
              ] : [
                { href: `#booking`, icon: kn.icon, title: kn.items, desc: kn.cta },
              ]),
              { href: `/customer/chat/${store.slug}`, icon: '💬', title: 'راسلنا مباشرة', desc: 'رد سريع داخل المنصة' },
              { href: `/store/${store.slug}/privacy`, icon: '🔒', title: 'سياسة الخصوصية', desc: `خصوصيتك في ${kn.pageWord}` },
              { href: `/store/${store.slug}/terms`, icon: '📜', title: 'شروط الاستخدام', desc: `قواعد التعامل مع ${kn.pageWord}` },
              { href: `/store/${store.slug}/returns`, icon: '🔄', title: 'سياسة الاسترجاع', desc: `حقك محفوظ عند ${kn.pageWord}` },
              ...(store.isVerified ? [{ href: `/store/${store.slug}/certificate`, icon: '🎖️', title: 'شهادة التوثيق', desc: `${kn.label} موثّق رسمياً` }] : []),
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className={`group p-3 rounded-2xl transition-all hover:-translate-y-0.5 ${
                  isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-gray-50 hover:bg-white border border-gray-100 hover:shadow-md'
                }`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2 transition-transform group-hover:scale-110"
                  style={{ background: `${primary}18` }}>
                  {l.icon}
                </div>
                <div className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{l.title}</div>
                <div className="text-[11px] mt-0.5 text-gray-400">{l.desc}</div>
                <div className="text-[10px] font-bold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: primary }}>
                  انتقل ←
                </div>
              </Link>
            ))}
          </div>
          {/* تواصل سريع */}
          {store.whatsapp && (
            <div className="px-3 md:px-4 pb-3 md:pb-4">
              <a href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank"
                className="flex items-center justify-center gap-2 p-3 rounded-2xl text-white font-extrabold text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                💬 تواصل معنا عبر واتساب
              </a>
            </div>
          )}
          {/* الشريط السفلي */}
          <div className={`text-center text-[11px] py-3 border-t ${isDark ? 'border-white/10 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
            {kn.noun} {store.name} — مدعوم بـ <a href="/" className="font-black" style={{ color: primary }}>يمن زون</a>
          </div>
        </div>
      </section>

      {/* السلة المنزلقة — متاجر المنتجات فقط */}
      {isProducts && <CartDrawer store={store} primary={primary} />}

      {/* زر واتساب عائم */}
      {store.whatsapp && (
        <a href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank"
          className="fixed bottom-20 md:bottom-6 left-4 z-40 w-14 h-14 rounded-full bg-green-500 shadow-2xl flex items-center justify-center text-2xl anim-pulse-glow">
          💬
        </a>
      )}
    </main>
  );
}

// بطاقة المنتج — تتكيف مع القالب (زووم ناعم + إطار متوهج + شارات متدرجة)
function ProductCard({ p, st, primary, isDark, store }: any) {
  const { fmt } = useCurrency();
  return (
    <div className={`${st.card} overflow-hidden card-hover card-glow`}>
      <div className="h-32 md:h-40 relative overflow-hidden">
        <div className="zoom-bg absolute inset-0"
          style={p.images?.[0]
            ? { background: `url(${API}${p.images[0]}) center/cover` }
            : { background: `linear-gradient(135deg, ${primary}15, ${primary}30)` }} />
        {!p.images?.[0] && (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-40">📦</div>
        )}
        {p.salePrice && (
          <span className="sale-badge absolute top-2 right-2 text-[10px] px-2 py-0.5">
            خصم {Math.round((1 - p.salePrice / p.price) * 100)}% 🔥
          </span>
        )}
        {p.stock <= 0 && (
          <span className="out-overlay absolute inset-0 flex items-center justify-center text-white text-sm font-bold">نفد المخزون</span>
        )}
      </div>
      <div className="p-3">
        <div className={`font-extrabold f-sm truncate ${isDark ? 'text-white' : ''}`}>{p.name}</div>
        {p.description && (
          <div className="f-xs mt-0.5 line-clamp-2 text-gray-400">{p.description}</div>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          {p.salePrice ? (
            <>
              <span className="font-black text-red-500 f-sm">{fmt(Number(p.salePrice), p.currency)}</span>
              <span className="text-[10px] text-gray-400 line-through">{fmt(Number(p.price), p.currency)}</span>
            </>
          ) : (
            <span className="font-black f-sm price-grad">{fmt(Number(p.price), p.currency)}</span>
          )}
        </div>
        {p.stock > 0 && (
          <div className="flex gap-1 mt-2">
            {Array.isArray(p.variants) && p.variants.length > 0 ? (
              <Link href={`/store/${store.slug}/product/${p.id}`}
                className="theme-glow flex-1 py-2 rounded-xl text-white text-xs font-extrabold text-center transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)` }}>
                🎨 اختر الخيار
              </Link>
            ) : (
            <button
              onClick={() => {
                if (store.pausedAt) { toast(store.pauseNote ? `⏸️ مغلق مؤقتاً — ${store.pauseNote}` : '⏸️ مغلق مؤقتاً — يعود قريباً', 'error'); return; }
                addToCart(store.slug, {
                  productId: p.id, name: p.name,
                  price: Number(p.salePrice || p.price), image: p.images?.[0],
                  currency: p.currency,
                });
                toast('🛒 أُضيف إلى السلة');
              }}
              className="theme-glow flex-1 py-2 rounded-xl text-white text-xs font-extrabold transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)` }}>
              {store.pausedAt ? '⏸️ مغلق مؤقتاً' : '🛒 أضف للسلة'}
            </button>
            )}
            <Link href={`/store/${store.slug}/product/${p.id}`}
              className="px-3 py-2 rounded-xl text-xs font-extrabold transition-all hover:opacity-80"
              style={{ background: `${primary}20`, color: primary }}>
              👁️
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// 🍽️ بطاقة صنف المنيو — صف أفقي بأسلوب قوائم المطاعم: صورة شهية + تفاصيل + سعر وإضافة
function MenuCard({ p, st, primary, isDark, store }: any) {
  const { fmt } = useCurrency();
  const out = p.stock <= 0;
  const specs = (p.specs && typeof p.specs === 'object') ? p.specs : {};
  return (
    <div className={`${st.card} card-hover card-glow overflow-hidden flex gap-3 p-2.5`}>
      {/* صورة الطبق */}
      <Link href={`/store/${store.slug}/product/${p.id}`}
        className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden shrink-0 block self-center">
        <div className="zoom-bg absolute inset-0"
          style={p.images?.[0]
            ? { background: `url(${API}${p.images[0]}) center/cover` }
            : { background: `linear-gradient(135deg, ${primary}15, #FFB80025)` }} />
        {!p.images?.[0] && (
          <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-40">🍽️</div>
        )}
        {p.salePrice && !out && (
          <span className="sale-badge absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5">
            −{Math.round((1 - p.salePrice / p.price) * 100)}%
          </span>
        )}
      </Link>

      {/* التفاصيل */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Link href={`/store/${store.slug}/product/${p.id}`}
          className={`font-extrabold f-sm truncate hover:opacity-80 ${isDark ? 'text-white' : ''}`}>
          {p.name}
        </Link>
        {p.description && (
          <div className="f-xs mt-0.5 line-clamp-2 text-gray-400 leading-relaxed">{p.description}</div>
        )}
        {/* لمسات المطبخ: درجة الحار + وقت التحضير */}
        {(specs.spiceLevel || specs.prepMinutes) && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {specs.spiceLevel && specs.spiceLevel !== 'عادي' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">🌶️ {specs.spiceLevel}</span>
            )}
            {Number(specs.prepMinutes) > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">⏱️ {specs.prepMinutes} دقيقة</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {p.salePrice ? (
              <>
                <span className="font-black text-red-500 f-sm">{fmt(Number(p.salePrice), p.currency)}</span>
                <span className="text-[10px] text-gray-400 line-through">{fmt(Number(p.price), p.currency)}</span>
              </>
            ) : (
              <span className="font-black f-sm price-grad">{fmt(Number(p.price), p.currency)}</span>
            )}
          </div>
          {out ? (
            <span className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-gray-100 text-gray-400 shrink-0">نفد حالياً</span>
          ) : Array.isArray(p.variants) && p.variants.length > 0 ? (
            <Link href={`/store/${store.slug}/product/${p.id}`}
              className="theme-glow text-[11px] font-black px-3.5 py-1.5 rounded-xl text-white shrink-0 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)` }}>
              🎨 اختر
            </Link>
          ) : (
            <button
              onClick={() => {
                addToCart(store.slug, {
                  productId: p.id, name: p.name,
                  price: Number(p.salePrice || p.price), image: p.images?.[0],
                  currency: p.currency,
                });
                toast('🍽️ أُضيف إلى طلبك');
              }}
              className="theme-glow text-[11px] font-black px-3.5 py-1.5 rounded-xl text-white shrink-0 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)` }}>
              ➕ أضف
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
