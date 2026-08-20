import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ToolLoader from '@/components/tools/ToolLoader';
import { TOOLS, toolBySlug } from '@/lib/tools';
import { SERVER_API as API } from '@/lib/server-api';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yemenzone1.com';

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

// 🔍 SEO مخصص من الإدارة — يتقدّم على الافتراضي
async function getSeo(slug: string): Promise<{ title?: string; desc?: string; keywords?: string }> {
  try {
    const r = await fetch(`${API}/api/v1/tools/seo/${slug}`, { next: { revalidate: 120 } });
    if (!r.ok) return {};
    return r.json();
  } catch { return {}; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  if (!tool) return {};
  const seo = await getSeo(slug);
  const title = seo.title || `${tool.title} — خدمة مجانية | يمن زون`;
  const description = seo.desc || tool.desc;
  const keywords = seo.keywords
    ? seo.keywords.split(/[،,]/).map((k) => k.trim()).filter(Boolean)
    : [tool.title, 'مجاني', 'يمن زون', 'تكنولوجيا المنصة', 'اليمن'];
  return {
    title,
    description,
    keywords,
    alternates: { canonical: `${SITE}/tools/${slug}` },
    openGraph: {
      title, description, url: `${SITE}/tools/${slug}`, siteName: 'يمن زون',
      type: 'website', locale: 'ar_YE',
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  };
}

// ⛔ الأداة المخفية من لوحة المنصة لا تُفتح حتى لو عُرف رابطها
async function isVisible(slug: string): Promise<boolean> {
  try {
    const r = await fetch(`${API}/api/v1/tools`, { next: { revalidate: 60 } });
    const d = await r.json();
    if (!Array.isArray(d.tools)) return true; // تعذّر الجلب — لا نحجب
    return d.tools.includes(slug);
  } catch { return true; }
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  if (!tool) notFound();
  if (!(await isVisible(slug))) notFound();
  const seo = await getSeo(slug);

  // 📊 بيانات منظمة لمحركات البحث (WebApplication مجاني عربي)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: seo.title || tool.title,
    description: seo.desc || tool.desc,
    url: `${SITE}/tools/${slug}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'أي متصفح — يعمل من الويب مباشرة',
    inLanguage: 'ar',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'YER' },
    provider: { '@type': 'Organization', name: 'منصة يمن زون', url: SITE },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolLoader slug={slug} />
    </>
  );
}
