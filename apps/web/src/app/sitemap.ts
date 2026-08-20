import type { MetadataRoute } from 'next';

import { SERVER_API as API } from '@/lib/server-api';
import { TOOLS } from '@/lib/tools';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// خريطة الموقع الديناميكية — تتجدد كل ساعة
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
    { url: SITE + '/stores', changeFrequency: 'hourly', priority: 0.9 },
    { url: SITE + '/explore', changeFrequency: 'hourly', priority: 0.9 },
    { url: SITE + '/offers', changeFrequency: 'hourly', priority: 0.85 },
    { url: SITE + '/directory', changeFrequency: 'daily', priority: 0.8 },
    { url: SITE + '/search', changeFrequency: 'daily', priority: 0.6 },
    { url: SITE + '/nearby', changeFrequency: 'hourly', priority: 0.8 },
    { url: SITE + '/services', changeFrequency: 'weekly', priority: 0.7 },
    { url: SITE + '/blog', changeFrequency: 'daily', priority: 0.7 },
    { url: SITE + '/about', changeFrequency: 'monthly', priority: 0.6 },
    { url: SITE + '/start', changeFrequency: 'monthly', priority: 0.8 },
    { url: SITE + '/faq', changeFrequency: 'weekly', priority: 0.7 },
    { url: SITE + '/help', changeFrequency: 'weekly', priority: 0.6 },
    { url: SITE + '/complaint', changeFrequency: 'monthly', priority: 0.4 },
    { url: SITE + '/privacy', changeFrequency: 'monthly', priority: 0.4 },
    { url: SITE + '/terms', changeFrequency: 'monthly', priority: 0.4 },
    { url: SITE + '/returns', changeFrequency: 'monthly', priority: 0.4 },
    { url: SITE + '/auth/login', changeFrequency: 'monthly', priority: 0.6 },
    // 🧰 تكنولوجيا المنصة — كل خدمة صفحة مستقلة مفهرسة (تجلب زوار من بحث جوجل)
    ...TOOLS.map((t) => ({ url: SITE + '/tools/' + t.slug, changeFrequency: 'weekly' as const, priority: 0.75 })),
    { url: SITE + '/tools', changeFrequency: 'weekly', priority: 0.8 },
  ];

  let storeRoutes: MetadataRoute.Sitemap = [];
  let pageRoutes: MetadataRoute.Sitemap = [];
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const stores = await fetch(API + '/api/v1/stores', { next: { revalidate: 3600 } }).then((r) => r.json());
    if (Array.isArray(stores)) {
      storeRoutes = stores.flatMap((s: any) => [
        { url: SITE + '/store/' + s.slug, changeFrequency: 'daily' as const, priority: 0.9 },
        { url: SITE + '/store/' + s.slug + '/products', changeFrequency: 'daily' as const, priority: 0.7 },
      ]);
    }
  } catch {}
  try {
    const pages = await fetch(API + '/api/v1/platform/pages/footer', { next: { revalidate: 3600 } }).then((r) => r.json());
    if (Array.isArray(pages)) {
      pageRoutes = pages.map((p: any) => ({ url: SITE + '/p/' + p.slug, changeFrequency: 'weekly' as const, priority: 0.5 }));
    }
  } catch {}
  try {
    const posts = await fetch(API + '/api/v1/platform/blog', { next: { revalidate: 3600 } }).then((r) => r.json());
    if (Array.isArray(posts)) {
      blogRoutes = posts.map((p: any) => ({
        url: SITE + '/blog/' + p.slug,
        lastModified: p.publishedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch {}

  return [...staticRoutes, ...storeRoutes, ...pageRoutes, ...blogRoutes];
}
