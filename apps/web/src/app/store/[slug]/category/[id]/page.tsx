import { notFound } from 'next/navigation';
import { getStorefront as getStore } from '@/lib/storefront';
import MallCategoryClient from './MallCategoryClient';

// 🗂️ صفحة صنف المول — منتجاته وفروعه الفرعية بترقيم حقيقي
export default async function Page({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  const primary = (store.themeJson as any)?.primary || '#7C3AED';
  return <MallCategoryClient store={store} primary={primary} categoryId={id} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  return { title: `🗂️ صنف — ${store?.name || 'المول'}` };
}
