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
  return {
    title: p.metaTitle || `${p.name} — ${data.store.name}`,
    description: p.metaDesc || p.shortDesc || (p.description || `اشترِ ${p.name} من ${data.store.name}`).replace(/<[^>]*>/g, '').slice(0, 160),
    ...(p.keywords ? { keywords: p.keywords } : {}),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const data = await getData(slug, id);
  if (!data) notFound();
  return <ProductClient {...data} />;
}
