import type { Metadata } from "next";
import Link from "next/link";
import { SERVER_API as API } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "المدونة — مقالات ونصائح التجارة الإلكترونية | يمن زون",
  description: "مدونة يمن زون: مقالات ونصائح عملية في التجارة الإلكترونية والتسويق وإدارة المتاجر في اليمن.",
};

export const revalidate = 300;

const stripHtml = (html?: string) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function getPosts() {
  try {
    const res = await fetch(`${API}/api/v1/platform/blog`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

export default async function BlogPage() {
  const posts: any[] = await getPosts();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const img = (p: any) => p.cover ? (p.cover.startsWith("http") ? p.cover : apiBase + p.cover) : "";
  const [featured, ...rest] = posts;

  return (
    <div className="page">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-black mb-1">📰 مدونة يمن زون</h1>
        <p className="text-sm text-gray-500 mb-5">مقالات ونصائح عملية لتطوير تجارتك الإلكترونية</p>

        {posts.length === 0 && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-3">📰</div>
            <b>قريباً — مقالات مفيدة لتجار اليمن</b>
          </div>
        )}

        {/* المقال البارز */}
        {featured && (
          <Link href={`/blog/${featured.slug}`} className="card card-hover !p-0 overflow-hidden block mb-5">
            {img(featured) ? (
              <img src={img(featured)} alt={featured.title} className="w-full aspect-[2/1] object-cover" />
            ) : (
              <div className="w-full aspect-[2/1] skeleton flex items-center justify-center text-6xl">📰</div>
            )}
            <div className="p-4">
              {featured.category && (
                <span className="badge !m-0 mb-2" style={{ background: "#eef2ff", color: "#3730a3" }}>🏷️ {featured.category}</span>
              )}
              <h2 className="text-xl md:text-2xl font-black">{featured.title}</h2>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {featured.excerpt || ""}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-2">
                {featured.publishedAt && (
                  <span>📅 {new Date(featured.publishedAt).toLocaleDateString("ar-YE", { day: "numeric", month: "long", year: "numeric" })}</span>
                )}
                {featured.views > 0 && <span>👁️ {featured.views}</span>}
              </div>
            </div>
          </Link>
        )}

        {/* بقية المقالات */}
        <div className="grid md:grid-cols-2 gap-3">
          {rest.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="card card-hover !mb-0 !p-0 overflow-hidden block">
              {img(p) ? (
                <img src={img(p)} alt={p.title} loading="lazy" decoding="async" className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video skeleton flex items-center justify-center text-4xl">📰</div>
              )}
              <div className="p-3">
                {p.category && (
                  <span className="badge !m-0 mb-1" style={{ background: "#eef2ff", color: "#3730a3" }}>🏷️ {p.category}</span>
                )}
                <h3 className="font-black text-sm">{p.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.excerpt || ""}</p>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-2">
                  {p.publishedAt && <span>📅 {new Date(p.publishedAt).toLocaleDateString("ar-YE")}</span>}
                  {p.views > 0 && <span>👁️ {p.views}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
