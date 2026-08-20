import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SERVER_API as API } from '@/lib/server-api';
import UActions from '@/components/tools/UActions';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yemenzone1.com';

interface UsedItem {
  slug: string; title: string; desc?: string; price: string | number; currency: string;
  category: string; condition: string; images: string[]; whatsapp: string;
  governorate?: string; views: number; createdAt: string;
  similar?: { slug: string; title: string; price: string | number; currency: string; images: string[]; governorate?: string }[];
}

async function getItem(slug: string): Promise<UsedItem | null> {
  try {
    const r = await fetch(`${API}/api/v1/tools/used/${slug}`, { next: { revalidate: 30 } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

const curLabel = (c: string) => (c === 'SAR' ? 'ر.س' : c === 'USD' ? '$' : 'ر.ي');
const CATS: Record<string, string> = { cars: '🚗 سيارات ومركبات', phones: '📱 جوالات وأجهزة', electronics: '💻 إلكترونيات', realestate: '🏠 عقارات', furniture: '🛋️ أثاث ومنزل', clothes: '👕 ملابس وأزياء', other: '📦 أخرى' };
const CONDS: Record<string, string> = { 'like-new': '✨ كالجديد', 'used-good': '👍 مستعمل جيد', 'used-fair': '🔧 مستعمل مقبول' };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) return {};
  const price = `${Number(item.price).toLocaleString()} ${curLabel(item.currency)}`;
  const desc = (item.desc || `${item.title} — ${CONDS[item.condition] || ''} بسعر ${price}${item.governorate ? ` في ${item.governorate}` : ''} — تواصل مباشرة مع البائع`).slice(0, 160);
  const img = item.images?.[0] ? `${SITE}${item.images[0]}` : undefined;
  return {
    title: `${item.title} — ${price} | سوق المستعمل`,
    description: desc,
    alternates: { canonical: `${SITE}/u/${slug}` },
    openGraph: {
      title: `${item.title} — ${price}`, description: desc, url: `${SITE}/u/${slug}`,
      type: 'website', locale: 'ar_YE', ...(img ? { images: [img] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

// ♻️ صفحة إعلان سوق المستعمل — مستقلة تماماً (بلا شريط علوي أو سفلي) بتصميم يبيع
export default async function UsedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) notFound();

  const price = `${Number(item.price).toLocaleString()} ${curLabel(item.currency)}`;
  const waNum = item.whatsapp.replace(/[^0-9]/g, '');
  const waIntl = waNum.startsWith('967') ? waNum : '967' + waNum.replace(/^0/, '');
  const waMsg = encodeURIComponent(`السلام عليكم 🌹\nشاهدت إعلانك في سوق المستعمل: ${item.title}\nالسعر المعلن: ${price}\n${SITE}/u/${item.slug}`);
  const images = Array.isArray(item.images) ? item.images : [];
  const similar = Array.isArray(item.similar) ? item.similar : [];

  // 📊 بيانات منظمة Product — تظهر في جوجل بالسعر والحالة
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.title,
    description: item.desc || `${item.title} — ${CONDS[item.condition] || 'مستعمل'}`,
    url: `${SITE}/u/${item.slug}`,
    ...(images.length ? { image: images.map((p) => `${SITE}${p}`) } : {}),
    offers: {
      '@type': 'Offer',
      price: Number(item.price),
      priceCurrency: item.currency,
      itemCondition: item.condition === 'like-new' ? 'https://schema.org/LikeNewCondition' : 'https://schema.org/UsedCondition',
      availability: 'https://schema.org/InStock',
      url: `${SITE}/u/${item.slug}`,
    },
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden" dir="rtl"
      style={{ background: 'linear-gradient(160deg, #0a1408 0%, #0c1f12 45%, #12260f 100%)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 🌌 خلفية حية */}
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full opacity-25 anim-blob" style={{ background: 'linear-gradient(135deg,#84CC16,#10B981)' }} />
      <div className="absolute top-1/2 -left-28 w-80 h-80 rounded-full opacity-20 anim-blob" style={{ background: 'linear-gradient(135deg,#059669,#14B8A6)', animationDelay: '-4s' }} />
      <div className="absolute inset-0 bg-grid opacity-[.06]" />

      <main className="relative max-w-md mx-auto px-5 pt-10 pb-10">
        {/* 🖼️ معرض الصور */}
        {images.length > 0 ? (
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-5">
            <img src={`${API}${images[0]}`} alt={item.title} className="w-full aspect-square object-cover" />
            {images.length > 1 && (
              <div className="flex gap-2 p-2 bg-black/30 overflow-x-auto">
                {images.map((im, i) => (
                  <img key={im} src={`${API}${im}`} alt={`${item.title} ${i + 1}`} loading="lazy" decoding="async"
                    className={`w-16 h-16 rounded-xl object-cover shrink-0 border ${i === 0 ? 'border-lime-400' : 'border-white/15'}`} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-24 h-24 mx-auto rounded-[1.8rem] grid place-items-center text-5xl shadow-2xl mb-5 rotate-3"
            style={{ background: 'linear-gradient(135deg,#84CC16,#059669)' }}>♻️</div>
        )}

        <div className="text-center">
          {/* شارات التصنيف والحالة */}
          <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-lime-400/15 border border-lime-400/30 text-lime-200">{CATS[item.category] || '📦 أخرى'}</span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70">{CONDS[item.condition] || '👍 مستعمل'}</span>
            {item.governorate && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70">📍 {item.governorate}</span>
            )}
          </div>

          <h1 className="text-2xl font-black leading-tight mb-2">{item.title}</h1>
          <div className="text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-l from-lime-300 to-emerald-200">{price}</div>
          {item.desc && <p className="text-white/70 text-sm leading-relaxed mb-5 whitespace-pre-line">{item.desc}</p>}

          {/* 💬 التواصل مع البائع */}
          <div className="space-y-3 mb-6">
            <a href={`https://wa.me/${waIntl}?text=${waMsg}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base shadow-xl transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)', boxShadow: '0 12px 40px -8px rgba(34,197,94,.45)' }}>
              💬 راسل البائع واتساب
            </a>
          </div>

          <UActions slug={item.slug} title={item.title} />

          <p className="text-[11px] text-white/40 mt-5">👁️ {item.views.toLocaleString()} مشاهدة لهذا الإعلان</p>

          {/* ⚠️ تنبيه أمان */}
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3.5 text-right">
            <p className="text-[11px] text-amber-200/80 leading-relaxed">🛡️ <b>نصيحة أمان:</b> قابل البائع في مكان عام وعاين السلعة قبل الدفع — البيع يتم بين الطرفين مباشرة بدون وسيط.</p>
          </div>

          {/* 🚀 دعوة البيع — كل زائر بائع محتمل */}
          <div className="mt-5 rounded-2xl border border-lime-400/20 p-4" style={{ background: 'rgba(132,204,22,.08)' }}>
            <p className="text-sm font-extrabold mb-1">♻️ عندك مستعمل تبيعه؟</p>
            <p className="text-[11px] text-white/60 mb-3">انشر إعلانك بصوره في دقيقة — مجاناً وبدون عمولة</p>
            <Link href="/tools/used-market"
              className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-l from-lime-500 to-emerald-500 text-gray-900 font-extrabold text-xs shadow-lg">
              📢 انشر إعلانك مجاناً
            </Link>
          </div>
        </div>

        {/* 🔄 إعلانات مشابهة */}
        {similar.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-extrabold mb-3 text-white/80">🔄 إعلانات مشابهة في السوق</h2>
            <div className="grid grid-cols-2 gap-3">
              {similar.map((s) => (
                <Link key={s.slug} href={`/u/${s.slug}`}
                  className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-lime-400/40 transition-all">
                  <div className="aspect-square bg-black/30">
                    {s.images?.[0]
                      ? <img src={`${API}${s.images[0]}`} alt={s.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      : <div className="w-full h-full grid place-items-center text-3xl opacity-40">♻️</div>}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold truncate mb-1">{s.title}</p>
                    <p className="text-xs font-black text-lime-300">{Number(s.price).toLocaleString()} {curLabel(s.currency)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          {/* ⚡ ختم المنصة */}
          <a href={SITE} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-full text-xs font-extrabold text-white/80 border border-white/15 bg-white/5 backdrop-blur hover:bg-white/15 hover:text-white transition-all">
            ⚡ سوق المستعمل — منصة يمن زون
          </a>
        </div>
      </main>
    </div>
  );
}
