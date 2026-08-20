import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SERVER_API as API } from '@/lib/server-api';
import BizActions from '@/components/tools/BizActions';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yemenzone1.com';

interface Biz { slug: string; name: string; desc: string; keywords?: string; phone: string; whatsapp: string; website?: string; lat: number; lng: number; views: number }

async function getBiz(slug: string): Promise<Biz | null> {
  try {
    const r = await fetch(`${API}/api/v1/tools/biz/${slug}`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const biz = await getBiz(slug);
  if (!biz) return {};
  return {
    title: `${biz.name} — ${biz.desc.slice(0, 60)}`,
    description: biz.desc.slice(0, 160),
    keywords: biz.keywords ? biz.keywords.split(/[،,]/).map((k) => k.trim()) : [biz.name],
    alternates: { canonical: `${SITE}/biz/${slug}` },
    openGraph: { title: biz.name, description: biz.desc.slice(0, 160), url: `${SITE}/biz/${slug}`, type: 'website', locale: 'ar_YE' },
    robots: { index: true, follow: true },
  };
}

// 🏪 صفحة المحل الرسمية — مستقلة تماماً (بلا شريط علوي أو سفلي) بتصميم فاخر
export default async function BizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const biz = await getBiz(slug);
  if (!biz) notFound();

  const mapsUrl = `https://maps.google.com/?q=${biz.lat},${biz.lng}`;
  const waNum = biz.whatsapp.replace(/[^0-9]/g, '');
  const waIntl = waNum.startsWith('967') ? waNum : '967' + waNum.replace(/^0/, '');
  const keywords = biz.keywords ? biz.keywords.split(/[،,]/).map((k) => k.trim()).filter(Boolean) : [];

  // 📊 بيانات منظمة LocalBusiness — تعرض النشاط في جوجل بالخريطة والاتصال
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: biz.name,
    description: biz.desc,
    url: `${SITE}/biz/${biz.slug}`,
    telephone: biz.phone,
    ...(biz.website ? { sameAs: [biz.website] } : {}),
    geo: { '@type': 'GeoCoordinates', latitude: biz.lat, longitude: biz.lng },
    hasMap: mapsUrl,
    address: { '@type': 'PostalAddress', addressCountry: 'YE' },
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden" dir="rtl"
      style={{ background: 'linear-gradient(160deg, #0f0a1e 0%, #1a0f2e 45%, #2b1a0f 100%)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 🌌 خلفية حية */}
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full opacity-25 anim-blob" style={{ background: 'linear-gradient(135deg,#F97316,#DC2626)' }} />
      <div className="absolute top-1/3 -left-28 w-80 h-80 rounded-full opacity-20 anim-blob" style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', animationDelay: '-4s' }} />
      <div className="absolute inset-0 bg-grid opacity-[.06]" />

      <main className="relative max-w-md mx-auto px-5 pt-14 pb-10 text-center">
        {/* الشعار الحرفي */}
        <div className="w-24 h-24 mx-auto rounded-[1.8rem] grid place-items-center text-5xl font-black shadow-2xl mb-5 rotate-3"
          style={{ background: 'linear-gradient(135deg,#F97316,#DC2626)', boxShadow: '0 20px 60px -10px rgba(249,115,22,.5)' }}>
          {biz.name[0]}
        </div>

        <h1 className="text-3xl font-black leading-tight mb-2">{biz.name}</h1>
        <p className="text-white/70 text-sm leading-relaxed mb-4">{biz.desc}</p>

        {/* الكلمات المفتاحية */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-6">
            {keywords.slice(0, 8).map((k) => (
              <span key={k} className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70">{k}</span>
            ))}
          </div>
        )}

        {/* أزرار التواصل */}
        <div className="space-y-3 mb-6">
          <a href={`tel:${biz.phone}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base shadow-xl transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#059669,#10B981)', boxShadow: '0 12px 40px -8px rgba(16,185,129,.5)' }}>
            📞 اتصل الآن — <span dir="ltr">{biz.phone}</span>
          </a>
          <a href={`https://wa.me/${waIntl}?text=${encodeURIComponent(`السلام عليكم 🌹 وصلتكم من صفحة ${biz.name}`)}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base shadow-xl transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)', boxShadow: '0 12px 40px -8px rgba(34,197,94,.45)' }}>
            💬 راسلنا واتساب
          </a>
          <a href={mapsUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base bg-white/10 border border-white/15 backdrop-blur transition-all hover:bg-white/20 hover:scale-[1.02]">
            📍 موقعنا على خرائط جوجل
          </a>
          {biz.website && (
            <a href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base bg-white/10 border border-white/15 backdrop-blur transition-all hover:bg-white/20 hover:scale-[1.02]">
              🌐 تابعنا على الإنترنت
            </a>
          )}
        </div>

        {/* مشاركة */}
        <BizActions slug={biz.slug} name={biz.name} />

        <p className="text-[11px] text-white/40 mt-6">👁️ {biz.views.toLocaleString()} زيارة لهذه الصفحة</p>

        {/* ⚡ ختم المنصة */}
        <a href={SITE} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-full text-xs font-extrabold text-white/80 border border-white/15 bg-white/5 backdrop-blur hover:bg-white/15 hover:text-white transition-all">
          ⚡ صُممت بمنصة يمن زون — افتح صفحتك مجاناً
        </a>
      </main>
    </div>
  );
}
