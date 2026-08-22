'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import CartDrawer from '@/components/CartDrawer';
import { addToCart } from '@/lib/cart';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// قسم كل المنتجات مع فلتر شامل: صنف + سعر + عروض + ترتيب
export default function AllProductsClient({ store }: { store: any }) {
  const { fmt } = useCurrency();
  const theme = (store.themeJson as any) || {};
  const primary = theme.primary || '#6C3DF5';
  const secondary = theme.secondary || '#00E5C7';
  const isDark = store.template === 'dark';
  // 🍽️ تسمية النشاط — للمطعم: المنيو والأصناف، لا «منتجات»
  const isRestaurant = store.type?.kind === 'restaurants';
  const isMall = store.type?.kind === 'malls';
  const T = isRestaurant
    ? { title: `منيو ${store.name}`, back: '→ المطعم', icon: '🍽️', empty: 'لا أصناف مطابقة في المنيو', search: '🔍 ابحث في المنيو...' }
    : isMall
      ? { title: `كل منتجات ${store.name}`, back: '→ المول', icon: '🏬', empty: 'لا منتجات مطابقة للفلتر', search: '🔍 ابحث في المول...' }
      : { title: `كل منتجات ${store.name}`, back: '→ المتجر', icon: '🛍️', empty: 'لا منتجات مطابقة للفلتر', search: '🔍 ابحث في المنتجات...' };

  const [cat, setCat] = useState('all');
  const [offersOnly, setOffersOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState('smart'); // smart | cheap | expensive | newest
  const [search, setSearch] = useState('');

  const all = useMemo(() => {
    const list: any[] = [];
    for (const c of store.categories || []) for (const p of c.products) list.push({ ...p, catName: c.name, catId: c.id });
    for (const p of store.uncategorized || []) list.push({ ...p, catName: 'عام', catId: null });
    return list;
  }, [store]);

  const shown = useMemo(() => {
    let list = all.filter(p =>
      (cat === 'all' || p.catId === cat) &&
      (!offersOnly || p.salePrice) &&
      (!inStockOnly || p.stock > 0) &&
      (!search || p.name.includes(search))
    );
    if (sort === 'cheap') list.sort((a, b) => Number(a.salePrice || a.price) - Number(b.salePrice || b.price));
    else if (sort === 'expensive') list.sort((a, b) => Number(b.salePrice || b.price) - Number(a.salePrice || a.price));
    else if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // smart = الترتيب القادم من الذكاء المحلي (افتراضي)
    return list;
  }, [all, cat, offersOnly, inStockOnly, sort, search]);

  return (
    <main className={`min-h-screen pb-24 ${isDark ? 'text-white store-dark' : 'bg-gray-50'}`}
      style={{ '--tp': primary, '--ts': secondary,
               ...(isDark ? { background: 'linear-gradient(180deg, #0A0A14, #141428)' } : {}) } as any}>
      <div className="max-w-5xl mx-auto px-3 pt-20">
        <div className="flex items-center justify-between mb-4">
          <h1 className="f-2xl font-black flex items-center gap-2.5">
            <span className="section-chip" style={{ width: '2.3rem', height: '2.3rem', fontSize: '1.1rem' }}>{T.icon}</span>
            {T.title}
          </h1>
          <Link href={`/store/${store.slug}`} className="text-sm font-bold" style={{ color: primary }}>
            {T.back}
          </Link>
        </div>

        {/* البحث */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={T.search}
          className={`w-full px-4 py-3 rounded-2xl outline-none mb-3 ${
            isDark ? 'bg-white/10 border border-white/10 text-white' : 'bg-white border border-gray-200'
          }`} />

        {/* الفلاتر */}
        <div className={`rounded-2xl p-3 mb-4 space-y-3 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
          {/* الأصناف */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterBtn active={cat === 'all'} onClick={() => setCat('all')} primary={primary} isDark={isDark}>الكل</FilterBtn>
            {(store.categories || []).map((c: any) => (
              <FilterBtn key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} primary={primary} isDark={isDark}>
                {c.name}
              </FilterBtn>
            ))}
          </div>
          {/* خيارات */}
          <div className="flex flex-wrap gap-2 items-center">
            <FilterBtn active={offersOnly} onClick={() => setOffersOnly(!offersOnly)} primary={primary} isDark={isDark}>
              🔥 العروض فقط
            </FilterBtn>
            <FilterBtn active={inStockOnly} onClick={() => setInStockOnly(!inStockOnly)} primary={primary} isDark={isDark}>
              ✅ المتوفر فقط
            </FilterBtn>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className={`px-3 py-2 rounded-full text-xs font-bold outline-none ${
                isDark ? 'bg-white/10 text-white' : 'bg-gray-100'
              }`}>
              <option value="smart">🤖 ترتيب ذكي</option>
              <option value="cheap">الأرخص أولاً</option>
              <option value="expensive">الأغلى أولاً</option>
              <option value="newest">الأحدث أولاً</option>
            </select>
            <span className={`text-xs font-bold mr-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {shown.length} منتج
            </span>
          </div>
        </div>

        {/* الشبكة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {shown.map((p: any) => (
            <div key={p.id} className={`rounded-3xl overflow-hidden card-hover card-glow ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm'
            }`}>
              <Link href={`/store/${store.slug}/product/${p.id}`}>
                <div className="h-32 relative overflow-hidden">
                  <div className="zoom-bg absolute inset-0" style={p.images?.[0]
                    ? { background: `url(${API}${p.images[0]}) center/cover` }
                    : { background: `${primary}15` }} />
                  {p.salePrice && (
                    <span className="sale-badge absolute top-2 right-2 text-[10px] px-2 py-0.5">
                      −{Math.round((1 - p.salePrice / p.price) * 100)}%
                    </span>
                  )}
                  {p.stock <= 0 && (
                    <span className="out-overlay absolute inset-0 flex items-center justify-center text-white text-xs font-bold">نفد المخزون</span>
                  )}
                </div>
              </Link>
              <div className="p-2.5">
                <div className="font-extrabold text-xs truncate">{p.name}</div>
                <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{p.catName}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  {p.salePrice ? (
                    <>
                      <span className="font-black text-red-500 f-sm">{fmt(Number(p.salePrice), p.currency)}</span>
                      <span className="text-[10px] text-gray-400 line-through">{fmt(Number(p.price), p.currency)}</span>
                    </>
                  ) : (
                    <span className="font-black f-sm price-grad">{fmt(Number(p.price), p.currency)}</span>
                  )}
                </div>
                {p.stock > 0 && (Array.isArray(p.variants) && p.variants.length > 0 ? (
                  <a href={`/store/${store.slug}/product/${p.id}`}
                    className="theme-glow block w-full mt-1.5 py-2 rounded-xl text-white text-xs font-extrabold text-center"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)` }}>
                    🎨 اختر الخيار
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      addToCart(store.slug, { productId: p.id, name: p.name, price: Number(p.salePrice || p.price), image: p.images?.[0], currency: p.currency });
                      toast('🛒 أُضيف إلى السلة');
                    }}
                    className="theme-glow w-full mt-1.5 py-2 rounded-xl text-white text-xs font-extrabold"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)` }}>
                    🛒 أضف
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {shown.length === 0 && (
          <div className={`text-center py-16 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <div className="text-5xl mb-3">{isRestaurant ? '🍽️' : '🔍'}</div>
            {T.empty}
          </div>
        )}
      </div>
      <CartDrawer store={store} primary={primary} />
    </main>
  );
}

function FilterBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      className={`theme-chip shrink-0 ${active ? 'on' : ''}`}>
      {children}
    </button>
  );
}
