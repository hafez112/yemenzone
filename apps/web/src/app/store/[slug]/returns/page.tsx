import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

import { getStorefront as getStore } from '@/lib/storefront';
import { returnsFor } from '@/lib/policies';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return {};
  return {
    title: `سياسة الاسترجاع — ${store.name}`,
    description: `سياسة الاسترجاع والاستبدال في ${store.name}: حقوقك وخطوات تقديم الطلب واسترداد المبلغ.`,
    robots: { index: true, follow: true },
  };
}

// 🔄 سياسة الاسترجاع — فريدة لكل نشاط، بمحتوى يناسب نوعه (فندق/إيجارات/خدمات/مول/مطعم)
export default async function StoreReturnsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  const primary = (store.themeJson as any)?.primary || '#6C3DF5';
  const policy = returnsFor(store.type?.kind || 'products', store.name, store.whatsapp);

  return (
    <main className="min-h-screen bg-gray-50 pt-20 pb-24">
      <div className="max-w-3xl mx-auto px-4">
        <Link href={`/store/${store.slug}`} className="text-sm font-bold mb-4 inline-block" style={{ color: primary }}>
          → العودة إلى {store.name}
        </Link>
        <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-black mb-1">{policy.heading}</h1>
          <p className="text-xs text-gray-400 mb-6">{policy.sub}</p>

          <div className="space-y-5 text-sm leading-relaxed text-gray-600">
            {policy.sections.map((s, i) => (
              <section key={i}>
                <h2 className="font-extrabold text-base mb-1" style={{ color: primary }}>{i + 1}. {s.title}</h2>
                <p>{s.body}</p>
              </section>
            ))}
            <section className="bg-gray-50 rounded-2xl p-4">
              <h2 className="font-extrabold text-base mb-1">🛡️ ملاحظة المنصة</h2>
              <p className="text-xs text-gray-500">يمن زون منصة تقنية تربطك بالنشاط مباشرة — قرارات الاسترجاع وتنفيذها مسؤولية {store.name} وفق هذه السياسة. لأي نزاع لم يُحل ودياً يمكنك تقديم شكوى رسمية من صفحة الشكاوى في المنصة.</p>
            </section>
          </div>

          {/* روابط السياسات الأخرى */}
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-100">
            <Link href={`/store/${store.slug}/privacy`} className="px-4 py-2 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200 transition-colors">🔒 سياسة الخصوصية</Link>
            <Link href={`/store/${store.slug}/terms`} className="px-4 py-2 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200 transition-colors">📜 شروط الاستخدام</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
