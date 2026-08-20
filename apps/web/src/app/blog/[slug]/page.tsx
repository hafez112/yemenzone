import type { Metadata } from "next";
import Link from "next/link";
import { SERVER_API as API } from "@/lib/server-api";
import VideoPlayer from "@/components/VideoPlayer";

const stripHtml = (html?: string) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function getPost(slug: string) {
  try {
    const res = await fetch(`${API}/api/v1/platform/blog/${encodeURIComponent(slug)}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    const p = await res.json();
    return p && p.id ? p : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return { title: "المقال غير موجود — يمن زون" };
  const desc = p.metaDesc || stripHtml(p.excerpt || p.content).slice(0, 160);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const cover = p.cover ? (p.cover.startsWith("http") ? p.cover : apiBase + p.cover) : undefined;
  return {
    title: `${p.title} — مدونة يمن زون`,
    description: desc,
    keywords: p.tags ? p.tags.split("،").join(",").split(",").map((t: string) => t.trim()).filter(Boolean) : undefined,
    openGraph: {
      title: p.title,
      description: desc,
      type: "article",
      publishedTime: p.publishedAt,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPost(slug);

  if (!p) {
    return (
      <div className="page text-center py-20">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-black mb-2">المقال غير موجود</h1>
        <p className="text-gray-500 mb-4">ربما حُذف أو لم يُنشر بعد</p>
        <Link href="/blog" className="btn inline-block">← كل المقالات</Link>
      </div>
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const cover = p.cover ? (p.cover.startsWith("http") ? p.cover : apiBase + p.cover) : "";
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <div className="page">
      <article className="max-w-3xl mx-auto">
        <Link href="/blog" className="text-sm text-gray-400 inline-block mb-3">← كل المقالات</Link>

        <div className="card overflow-hidden">
          {cover && <img src={cover} alt={p.title} className="w-full aspect-video object-cover rounded-2xl mb-4" />}

          <div className="flex items-center gap-2 flex-wrap mb-2">
            {p.category && <span className="badge !m-0" style={{ background: "#eef2ff", color: "#3730a3" }}>🏷️ {p.category}</span>}
            {p.publishedAt && (
              <span className="text-xs text-gray-400">
                📅 {new Date(p.publishedAt).toLocaleDateString("ar-YE", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
            {p.views > 0 && <span className="text-xs text-gray-400">👁️ {p.views} مشاهدة</span>}
          </div>

          <h1 className="text-2xl md:text-3xl font-black mb-4">{p.title}</h1>

          {/* الفيديو التوضيحي */}
          {p.videoUrl && (
            <div className="mb-5">
              <VideoPlayer url={p.videoUrl} title={p.title} />
            </div>
          )}

          {/* المحتوى الغني — مُطهّر في الخادم */}
          {p.content && (
            <div className="prose-custom leading-loose" dangerouslySetInnerHTML={{ __html: p.content }} />
          )}

          {/* الوسوم */}
          {p.tags && (
            <div className="flex gap-1.5 flex-wrap mt-5 pt-4 border-t border-gray-100">
              {p.tags.split(/[،,]/).map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                <span key={t} className="badge !m-0" style={{ background: "#f3f4f6", color: "#4b5563" }}>#{t}</span>
              ))}
            </div>
          )}

          {/* المشاركة */}
          <div className="glass-dark rounded-2xl p-4 mt-5 text-center text-white">
            <b className="text-sm">أعجبك المقال؟ شاركه 📤</b>
            <div className="flex justify-center gap-2 mt-2 flex-wrap">
              <a className="btn small" style={{ background: "#25D366" }}
                href={`https://wa.me/?text=${encodeURIComponent(p.title + "\n" + SITE + "/blog/" + p.slug)}`}
                target="_blank" rel="noopener">واتساب</a>
              <a className="btn small" style={{ background: "#0088cc" }}
                href={`https://t.me/share/url?url=${encodeURIComponent(SITE + "/blog/" + p.slug)}&text=${encodeURIComponent(p.title)}`}
                target="_blank" rel="noopener">تيليجرام</a>
              <a className="btn small" style={{ background: "#1877F2" }}
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE + "/blog/" + p.slug)}`}
                target="_blank" rel="noopener">فيسبوك</a>
            </div>
          </div>
        </div>

        {/* مقالات ذات صلة */}
        {p.related?.length > 0 && (
          <div className="mt-5">
            <h2 className="font-black text-lg mb-2">📚 مقالات ذات صلة</h2>
            <div className="grid md:grid-cols-3 gap-2">
              {p.related.map((r: any) => {
                const rc = r.cover ? (r.cover.startsWith("http") ? r.cover : apiBase + r.cover) : "";
                return (
                  <Link key={r.slug} href={`/blog/${r.slug}`} className="card card-hover !mb-0 !p-0 overflow-hidden block">
                    {rc ? (
                      <img src={rc} alt={r.title} loading="lazy" decoding="async" className="w-full aspect-video object-cover" />
                    ) : (
                      <div className="w-full aspect-video skeleton flex items-center justify-center text-3xl">📰</div>
                    )}
                    <div className="p-3">
                      <b className="text-sm block line-clamp-2">{r.title}</b>
                      {r.publishedAt && (
                        <span className="text-[10px] text-gray-400">📅 {new Date(r.publishedAt).toLocaleDateString("ar-YE")}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
