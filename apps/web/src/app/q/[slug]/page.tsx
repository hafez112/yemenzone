import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SERVER_API as API } from '@/lib/server-api';
import QsActions from '@/components/tools/QsActions';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yemenzone1.com';

interface Qs {
  slug: string; name: string; desc?: string; price: string | number; currency: string;
  images: string[]; whatsapp: string; phone?: string; governorate?: string; views: number;
}

async function getItem(slug: string): Promise<Qs | null> {
  try {
    const r = await fetch(`${API}/api/v1/tools/quick-sell/${slug}`, { next: { revalidate: 30 } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

const curLabel = (c: string) => (c === 'SAR' ? 'ر.س' : c === 'USD' ? '$' : 'ر.ي');

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) return {};
  const price = `${Number(item.price).toLocaleString()} ${curLabel(item.currency)}`;
  const desc = (item.desc || `${item.name} بسعر ${price}${item.governorate ? ` — ${item.governorate}` : ''} — اطلب الآن واتساب`).slice(0, 160);
  const img = item.images?.[0] ? `${SITE}${item.images[0]}` : undefined;
  return {
    title: `${item.name} — ${price}`,
    description: desc,
    alternates: { canonical: `${SITE}/q/${slug}` },
    openGraph: {
      title: `${item.name} — ${price}`, description: desc, url: `${SITE}/q/${slug}`,
      type: 'website', locale: 'ar_YE', ...(img ? { images: [img] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

// 🛍️ صفحة «بع برابط واحد» — مستقلة تماماً (بلا شريط علوي أو سفلي) بتصميم يبيع
export default async function QuickSellPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) notFound();

  const price = `${Number(item.price).toLocaleString()} ${curLabel(item.currency)}`;
  const waNum = item.whatsapp.replace(/[^0-9]/g, '');
  const waIntl = waNum.startsWith('967') ? waNum : '967' + waNum.replace(/^0/, '');
  const waMsg = encodeURIComponent(`السلام عليكم 🌹\nأريد طلب: ${item.name}\nالسعر: ${price}\n${SITE}/q/${item.slug}`);
  const images = Array.isArray(item.images) ? item.images : [];

  // 📊 بيانات منظمة Product — تظهر في جوجل بالسعر
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    description: item.desc || item.name,
    url: `${SITE}/q/${item.slug}`,
    ...(images.length ? { image: images.map((p) => `${SITE}${p}`) } : {}),
    offers: {
      '@type': 'Offer',
      price: Number(item.price),
      priceCurrency: item.currency,
      availability: 'https://schema.org/InStock',
      url: `${SITE}/q/${item.slug}`,
    },
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden" dir="rtl"
      style={{ background: 'linear-gradient(160deg, #06121a 0%, #0a1f1a 45%, #142a12 100%)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 🌌 خلفية حية */}
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full opacity-25 anim-blob" style={{ background: 'linear-gradient(135deg,#10B981,#14B8A6)' }} />
      <div className="absolute top-1/2 -left-28 w-80 h-80 rounded-full opacity-20 anim-blob" style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', animationDelay: '-4s' }} />
      <div className="absolute inset-0 bg-grid opacity-[.06]" />

      <main className="relative max-w-md mx-auto px-5 pt-10 pb-10">
        {/* 🖼️ معرض الصور */}
        {images.length > 0 ? (
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-5">
            <img src={`${API}${images[0]}`} alt={item.name} className="w-full aspect-square object-cover" />
            {images.length > 1 && (
              <div className="flex gap-2 p-2 bg-black/30 overflow-x-auto">
                {images.map((im, i) => (
                  <img key={im} src={`${API}${im}`} alt={`${item.name} ${i + 1}`} loading="lazy" decoding="async"
                    className={`w-16 h-16 rounded-xl object-cover shrink-0 border ${i === 0 ? 'border-emerald-400' : 'border-white/15'}`} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-24 h-24 mx-auto rounded-[1.8rem] grid place-items-center text-5xl shadow-2xl mb-5 rotate-3"
            style={{ background: 'linear-gradient(135deg,#10B981,#0D9488)' }}>🛍️</div>
        )}

        <div className="text-center">
          <h1 className="text-2xl font-black leading-tight mb-2">{item.name}</h1>
          {item.governorate && (
            <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70 mb-3">📍 {item.governorate}</span>
          )}
          <div className="text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-l from-emerald-300 to-teal-200">{price}</div>
          {item.desc && <p className="text-white/70 text-sm leading-relaxed mb-5 whitespace-pre-line">{item.desc}</p>}

          {/* 💬 أزرار الطلب */}
          <div className="space-y-3 mb-6">
            <a href={`https://wa.me/${waIntl}?text=${waMsg}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base shadow-xl transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)', boxShadow: '0 12px 40px -8px rgba(34,197,94,.45)' }}>
              💬 اطلب الآن عبر واتساب
            </a>
            {item.phone && (
              <a href={`tel:${item.phone}`}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base shadow-xl transition-transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#059669,#10B981)', boxShadow: '0 12px 40px -8px rgba(16,185,129,.5)' }}>
                📞 اتصل بالبائع — <span dir="ltr">{item.phone}</span>
              </a>
            )}
          </div>

          <QsActions slug={item.slug} name={item.name} />

          <p className="text-[11px] text-white/40 mt-5">👁️ {item.views.toLocaleString()} مشاهدة لهذا المنتج</p>

          {/* 🚀 دعوة البيع — كل زائر بائع محتمل */}
          <div className="mt-6 rounded-2xl border border-emerald-400/20 p-4" style={{ background: 'rgba(16,185,129,.08)' }}>
            <p className="text-sm font-extrabold mb-1">🛍️ عندك منتج تبيعه؟</p>
            <p className="text-[11px] text-white/60 mb-3">أنشئ صفحة مثل هذه في دقيقة واحدة — مجاناً وبدون تسجيل</p>
            <Link href="/tools/quick-sell"
              className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 text-gray-900 font-extrabold text-xs shadow-lg">
              🔗 بع برابط واحد — مجاناً
            </Link>
          </div>

          {/* ⚡ ختم المنصة */}
          <a href={SITE} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full text-xs font-extrabold text-white/80 border border-white/15 bg-white/5 backdrop-blur hover:bg-white/15 hover:text-white transition-all">
            ⚡ صُممت بمنصة يمن زون
          </a>
        </div>
      </main>
    </div>
  );
}
