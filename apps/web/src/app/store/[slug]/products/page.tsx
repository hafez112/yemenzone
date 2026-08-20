import { notFound, redirect } from 'next/navigation';
import AllProductsClient from './AllProductsClient';

import { getStorefront as getStore } from '@/lib/storefront';


export default async function AllProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  // 🧬 صفحة المنتجات لمتاجر المنتجات فقط — الفنادق/الإيجارات/الخدمات تعود لصفحتها الرئيسية
  if ((store.type?.kind || 'products') !== 'products') redirect(`/store/${store.slug}`);
  return <AllProductsClient store={store} />;
}
