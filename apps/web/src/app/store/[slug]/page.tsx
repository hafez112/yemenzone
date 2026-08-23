import { notFound } from 'next/navigation';
import StoreClient from './StoreClient';

import { getStorefront as getStore } from '@/lib/storefront';

// SSR — ممتاز للـ SEO: بيانات المتجر من الخادم

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return {};
  return {
    title: store.metaTitle || `${store.name} — يمن زون`,
    description: store.metaDesc || store.description,
    // 📱 مانيفست تطبيق المتجر — يحوّل المتجر لتطبيق باسمه وشعاره (يُفعَّل للزائر من البانر)
    manifest: `/store-manifest/${slug}`,
    openGraph: {
      title: store.metaTitle || store.name,
      description: store.metaDesc || store.description,
      images: store.logo ? [store.logo] : undefined,
    },
  };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  // بيانات منظمة JSON-LD — تظهر المتجر بنتائج بحث غنية
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description: store.metaDesc || store.description,
    image: store.logo,
    telephone: store.phone,
    address: store.governorate ? {
      '@type': 'PostalAddress',
      addressRegion: store.governorate,
      addressLocality: store.city,
      addressCountry: 'YE',
    } : undefined,
    geo: store.lat && store.lng ? { '@type': 'GeoCoordinates', latitude: store.lat, longitude: store.lng } : undefined,
    aggregateRating: store.ratingCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: store.ratingAvg,
      reviewCount: store.ratingCount,
    } : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StoreClient store={store} />
    </>
  );
}
