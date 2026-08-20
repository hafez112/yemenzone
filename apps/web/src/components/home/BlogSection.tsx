import Link from 'next/link';

// 📰 قسم "من المدونة" في الرئيسية — أحدث 3 مقالات (SSR)
// مكوّن خادم نقي: لا حالة ولا خطافات — يستقبل المقالات جاهزة
export default function BlogSection({ posts }: { posts: any[] }) {
  if (!posts?.length) return null;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const img = (p: any) => p.cover ? (p.cover.startsWith('http') ? p.cover : apiBase + p.cover) : '';

  return (
    <section className="max-w-5xl mx-auto px-3 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-black">📰 من المدونة</h2>
        <Link href="/blog" className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
          كل المقالات ←
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`}
            className="card card-hover !mb-0 !p-0 overflow-hidden block">
            {img(p) ? (
              <img src={img(p)} alt={p.title} loading="lazy" decoding="async" className="w-full aspect-video object-cover" />
            ) : (
              <div className="w-full aspect-video skeleton flex items-center justify-center text-4xl">📰</div>
            )}
            <div className="p-3">
              {p.category && (
                <span className="badge !m-0 mb-1" style={{ background: '#eef2ff', color: '#3730a3' }}>🏷️ {p.category}</span>
              )}
              <h3 className="font-black text-sm line-clamp-2">{p.title}</h3>
              {p.excerpt && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.excerpt}</p>}
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-2">
                {p.publishedAt && <span>📅 {new Date(p.publishedAt).toLocaleDateString('ar-YE')}</span>}
                {p.views > 0 && <span>👁️ {p.views}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
