import { notFound } from 'next/navigation';
import { getStorefront as getStore } from '@/lib/storefront';
import MallCartClient from './MallCartClient';

// 🛒 سلة المول المنفصلة — صفحة كاملة بثيم المول
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  const primary = (store.themeJson as any)?.primary || '#7C3AED';
  return <MallCartClient store={store} primary={primary} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  return { title: `🛒 سلة التسوق — ${store?.name || ''}` };
}
