import type { Metadata } from "next";
import Link from "next/link";
import { SERVER_API as API } from "@/lib/server-api";
import VideoPlayer from "@/components/VideoPlayer";

const stripHtml = (html?: string) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function getService(id: string) {
  try {
    const res = await fetch(`${API}/api/v1/platform/services/${id}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    const s = await res.json();
    return s && s.id ? s : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await getService(id);
  const desc = stripHtml(s?.description).slice(0, 160);
  return {
    title: s ? `${s.title} — خدمات يمن زون` : "خدمة غير موجودة — يمن زون",
    description: desc || "خدمة احترافية من فريق منصة يمن زون",
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getService(id);

  if (!s) {
    return (
      <div className="page text-center py-20">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-black mb-2">الخدمة غير موجودة</h1>
        <p className="text-gray-500 mb-4">ربما عُطّلت أو حُذفت</p>
        <Link href="/services" className="btn inline-block">← كل الخدمات</Link>
      </div>
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const img = s.image ? (s.image.startsWith("http") ? s.image : apiBase + s.image) : "";
  const looksHtml = /<[a-z][\s\S]*>/i.test(s.description || "");

  return (
    <div className="page">
      <div className="max-w-3xl mx-auto">
        <Link href="/services" className="text-sm text-gray-400 inline-block mb-3">← كل خدمات المنصة</Link>

        {/* الغلاف */}
        <div className="card overflow-hidden">
          {img ? (
            <img src={img} alt={s.title} className="w-full aspect-video object-cover rounded-2xl mb-4" />
          ) : (
            <div className="w-full aspect-video rounded-2xl mb-4 skeleton flex items-center justify-center text-6xl">🧩</div>
          )}

          <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
            <h1 className="text-2xl md:text-3xl font-black">{s.title}</h1>
            <div className="text-left">
              <b className="text-2xl" style={{ color: "var(--primary)" }}>{Number(s.price).toLocaleString("en")}</b>
              <span className="text-sm text-gray-400"> {s.currency}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <span>🧩 خدمة رسمية من منصة يمن زون</span>
            {s.views > 0 && <span>👁️ {s.views} مشاهدة</span>}
          </div>

          {/* الفيديو التوضيحي */}
          {s.videoUrl && (
            <div className="mb-5">
              <h2 className="font-black mb-2">🎬 فيديو توضيحي</h2>
              <VideoPlayer url={s.videoUrl} title={s.title} />
            </div>
          )}

          {/* الوصف الغني */}
          {s.description && (
            <div className="mb-5">
              <h2 className="font-black mb-2">📝 تفاصيل الخدمة</h2>
              {looksHtml ? (
                <div className="prose-custom leading-loose" dangerouslySetInnerHTML={{ __html: s.description }} />
              ) : (
                <p className="leading-loose text-gray-600 whitespace-pre-line">{s.description}</p>
              )}
            </div>
          )}

          {/* دعوة الطلب */}
          <div className="glass-dark rounded-2xl p-5 text-center text-white relative overflow-hidden">
            <div className="absolute -top-8 -left-8 w-28 h-28 anim-blob opacity-30" style={{ background: "var(--primary)" }} />
            <h3 className="font-black text-lg mb-1 relative">جاهز تطلب هذه الخدمة؟ 🚀</h3>
            <p className="text-gray-300 text-sm mb-3 relative">ادفع عبر بوابات الدفع المحلية وسيتواصل معك فريقنا خلال 24 ساعة</p>
            <Link href={`/services?order=${s.id}`}
              className="btn-primary inline-block text-white font-extrabold px-8 py-3 rounded-full relative anim-pulse-glow">
              اطلبها الآن — {Number(s.price).toLocaleString("en")} {s.currency}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
