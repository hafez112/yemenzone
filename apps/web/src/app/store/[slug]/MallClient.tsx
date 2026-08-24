'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReviewsSection from '@/components/ReviewsSection';
import MallProductCard from '@/components/mall/MallProductCard';
import StorePwaInstall from '@/components/StorePwaInstall';
import StoreMap from '@/components/store/StoreMap';
import { getCart } from '@/lib/cart';
import { adImgUrl } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const GOLD = '#F59E0B';

// ═══════════════════════════════════════════════════════════
//  🏬 واجهة المول التجاري — سوق إلكتروني شامل بتصميم راقٍ:
//  شريط أدوات علوي ثانٍ (قائمة أصناف منسدلة + بحث ذكي + سلة)
//  أقسام: متميزة ⭐ / الأكثر مبيعاً 🔥 / وصل حديثاً 🆕 / عروض 🏷️
// ═══════════════════════════════════════════════════════════
export default function MallClient({ store, banners, bannerIdx, setBannerIdx }: {
  store: any; banners: any[]; bannerIdx: number; setBannerIdx: (i: number) => void;
}) {
  const router = useRouter();
  const theme = (store.themeJson as any) || {};
  const primary = theme.primary || '#7C3AED';
  const secondary = theme.secondary || GOLD;

  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // 🛒 عداد السلة الحي — سلة المول المنفصلة
  useEffect(() => {
    const sync = () => setCartCount((getCart(store.slug) || []).reduce((s: number, i: any) => s + i.qty, 0));
    sync();
    window.addEventListener('yz-cart', sync);
    // فتح السلة من أي زر → صفحة سلة المول المنفصلة
    const openCart = () => router.push(`/store/${store.slug}/cart`);
    window.addEventListener('yz-open-cart', openCart);
    return () => {
      window.removeEventListener('yz-cart', sync);
      window.removeEventListener('yz-open-cart', openCart);
    };
  }, [store.slug, router]);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: any) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  // 🏬 حمولة المول من الـ API — مع احتياط من البيانات المسطحة
  const mall = store.mall || { categoriesTree: [], featured: [], topSellers: [], newArrivals: [], offers: [] };
  const tree: any[] = mall.categoriesTree || [];

  // كل منتجات المول — للبحث الذكي الفوري
  const allProducts = useMemo(() => {
    const map = new Map<string, any>();
    for (const list of [mall.featured, mall.topSellers, mall.newArrivals, mall.offers]) {
      for (const p of list || []) if (!map.has(p.id)) map.set(p.id, p);
    }
    for (const c of store.categories || []) for (const p of c.products || []) if (!map.has(p.id)) map.set(p.id, p);
    for (const p of store.uncategorized || []) if (!map.has(p.id)) map.set(p.id, p);
    return [...map.values()];
  }, [store, mall]);

  // 🔍 البحث الذكي: الاسم + الوصف المختصر + الكلمات المفتاحية + اسم الصنف
  const q = search.trim();
  const results = useMemo(() => {
    if (!q) return [];
    const catOf = new Map<string, string>();
    for (const t of tree) {
      catOf.set(t.id, t.name);
      for (const ch of t.children || []) catOf.set(ch.id, `${t.name} › ${ch.name}`);
    }
    return allProducts
      .map((p) => {
        const hay = `${p.name} ${p.shortDesc || ''} ${p.keywords || ''} ${catOf.get(p.categoryId) || ''}`;
        const inName = p.name.includes(q);
        if (!inName && !hay.includes(q)) return null;
        return { ...p, _rank: inName ? 2 : 1 };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b._rank - a._rank)
      .slice(0, 24) as any[];
  }, [q, allProducts, tree]);

  const totalProducts = store._count?.products || allProducts.length;

  // قسم تمرير أفقي أنيق
  const Section = ({ icon, title, sub, items, href, accent }: any) => {
    if (!items?.length) return null;
    return (
      <section className="max-w-6xl mx-auto px-3 mt-8">
        <div className="flex items-end justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h2 className="f-xl font-black flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${accent || primary}, ${secondary})` }}>{icon}</span>
              {title}
            </h2>
            {sub && <p className="f-xs text-gray-400 font-bold mt-1 pr-11">{sub}</p>}
          </div>
          <Link href={href} className="f-xs font-extrabold px-3 py-1.5 rounded-full transition-all hover:scale-105 shrink-0"
            style={{ background: `${primary}12`, color: primary }}>
            عرض الكل ←
          </Link>
        </div>
        <div className="store-rail flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 edge-fade snap-x">
          {items.map((p: any) => (
            <div key={p.id} className="store-rail-item shrink-0 snap-start">
              <MallProductCard p={p} store={store} primary={primary} />
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen pb-24" style={{ '--tp': primary, '--ts': secondary, background: `linear-gradient(180deg, ${primary}08, transparent 40%), #faf9ff` } as any}>

      {/* ═══ شريط أدوات المول العلوي — تحت شريط المتجر العام ═══ */}
      <div className="sticky top-14 z-40 backdrop-blur-xl bg-white/85 border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2">
          {/* القائمة المنسدلة للأصناف */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white font-extrabold text-sm shadow-lg transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
              🗂️ الأصناف <span className={`text-[10px] transition-transform ${menuOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {menuOpen && (
              <div className="absolute top-full right-0 mt-2 w-[min(92vw,560px)] bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 anim-bounce-in max-h-[70vh] overflow-y-auto">
                <Link href={`/store/${store.slug}/categories`} onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl mb-2 font-black text-sm text-white"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                  🏬 كل أصناف المول <span>←</span>
                </Link>
                {tree.length === 0 && <p className="text-center text-gray-400 text-sm font-bold py-6">الأصناف قيد التجهيز 🏬</p>}
                <div className="grid sm:grid-cols-2 gap-2">
                  {tree.map((t: any) => (
                    <div key={t.id} className="rounded-2xl border border-gray-100 p-3">
                      <Link href={`/store/${store.slug}/category/${t.id}`} onClick={() => setMenuOpen(false)}
                        className="font-extrabold text-sm flex items-center justify-between" style={{ color: primary }}>
                        {t.name}
                        <span className="text-[10px] text-gray-400 font-bold">{t.productsCount} منتج</span>
                      </Link>
                      {t.children?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {t.children.map((ch: any) => (
                            <Link key={ch.id} href={`/store/${store.slug}/category/${ch.id}`} onClick={() => setMenuOpen(false)}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all hover:scale-105"
                              style={{ background: `${primary}10`, color: primary }}>
                              {ch.name} ({ch.productsCount})
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* البحث الذكي */}
          <div className="flex-1 relative">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 ابحث في المول: منتج، صنف، كلمة مفتاحية..."
              className="w-full px-4 py-2.5 rounded-2xl outline-none bg-gray-100/80 border border-transparent focus:border-purple-200 focus:bg-white transition-all text-sm font-bold" />
            {q && (
              <button onClick={() => setSearch('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-200 text-xs font-black">✕</button>
            )}
          </div>

          {/* العروض + السلة */}
          <Link href={`/store/${store.slug}/mall/offers`}
            className="hidden sm:flex items-center gap-1 px-3 py-2.5 rounded-2xl font-extrabold text-sm text-white shadow-lg transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #EF4444)` }}>
            🏷️ العروض
          </Link>
          <Link href={`/store/${store.slug}/cart`} aria-label="السلة"
            className="relative w-11 h-11 rounded-2xl flex items-center justify-center text-lg transition-all hover:scale-110"
            style={{ background: `${primary}12` }}>
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -left-1 min-w-[20px] h-5 px-1 rounded-full text-white text-[11px] font-black flex items-center justify-center anim-soft-pulse"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #EF4444)` }}>
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ═══ نتائج البحث الذكي ═══ */}
      {q ? (
        <section className="max-w-6xl mx-auto px-3 mt-6">
          <h2 className="f-xl font-black mb-1">🔍 نتائج «{q}»</h2>
          <p className="f-xs text-gray-400 font-bold mb-3">
            {results.length === 0 ? 'لا نتائج — جرّب كلمة أخرى' : results.length === 1 ? 'منتج واحد مطابق' : results.length === 2 ? 'منتجان مطابقان' : results.length <= 10 ? `${results.length} منتجات مطابقة` : `${results.length} منتجاً مطابقاً`}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {results.map((p: any) => <MallProductCard key={p.id} p={p} store={store} primary={primary} />)}
          </div>
          {results.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-6xl mb-3">🔍</div>
              <p className="font-bold">لم نجد «{q}» — تصفح الأصناف من القائمة المنسدلة</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ═══ غلاف المول الفاخر ═══ */}
          <header className="relative overflow-hidden">
            <div className="h-52 md:h-64 w-full relative"
              style={{
                background: store.cover
                  ? `url(${API}${store.cover}) center/cover`
                  : `linear-gradient(120deg, ${primary}, ${secondary} 55%, ${primary})`,
                backgroundSize: store.cover ? undefined : '200% 200%',
              }}>
              {!store.cover && <div className="anim-blob absolute inset-0" style={{ background: `linear-gradient(120deg, ${primary}, ${secondary}, ${primary})`, backgroundSize: '300% 300%' }} />}
              <div className="absolute inset-0 bg-black/35" />
              <div className="absolute inset-0 cover-fade" />
              <div className="absolute inset-x-0 bottom-0 p-4 max-w-6xl mx-auto">
                <div className="flex items-end gap-3">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl border-4 border-white/90 bg-white flex items-center justify-center text-3xl shrink-0 shadow-2xl overflow-hidden">
                    {store.logo ? <img src={`${API}${store.logo}`} alt="" className="w-full h-full object-cover" /> : '🏬'}
                  </div>
                  <div className="text-white min-w-0">
                    <h1 className="f-2xl font-black flex items-center gap-1.5" style={{ textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>
                      {store.name} {store.isVerified && <span className="verified-badge">✓</span>}
                    </h1>
                    <div className="text-xs opacity-95 flex items-center gap-1.5 flex-wrap font-bold">
                      <span>🏬 مول تجاري • {store.governorate || 'اليمن'} • ⭐ {store.ratingAvg?.toFixed(1) || 'جديد'}</span>
                      {store.sellerLevel && store.sellerLevel.id !== 'bronze' && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/25 backdrop-blur">
                          {store.sellerLevel.icon} تاجر {store.sellerLevel.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* شريط إحصاءات المول */}
            <div className="max-w-6xl mx-auto px-3">
              <div className="grid grid-cols-3 gap-2 -mt-6 relative z-10 stagger">
                {[
                  { icon: '📦', v: totalProducts, l: 'منتج' },
                  { icon: '🗂️', v: tree.length, l: 'صنف رئيسي' },
                  { icon: '🏷️', v: mall.offers?.length || 0, l: 'عرض نشط' },
                ].map((s) => (
                  <div key={s.l} className="glass rounded-2xl p-3 text-center shadow-lg">
                    <div className="text-xl">{s.icon}</div>
                    <div className="f-xl font-black price-grad">{s.v}</div>
                    <div className="f-xs font-bold text-gray-400">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </header>

          {/* وصف المول */}
          {store.description && (
            <p className="max-w-6xl mx-auto px-3 mt-4 text-sm leading-relaxed text-gray-500">{store.description}</p>
          )}

          {/* 🖼️ بانرات المول */}
          {banners.length > 0 && (
            <div className="max-w-6xl mx-auto px-3 mt-4">
              <div className="relative rounded-3xl overflow-hidden shadow-xl glow-soft">
                <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(${bannerIdx * 100}%)` }}>
                  {banners.map((b: any, bi: number) => (
                    <a key={b.id} href={b.link || undefined} target={b.link?.startsWith('http') ? '_blank' : undefined}
                      onClick={() => fetch(`${API}/api/v1/ads/${b.id}/click`, { method: 'POST' }).catch(() => {})}
                      className="relative w-full shrink-0 aspect-[16/5] block">
                      <img src={adImgUrl(b.image)} alt={b.title} loading={bi === 0 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 h-2/5" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,.65), transparent)' }} />
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

          {/* 🗂️ تسوق حسب الأصناف */}
          {tree.length > 0 && (
            <section className="max-w-6xl mx-auto px-3 mt-8">
              <div className="flex items-end justify-between gap-2 mb-3">
                <h2 className="f-xl font-black flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>🗂️</span>
                  تسوق حسب الأصناف
                </h2>
                <Link href={`/store/${store.slug}/categories`} className="f-xs font-extrabold px-3 py-1.5 rounded-full transition-all hover:scale-105"
                  style={{ background: `${primary}12`, color: primary }}>كل الأصناف ←</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 stagger">
                {tree.slice(0, 8).map((t: any) => (
                  <Link key={t.id} href={`/store/${store.slug}/category/${t.id}`}
                    className="group relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-sm card-hover p-4">
                    <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full opacity-20 transition-transform group-hover:scale-125"
                      style={{ background: `radial-gradient(circle, ${primary}, transparent)` }} />
                    <div className="relative">
                      <div className="font-extrabold text-sm">{t.name}</div>
                      <div className="f-xs text-gray-400 font-bold mt-0.5">{t.productsCount} منتج</div>
                      {t.children?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {t.children.slice(0, 3).map((ch: any) => (
                            <span key={ch.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${primary}10`, color: primary }}>{ch.name}</span>
                          ))}
                          {t.children.length > 3 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">+{t.children.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ═══ أقسام المول ═══ */}
          <Section icon="⭐" title="منتجات متميزة" sub="مختارات إدارة المول بعناية" items={mall.featured}
            href={`/store/${store.slug}/mall/featured`} accent={GOLD} />
          <Section icon="🔥" title="الأكثر مبيعاً" sub="ما يطلبه المتسوقون فعلاً" items={mall.topSellers}
            href={`/store/${store.slug}/mall/top`} accent="#EF4444" />
          <Section icon="🆕" title="وصل حديثاً" sub="أحدث ما أُضيف إلى المول" items={mall.newArrivals}
            href={`/store/${store.slug}/mall/new`} accent="#0D9488" />
          <Section icon="🏷️" title="عروض وتخفيضات" sub="وفّر أكثر — أسعار مخفضة لفترة محدودة" items={mall.offers}
            href={`/store/${store.slug}/mall/offers`} accent="#DC2626" />

          {/* حالة فارغة */}
          {totalProducts === 0 && (
            <div className="max-w-6xl mx-auto px-3 mt-10 text-center py-16 text-gray-400">
              <div className="text-6xl mb-3">🏬</div>
              <p className="font-black text-lg">المول يُجهَّز الآن</p>
              <p className="f-xs font-bold mt-1">عُد قريباً — أصناف ومنتجات رائعة في الطريق ✨</p>
            </div>
          )}

          {/* التقييمات */}
          <div className="mt-8">
            <ReviewsSection store={store} primary={primary} isDark={false} />
          </div>

          {/* 🗺️ خريطة المول */}
          <StoreMap store={store} primary={primary} />
        </>
      )}

      {/* ═══ تذييل المول: السياسات والتواصل ═══ */}
      <footer className="max-w-6xl mx-auto px-3 mt-12">
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href={`/store/${store.slug}/privacy`}
              className="px-4 py-2 rounded-full text-xs font-extrabold bg-gray-50 border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all">
              🔒 سياسة الخصوصية
            </Link>
            <Link href={`/store/${store.slug}/terms`}
              className="px-4 py-2 rounded-full text-xs font-extrabold bg-gray-50 border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all">
              📜 شروط الاستخدام
            </Link>
            <Link href={`/store/${store.slug}/returns`}
              className="px-4 py-2 rounded-full text-xs font-extrabold bg-gray-50 border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all">
              🔄 سياسة الاسترجاع
            </Link>
            {store.whatsapp && (
              <a href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"
                className="px-4 py-2 rounded-full text-xs font-extrabold text-white shadow transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                💬 تواصل معنا
              </a>
            )}
          </div>
          <p className="text-center text-[10px] text-gray-400 font-bold mt-4">
            🏬 {store.name} — مول تجاري على منصة <a href="https://yemenzone1.com" target="_blank" rel="noreferrer" className="hover:text-purple-500 transition-colors">يمن زون ⚡</a>
          </p>
        </div>
      </footer>

      {/* زر واتساب عائم */}
      {store.whatsapp && (
        <a href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank"
          className="fixed bottom-20 md:bottom-6 left-4 z-40 w-14 h-14 rounded-full bg-green-500 shadow-2xl flex items-center justify-center text-2xl anim-pulse-glow">
          💬
        </a>
      )}

      {/* زر تثبيت تطبيق المول (PWA) */}
      <StorePwaInstall store={store} />
    </main>
  );
}
