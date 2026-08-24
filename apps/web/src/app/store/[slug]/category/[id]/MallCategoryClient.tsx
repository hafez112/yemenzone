'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import MallProductCard from '@/components/mall/MallProductCard';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const PER_PAGE = 24;

// 🗂️ صفحة صنف المول: بياناته + شريط فروعه الفرعية + منتجاته مرقّمة
export default function MallCategoryClient({ store, primary, categoryId }: any) {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [sub, setSub] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/v1/storefront/${store.slug}/mall/category/${categoryId}?page=${page}${sub ? `&sub=${sub}` : ''}`)
      .then(r => r.json())
      .then(d => {
        if (d?.message) { setNotFound(true); } else { setData(d); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [store.slug, categoryId, page, sub]);

  const totalPages = data ? Math.max(1, Math.ceil((data.total || 0) / PER_PAGE)) : 1;
  const cat = data?.category;

  return (
    <main className="min-h-screen pb-24 pt-20" style={{ background: `linear-gradient(180deg, ${primary}08, transparent 40%), #faf9ff` }}>
      <div className="max-w-6xl mx-auto px-3">
        {/* مسار التنقل */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mb-3 flex-wrap">
          <Link href={`/store/${store.slug}`} className="hover:underline" style={{ color: primary }}>{store.type?.kind === 'malls' ? '🏬' : store.type?.kind === 'restaurants' ? '🍽️' : '🏪'} {store.name}</Link>
          <span>›</span>
          <Link href={`/store/${store.slug}/categories`} className="hover:underline">الأصناف</Link>
          {cat?.parent && (
            <>
              <span>›</span>
              <Link href={`/store/${store.slug}/category/${cat.parent.id}`} className="hover:underline">{cat.parent.name}</Link>
            </>
          )}
          {cat && <><span>›</span><span className="text-gray-600">{cat.name}</span></>}
        </div>

        {notFound ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-3">🗂️</div>
            <p className="font-black text-lg">الصنف غير موجود</p>
            <Link href={`/store/${store.slug}/categories`} className="inline-block mt-4 px-6 py-3 rounded-2xl text-white font-extrabold text-sm shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
              🗂️ كل الأصناف
            </Link>
          </div>
        ) : (
          <>
            {/* الترويسة */}
            <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
              style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
              <div className="anim-blob absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
              <div className="relative flex items-center gap-3 min-w-0">
                <span className="text-4xl">🗂️</span>
                <div className="min-w-0">
                  <h1 className="f-2xl font-black">{cat?.name || '...'}</h1>
                  {data && (
                    <p className="f-xs text-white/85 font-bold">
                      {data.total === 0 ? 'لا منتجات هنا بعد' : data.total === 1 ? 'منتج واحد' : data.total === 2 ? 'منتجان' : data.total <= 10 ? `${data.total} منتجات` : `${data.total} منتجاً`}
                      {cat?.children?.length > 0 && ` • ${cat.children.length} أصناف فرعية`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* شريط الأصناف الفرعية */}
            {cat?.children?.length > 0 && (
              <div className="store-rail flex gap-2 overflow-x-auto py-3 edge-fade">
                <button onClick={() => { setSub(''); setPage(1); }}
                  className={`theme-chip shrink-0 ${!sub ? 'on' : ''}`}>
                  الكل
                </button>
                {cat.children.map((ch: any) => (
                  <button key={ch.id} onClick={() => { setSub(ch.id); setPage(1); }}
                    className={`theme-chip shrink-0 ${sub === ch.id ? 'on' : ''}`}>
                    {ch.name} ({ch.productsCount})
                  </button>
                ))}
              </div>
            )}

            {/* المنتجات */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 mt-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="skeleton rounded-3xl h-56 sm:h-64" />
                ))}
              </div>
            ) : !data?.items?.length ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-6xl mb-3">📦</div>
                <p className="font-black text-lg">لا منتجات في هذا الصنف بعد</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 mt-2 stagger">
                  {data.items.map((p: any) => (
                    <MallProductCard key={p.id} p={p} store={store} primary={primary} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                      className="px-4 py-2 rounded-xl font-extrabold text-sm bg-white border border-gray-200 disabled:opacity-40">
                      → السابق
                    </button>
                    <span className="text-sm font-black" style={{ color: primary }}>{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                      className="px-4 py-2 rounded-xl font-extrabold text-sm bg-white border border-gray-200 disabled:opacity-40">
                      التالي ←
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
