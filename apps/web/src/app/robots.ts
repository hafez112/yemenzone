import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🤖 robots ديناميكي — يحترم مفتاح «السماح بالأرشفة» من إعدادات الإدارة
export default async function robots(): Promise<MetadataRoute.Robots> {
  let indexing = true;
  try {
    if (API) {
      const res = await fetch(`${API}/api/v1/platform/seo`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
      if (res.ok) indexing = (await res.json()).indexing !== false;
    }
  } catch { /* عند التعذر نسمح بالأرشفة (السلوك الافتراضي) */ }

  if (!indexing) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // لوحات التحكم والحسابات لا تُفهرس
        disallow: ['/admin', '/seller', '/customer', '/driver', '/auth', '/api'],
      },
    ],
    sitemap: SITE + '/sitemap.xml',
  };
}
