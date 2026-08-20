import { NextRequest, NextResponse } from 'next/server';

// 📱 مانيفست ديناميكي للوحات — يُحقن فقط بعد اعتماد الإدارة لطلب التطبيق
const APPS: Record<string, { name: string; short: string; start: string; color: string }> = {
  seller:   { name: 'لوحة البائع — منصة يمن زون',   short: 'لوحة البائع',  start: '/seller',   color: '#6C3DF5' },
  driver:   { name: 'لوحة السائق — منصة يمن زون',   short: 'لوحة السائق',  start: '/driver',   color: '#0EA5E9' },
  customer: { name: 'لوحة العميل — منصة يمن زون',   short: 'حسابي',        start: '/customer', color: '#0D9488' },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  const info = APPS[app];
  if (!info) return NextResponse.json({ message: 'تطبيق غير معروف' }, { status: 404 });

  const manifest = {
    name: info.name,
    short_name: info.short,
    description: 'تطبيق ويب تقدمي معتمد من إدارة منصة يمن زون',
    id: info.start,
    start_url: info.start,
    scope: info.start,
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#0A0A14',
    theme_color: info.color,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new NextResponse(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
