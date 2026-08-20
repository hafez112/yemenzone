import type { Metadata } from 'next';
import { SERVER_API as API } from '@/lib/server-api';
import DirectoryClient from './DirectoryClient';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yemenzone1.com';

export const metadata: Metadata = {
  title: 'دليل الأعمال اليمني — كل المحلات والخدمات في مكان واحد',
  description: 'دليل شامل للمحلات التجارية والخدمات في اليمن مصنّف وقابل للبحث: مطاعم وصيدليات وخدمات وبقالات — مع أرقام التواصل والمواقع. سجّل محلك مجاناً وظهر في جوجل.',
  alternates: { canonical: `${SITE}/directory` },
  openGraph: {
    title: 'دليل الأعمال اليمني — يمن زون',
    description: 'كل المحلات والخدمات في اليمن مصنّفة وقابلة للبحث — تواصل مباشر مجاناً',
    url: `${SITE}/directory`, type: 'website', locale: 'ar_YE',
  },
};

async function getDirectory() {
  try {
    const r = await fetch(`${API}/api/v1/tools/directory`, { next: { revalidate: 120 } });
    if (!r.ok) return { items: [], cats: [], govs: [], total: 0 };
    return r.json();
  } catch { return { items: [], cats: [], govs: [], total: 0 }; }
}

// 📖 دليل الأعمال اليمني — صفحة سيرفرية مفهرسة (ISR) مع فلترة تفاعلية
export default async function DirectoryPage() {
  const data = await getDirectory();
  const items = Array.isArray(data.items) ? data.items : [];

  // 📊 بيانات منظمة ItemList — الدليل يظهر كقائمة في جوجل
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'دليل الأعمال اليمني',
    url: `${SITE}/directory`,
    numberOfItems: data.total || items.length,
    itemListElement: items.slice(0, 20).map((b: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LocalBusiness',
        name: b.name,
        description: b.desc,
        url: `${SITE}/biz/${b.slug}`,
        ...(b.phone ? { telephone: b.phone } : {}),
      },
    })),
  };

  return (
    <div className="page" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DirectoryClient initialItems={items} initialCats={data.cats || []} initialGovs={data.govs || []} total={data.total || 0} />
    </div>
  );
}
