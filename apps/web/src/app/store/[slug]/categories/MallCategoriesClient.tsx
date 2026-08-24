'use client';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🗂️ كل أصناف المول — بطاقات رئيسية مع فروعها الفرعية
export default function MallCategoriesClient({ store, primary }: { store: any; primary: string }) {
  const tree: any[] = store.mall?.categoriesTree || [];
  const isMall = store.type?.kind === 'malls'; // 🧬 تسميات حسب النشاط — لا نسمي المتجر مولاً

  return (
    <main className="min-h-screen pb-24 pt-20" style={{ background: `linear-gradient(180deg, ${primary}08, transparent 40%), #faf9ff` }}>
      <div className="max-w-6xl mx-auto px-3">
        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
          <div className="anim-blob absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="text-4xl">🗂️</span>
            <div>
              <h1 className="f-2xl font-black">أصناف {store.name}</h1>
              <p className="f-xs text-white/85 font-bold">{isMall ? 'تصفح المول صنفاً صنفاً — رئيسية وفرعية' : 'تصفح أصناف المتجر — رئيسية وفرعية'}</p>
            </div>
          </div>
        </div>

        {tree.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-3">🗂️</div>
            <p className="font-black text-lg">الأصناف قيد التجهيز</p>
            <Link href={`/store/${store.slug}`} className="inline-block mt-4 px-6 py-3 rounded-2xl text-white font-extrabold text-sm shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
              {isMall ? '🏬 عودة إلى المول' : '🏪 عودة إلى المتجر'}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 mt-4 stagger">
            {tree.map((t: any) => (
              <div key={t.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden card-hover">
                <Link href={`/store/${store.slug}/category/${t.id}`}
                  className="flex items-center gap-3 p-4 transition-all hover:bg-gray-50">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 overflow-hidden"
                    style={t.image
                      ? { background: `url(${API}${t.image}) center/cover` }
                      : { background: `linear-gradient(135deg, ${primary}15, ${primary}30)` }}>
                    {!t.image && '🗂️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black">{t.name}</div>
                    <div className="f-xs text-gray-400 font-bold">
                      {t.productsCount === 0 ? 'قريباً' : t.productsCount === 1 ? 'منتج واحد' : t.productsCount === 2 ? 'منتجان' : t.productsCount <= 10 ? `${t.productsCount} منتجات` : `${t.productsCount} منتجاً`}
                      {t.children?.length > 0 && ` • ${t.children.length} فرعية`}
                    </div>
                  </div>
                  <span className="text-gray-300 text-lg">←</span>
                </Link>
                {t.children?.length > 0 && (
                  <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                    {t.children.map((ch: any) => (
                      <Link key={ch.id} href={`/store/${store.slug}/category/${ch.id}`}
                        className="text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105"
                        style={{ background: `${primary}10`, color: primary }}>
                        {ch.name} ({ch.productsCount})
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
