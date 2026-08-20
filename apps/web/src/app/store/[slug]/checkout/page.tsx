import { notFound } from 'next/navigation';
import { getStorefront as getStore } from '@/lib/storefront';
import MallCheckoutClient from './MallCheckoutClient';

// ✅ إتمام طلب المول — صفحة منفصلة بثيم المول: بيانات + توصيل + دفع + كوبون
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  const primary = (store.themeJson as any)?.primary || '#7C3AED';
  return <MallCheckoutClient store={store} primary={primary} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  return { title: `✅ إتمام الطلب — ${store?.name || ''}` };
}
