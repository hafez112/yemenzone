import type { Metadata } from 'next';
import { SERVER_API as API } from '@/lib/server-api';
import OffersClient from './OffersClient';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yemenzone1.com';

export const metadata: Metadata = {
  title: 'عروض اليوم — أكبر تخفيضات المتاجر اليمنية',
  description: 'كل عروض وتخفيضات متاجر يمن زون في صفحة واحدة تتجدد باستمرار: منتجات مخفّضة بنسب تصل إلى 70% مع أسماء المتاجر ومحافظاتها — وفّر أكثر كل يوم.',
  alternates: { canonical: `${SITE}/offers` },
  openGraph: { title: '🔥 عروض اليوم — يمن زون', description: 'أكبر تخفيضات المتاجر اليمنية في مكان واحد — تتجدد باستمرار', url: `${SITE}/offers`, type: 'website', locale: 'ar_YE' },
  robots: { index: true, follow: true },
};

interface OffersData { items: any[]; stats: { count: number; maxDiscount: number } }

async function getOffers(): Promise<OffersData> {
  try {
    const r = await fetch(`${API}/api/v1/offers`, { next: { revalidate: 60 } });
    if (!r.ok) return { items: [], stats: { count: 0, maxDiscount: 0 } };
    return r.json();
  } catch { return { items: [], stats: { count: 0, maxDiscount: 0 } }; }
}

// 🔥 عروض اليوم — صفحة عامة مفهرسة تتجدد كل دقيقة (ISR) وتجلب الباحثين عن التخفيضات
export default async function OffersPage() {
  const data = await getOffers();

  // 📊 بيانات منظمة ItemList — تؤهل الصفحة للظهور الغني في نتائج البحث
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'عروض اليوم — يمن زون',
    url: `${SITE}/offers`,
    numberOfItems: data.items.length,
    itemListElement: data.items.slice(0, 20).map((p: any, i: number) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'Product', name: p.name, url: `${SITE}/store/${p.store.slug}/product/${p.id}`,
        offers: { '@type': 'Offer', price: Number(p.salePrice), priceCurrency: p.currency || 'YER', availability: 'https://schema.org/InStock' },
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <OffersClient data={data} />
    </>
  );
}
