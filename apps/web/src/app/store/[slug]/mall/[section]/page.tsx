import { notFound } from 'next/navigation';
import { getStorefront as getStore } from '@/lib/storefront';
import MallSectionClient from './MallSectionClient';

const SECTIONS: Record<string, { icon: string; title: string; sub: string }> = {
  featured: { icon: '⭐', title: 'منتجات متميزة', sub: 'مختارات إدارة المول بعناية' },
  top: { icon: '🔥', title: 'الأكثر مبيعاً', sub: 'ما يطلبه المتسوقون فعلاً' },
  new: { icon: '🆕', title: 'وصل حديثاً', sub: 'أحدث ما أُضيف خلال 30 يوماً' },
  offers: { icon: '🏷️', title: 'عروض وتخفيضات', sub: 'أسعار مخفضة لفترة محدودة' },
};

// 🏬 صفحات أقسام المول — متميزة / الأكثر مبيعاً / وصل حديثاً / عروض
export default async function Page({ params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section } = await params;
  const meta = SECTIONS[section];
  if (!meta) notFound();
  const store = await getStore(slug);
  if (!store) notFound();
  const primary = (store.themeJson as any)?.primary || '#7C3AED';
  return <MallSectionClient store={store} primary={primary} section={section} meta={meta} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section } = await params;
  const store = await getStore(slug);
  const meta = SECTIONS[section];
  return { title: `${meta?.icon || ''} ${meta?.title || ''} — ${store?.name || ''}` };
}
