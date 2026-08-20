import type { MetadataRoute } from 'next';
import { SERVER_API as API } from '@/lib/server-api';

// 📱 PWA لكل نشاط — manifest ديناميكي باسم المتجر/الفندق/المعرض/المركز وشعاره ولونه
// يُركّب الزائر النشاط كتطبيق مستقل على جواله (ميزة الخطة الذهبية)

// كل نشاط يُسمّى باسمه — لا نطلق "متجر" على الفندق ولا الإيجارات ولا الخدمات
const KIND_SUFFIX: Record<string, string> = {
  products: 'متجر إلكتروني',
  rentals: 'عقارات للإيجار',
  hotel: 'فندق',
  services: 'مركز خدمات',
};

export default async function manifest({ params }: { params: Promise<{ slug: string }> }): Promise<MetadataRoute.Manifest> {
  const { slug } = await params;
  let store: any = null;
  try {
    const res = await fetch(`${API}/api/v1/storefront/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (res.ok) store = await res.json();
  } catch {}

  // 🔒 التطبيق التقدمي ميزة الخطة الذهبية — بدونها يعمل النشاط كصفحة ويب عادية
  if (store && !store.features?.pwa) {
    return {
      name: store.name || 'يمن زون',
      short_name: store.name || 'يمن زون',
      start_url: `/store/${slug}`,
      display: 'browser',
      dir: 'rtl',
      lang: 'ar',
      icons: [],
    };
  }

  const theme = store?.themeJson || {};
  const primary = theme.primary || '#6C3DF5';
  const kind = store?.type?.kind || 'products';
  const suffix = KIND_SUFFIX[kind] || KIND_SUFFIX.products;

  // 🖼️ أيقونات PNG حقيقية تُولَّد من شعار النشاط بمقاسات دقيقة (مع منطقة أمان للقص)
  const icons = store?.logo ? [
    { src: `${API}/api/v1/pwa/store-icon/${slug}/192`, sizes: '192x192', type: 'image/png' },
    { src: `${API}/api/v1/pwa/store-icon/${slug}/512`, sizes: '512x512', type: 'image/png' },
    { src: `${API}/api/v1/pwa/store-icon/${slug}/512`, sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
  ] : [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ];

  return {
    name: store?.name ? `${store.name} — ${suffix}` : `يمن زون — ${suffix}`,
    short_name: store?.name || 'يمن زون',
    description: store?.description || `${suffix} عبر منصة يمن زون`,
    id: `/store/${slug}`,
    start_url: `/store/${slug}`,
    scope: `/store/${slug}`,
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: theme.background || '#ffffff',
    theme_color: primary,
    icons,
  };
}
