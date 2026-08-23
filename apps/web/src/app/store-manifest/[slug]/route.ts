import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || '';
const PUB_API = process.env.NEXT_PUBLIC_API_URL || '';

// 📱 مانيفست تطبيق المتجر — يحوّل متجر البائع إلى تطبيق ويب تقدمي حقيقي
// باسم المتجر وشعاره ولونه: يُثبَّت على جوال الزائر كأيقونة مستقلة
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let store: any = null;
  try {
    const res = await fetch(`${API}/api/v1/storefront/${slug}`, { next: { revalidate: 300 } });
    if (res.ok) store = await res.json();
  } catch {}
  if (!store?.name) return NextResponse.json({ message: 'المتجر غير موجود' }, { status: 404 });

  const primary = store.themeJson?.primary || '#6C3DF5';
  const kindName = store.type?.nameAr || 'متجر';
  const manifest = {
    name: `${store.name} — ${kindName}`,
    short_name: store.name.slice(0, 24),
    description: store.description || `تسوّق من ${store.name} عبر تطبيقه الخاص`,
    id: `/store/${slug}`,
    start_url: `/store/${slug}`,
    scope: `/store/${slug}`,
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#ffffff',
    theme_color: primary,
    icons: [
      { src: `${PUB_API}/api/v1/pwa/store-icon/${slug}/192`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${PUB_API}/api/v1/pwa/store-icon/${slug}/512`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${PUB_API}/api/v1/pwa/store-icon/${slug}/512`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new NextResponse(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
