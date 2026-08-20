'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import MallProductCard from '@/components/mall/MallProductCard';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const PER_PAGE = 24;

// 🏬 صفحة قسم من أقسام المول — جلب حقيقي مرقّم من الـ API
export default function MallSectionClient({ store, primary, section, meta }: any) {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/v1/storefront/${store.slug}/mall/section/${section}?page=${page}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [store.slug, section, page]);

  const totalPages = data ? Math.max(1, Math.ceil((data.total || 0) / PER_PAGE)) : 1;

  return (
    <main className="min-h-screen pb-24 pt-20" style={{ background: `linear-gradient(180deg, ${primary}08, transparent 40%), #faf9ff` }}>
      <div className="max-w-6xl mx-auto px-3">
        {/* الترويسة */}
        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
          <div className="anim-blob absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="text-4xl">{meta.icon}</span>
            <div>
              <h1 className="f-2xl font-black">{meta.title}</h1>
              <p className="f-xs text-white/85 font-bold">{meta.sub} — {store.name}</p>
            </div>
          </div>
          {data && (
            <p className="relative f-xs text-white/80 font-bold mt-2">
              {data.total === 0 ? 'لا منتجات هنا بعد' : data.total === 1 ? 'منتج واحد' : data.total === 2 ? 'منتجان' : data.total <= 10 ? `${data.total} منتجات` : `${data.total} منتجاً`}
            </p>
          )}
        </div>

        {/* المنتجات */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton rounded-3xl h-64" />
            ))}
          </div>
        ) : !data?.items?.length ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-3">{meta.icon}</div>
            <p className="font-black text-lg">لا منتجات في هذا القسم بعد</p>
            <Link href={`/store/${store.slug}`} className="inline-block mt-4 px-6 py-3 rounded-2xl text-white font-extrabold text-sm shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
              🏬 عودة إلى المول
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4 stagger">
              {data.items.map((p: any) => (
                <MallProductCard key={p.id} p={p} store={store} primary={primary} />
              ))}
            </div>

            {/* ترقيم الصفحات */}
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
      </div>
    </main>
  );
}
