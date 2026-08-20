import { getStorefront as getStore } from '@/lib/storefront';
import StoreChrome from '@/components/store/StoreChrome';


// 🏪 إطار صفحات المتجر — يغلّف كل صفحات المتجر بشريطيه العلوي والسفلي
export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  // المتجر غير موجود؟ الصفحة نفسها تعرض 404 — لا شريط بلا متجر
  if (!store) return <>{children}</>;
  const primary = (store.themeJson as any)?.primary || '#6C3DF5';
  return <StoreChrome store={store} primary={primary}>{children}</StoreChrome>;
}
