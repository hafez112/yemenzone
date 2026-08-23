import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';

import { SERVER_API as API } from '@/lib/server-api';
import { cache } from 'react';

// ⚡ React cache() — generateMetadata والصفحة يتشاركان جلباً واحداً لكل طلب
const getData = cache(async (slug: string, id: string) => {
  try {
    const res = await fetch(`${API}/api/v1/storefront/${slug}/product/${id}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const data = await getData(slug, id);
  if (!data) return {};
  const p = data.product;
  const desc = p.metaDesc || p.shortDesc || (p.description || `اشترِ ${p.name} من ${data.store.name}`).replace(/<[^>]*>/g, '').slice(0, 160);
  const PUB_API = process.env.NEXT_PUBLIC_API_URL || '';
  const imgs = (Array.isArray(p.images) ? p.images : []).filter(Boolean).map((u: string) => (u.startsWith('http') ? u : `${PUB_API}${u}`));
  return {
    title: p.metaTitle || `${p.name} — ${data.store.name}`,
    description: desc,
    ...(p.keywords ? { keywords: p.keywords } : {}),
    openGraph: { title: p.metaTitle || p.name, description: desc, ...(imgs.length ? { images: [{ url: imgs[0] }] } : {}) },
  };
}

// 🎯 بيانات منظمة للمنتج — نتائج غنية في جوجل (سعر + توفر + صور)
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const PUB_API = process.env.NEXT_PUBLIC_API_URL || '';
const absImg = (u: string) => (u.startsWith('http') ? u : `${PUB_API}${u}`);

function productJsonLd(slug: string, id: string, data: any) {
  const p = data.product;
  const store = data.store;
  const images = (Array.isArray(p.images) ? p.images : []).filter(Boolean).map(absImg);
  const price = Number(p.salePrice ?? p.price ?? 0);
  const desc = (p.shortDesc || (p.description || '').replace(/<[^>]*>/g, '')).trim().slice(0, 300);
  const brand = p.specs && typeof p.specs === 'object' ? (p.specs as any).brand : null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    ...(desc ? { description: desc } : {}),
    ...(images.length ? { image: images } : {}),
    ...(p.sku ? { sku: p.sku } : {}),
    ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
    ...(p.category?.name ? { category: p.category.name } : {}),
    inLanguage: 'ar',
    offers: {
      '@type': 'Offer',
      url: `${SITE}/store/${slug}/product/${id}`,
      priceCurrency: p.currency || 'YER',
      price: price.toFixed(2),
      availability: (p.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: store.name },
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const data = await getData(slug, id);
  if (!data) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(slug, id, data)) }} />
      <ProductClient {...data} />
    </>
  );
}
