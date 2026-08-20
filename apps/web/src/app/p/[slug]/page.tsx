import type { Metadata } from "next";
import Link from "next/link";

import { SERVER_API as API } from '@/lib/server-api';

async function getPage(slug: string) {
  try {
    const res = await fetch(API + "/api/v1/platform/pages/" + slug, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  return {
    title: page?.metaTitle || page?.title || "يمن زون",
    description: page?.metaDesc || undefined,
  };
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page) {
    return (
      <div className="page text-center py-20">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-black mb-2">الصفحة غير موجودة</h1>
        <Link href="/" className="btn inline-block mt-2">← الرئيسية</Link>
      </div>
    );
  }

  const looksHtml = /<[a-z][\s\S]*>/i.test(page.content || "");

  return (
    <div className="page">
      <div className="max-w-3xl mx-auto">
        <div className="card">
          <h1 className="text-3xl font-black mb-4" style={{ color: "var(--primary)" }}>{page.title}</h1>
          {looksHtml ? (
            <div className="prose-custom leading-loose" dangerouslySetInnerHTML={{ __html: page.content }} />
          ) : (
            <div className="leading-loose whitespace-pre-line">{page.content}</div>
          )}
          <hr className="my-6 border-gray-100" />
          <Link href="/" className="btn">← العودة للرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
