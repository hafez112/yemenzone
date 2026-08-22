'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import { getRecent, getCompare } from '@/lib/recent';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🔍 صفحة الاستكشاف — فلاتر متعددة + فرز ذكي + شوهد مؤخراً
const SORTS = [
  { id: '', label: '🆕 الأحدث' },
  { id: 'popular', label: '🔥 الأكثر مشاهدة' },
  { id: 'price_asc', label: '💸 الأرخص' },
  { id: 'price_desc', label: '💎 الأغلى' },
  { id: 'rating', label: '⭐ الأعلى تقييماً' },
];

function ExploreInner() {
  const { fmt } = useCurrency();
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const [cmpCount, setCmpCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [q, setQ] = useState(params.get('q') || '');
  const [qLive, setQLive] = useState(params.get('q') || '');
  const [gov, setGov] = useState('');
  const [type, setType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [saleOnly, setSaleOnly] = useState(false);
  const [sort, setSort] = useState('');

  useEffect(() => { setRecent(getRecent()); setCmpCount(getCompare().length); }, []);

  // تهدئة البحث أثناء الكتابة
  useEffect(() => {
    const t = setTimeout(() => setQLive(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const buildQuery = (p: number) => {
    const qs = new URLSearchParams();
    if (qLive) qs.set('q', qLive);
    if (gov) qs.set('governorate', gov);
    if (type) qs.set('type', type);
    if (minPrice) qs.set('minPrice', minPrice);
    if (maxPrice) qs.set('maxPrice', maxPrice);
    if (minRating) qs.set('minRating', minRating);
    if (saleOnly) qs.set('sale', '1');
    if (sort) qs.set('sort', sort);
    qs.set('page', String(p));
    return qs;
  };

  const load = async () => {
    setLoading(true); setPage(1);
    try {
      const d = await fetch(`${API}/api/v1/explore?${buildQuery(1)}`).then((r) => r.json());
      setData(d); setItems(d.items);
    } catch { toast('تعذر تحميل المنتجات', 'error'); }
    setLoading(false);
  };

  const loadMore = async () => {
    const next = page + 1;
    setMoreLoading(true);
    try {
      const d = await fetch(`${API}/api/v1/explore?${buildQuery(next)}`).then((r) => r.json());
      setItems((prev) => [...prev, ...d.items]);
      setPage(next); setData(d);
    } catch { toast('تعذر تحميل المزيد', 'error'); }
    setMoreLoading(false);
  };

  useEffect(() => { load(); }, [qLive, gov, type, minPrice, maxPrice, minRating, saleOnly, sort]);

  const activeFilters = [gov, type, minPrice, maxPrice, minRating, saleOnly ? 'sale' : ''].filter(Boolean).length;
  const facets = data?.facets;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-3"><span className="section-chip">🧭</span><h1 className="f-2xl font-black">استكشاف المنتجات</h1></div>
            <p className="text-[11px] text-gray-400 font-bold mt-0.5">🎖️ نعرض منتجات المتاجر الموثقة فقط — تسوّق بثقة</p>
          </div>
          {data && <span className="text-xs font-bold text-gray-500">{data.total.toLocaleString()} منتج</span>}
        </div>

        {/* البحث */}
        <div className="glass rounded-2xl flex items-center gap-2 p-2 pr-4 mb-3">
          <span className="text-lg">🔍</span>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في كل منتجات المنصة…"
            className="flex-1 bg-transparent outline-none text-sm py-1.5" />
          {q && <button onClick={() => setQ('')} className="text-gray-400 px-2">✕</button>}
        </div>

        {/* زر الفلاتر + الفرز */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${showFilters || activeFilters ? 'text-white shadow-lg' : 'glass'}`}
            style={showFilters || activeFilters ? { background: 'linear-gradient(135deg, var(--primary), var(--secondary))' } : {}}>
            🎛️ الفلاتر {activeFilters > 0 && `(${activeFilters})`}
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="glass rounded-xl px-3 py-2 text-xs font-extrabold outline-none flex-1">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button onClick={() => setSaleOnly(!saleOnly)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${saleOnly ? 'text-white bg-red-500 shadow-lg' : 'glass'}`}>
            🔥 عروض
          </button>
        </div>

        {/* لوحة الفلاتر */}
        {showFilters && (
          <div className="glass rounded-3xl p-4 mb-4 anim-bounce-in">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select value={gov} onChange={(e) => setGov(e.target.value)} className="bg-white/80 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
                <option value="">📍 كل المحافظات</option>
                {facets?.governorates?.map((g: string) => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={type} onChange={(e) => setType(e.target.value)} className="bg-white/80 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
                <option value="">🏪 كل الأنواع</option>
                {facets?.types?.map((t: any) => <option key={t.id} value={t.id}>{t.icon} {t.nameAr}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                placeholder="أقل سعر" className="bg-white/80 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
              <input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={`أعلى سعر${facets?.maxPrice ? ` (حتى ${Number(facets.maxPrice).toLocaleString()})` : ''}`}
                className="bg-white/80 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
            </div>
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="w-full bg-white/80 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
              <option value="">⭐ أي تقييم للمتجر</option>
              <option value="3">⭐ 3 فأكثر</option>
              <option value="4">⭐ 4 فأكثر</option>
              <option value="4.5">⭐ 4.5 فأكثر — النخبة</option>
            </select>
            {activeFilters > 0 && (
              <button onClick={() => { setGov(''); setType(''); setMinPrice(''); setMaxPrice(''); setMinRating(''); setSaleOnly(false); }}
                className="w-full mt-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-extrabold">
                🧹 مسح كل الفلاتر
              </button>
            )}
          </div>
        )}

        {/* 🕘 شوهد مؤخراً */}
        {recent.length > 0 && page === 1 && !loading && (
          <div className="mb-5">
            <div className="text-sm font-black mb-2">🕘 شوهد مؤخراً</div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {recent.slice(0, 8).map((r) => (
                <Link key={r.id} href={`/store/${r.storeSlug}/product/${r.id}`}
                  className="glass rounded-2xl p-2 w-28 shrink-0 card-hover block">
                  <div className="w-full h-16 rounded-xl skeleton mb-1.5 flex items-center justify-center text-lg"
                    style={r.image ? { background: `url(${imgUrl(r.image)}) center/cover`, animation: 'none' } : {}}>
                    {!r.image && '📦'}
                  </div>
                  <div className="text-[10px] font-bold truncate">{r.name}</div>
                  <div className="text-[10px] font-black" style={{ color: 'var(--primary)' }}>
                    {Number(r.salePrice || r.price).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* الشبكة */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="skeleton h-52 rounded-3xl" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
              {items.map((p) => {
                const price = Number(p.salePrice || p.price);
                const discount = p.salePrice ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
                return (
                  <Link key={p.id} href={`/store/${p.store.slug}/product/${p.id}`}
                    className="glass rounded-3xl overflow-hidden card-hover block">
                    <div className="h-36 relative skeleton flex items-center justify-center text-3xl"
                      style={p.images?.[0] ? { background: `url(${imgUrl(p.images[0])}) center/cover`, animation: 'none' } : {}}>
                      {!p.images?.[0] && '📦'}
                      {discount > 0 && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                          -{discount}% 🔥
                        </span>
                      )}
                      {p.stock <= 0 && (
                        <span className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-xs font-bold">نفد</span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-extrabold text-[13px] truncate">{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-black text-sm grad-text">{fmt(price, p.currency)}</span>
                        {discount > 0 && <span className="text-[10px] text-gray-400 line-through">{Number(p.price).toLocaleString()}</span>}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 truncate">
                        🏪 {p.store.name} {p.store.isVerified && '✅'} {p.store.governorate ? `· ${p.store.governorate}` : ''}
                      </div>
                      {p.store.ratingAvg > 0 && (
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--accent)' }}>★ {p.store.ratingAvg.toFixed(1)}</div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            {!items.length && (
              <div className="glass rounded-3xl p-12 text-center text-gray-400">
                <div className="text-5xl mb-3">🔍</div>
                لا نتائج مطابقة — جرّب توسيع الفلاتر
              </div>
            )}
            {data && page < data.pages && (
              <button onClick={loadMore} disabled={moreLoading}
                className="w-full mt-4 py-3.5 rounded-2xl text-white font-extrabold shadow-lg disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                {moreLoading ? '⏳…' : `عرض المزيد (${(data.total - items.length).toLocaleString()} متبقٍ)`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ⚖️ زر المقارنة العائم */}
      {cmpCount > 0 && (
        <Link href={`/compare?ids=${getCompare().map((c) => c.id).join(',')}`}
          className="fixed bottom-24 left-4 z-40 px-4 py-3 rounded-2xl text-white text-sm font-extrabold shadow-2xl anim-pulse-glow"
          style={{ background: 'linear-gradient(135deg, #0d9488, #059669)' }}>
          ⚖️ قارن ({cmpCount})
        </Link>
      )}
    </main>
  );
}

export default function ExplorePage() {
  return <Suspense fallback={<main className="min-h-screen pt-20 px-3"><div className="skeleton h-14 rounded-2xl max-w-6xl mx-auto" /></main>}><ExploreInner /></Suspense>;
}
