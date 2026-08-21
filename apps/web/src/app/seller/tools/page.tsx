'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/api';
import { TOOLS } from '@/lib/tools';
import { myTools, sessionType, type MyToolRow } from '@/lib/tool-db';

// 🛍️ أدوات التاجر — خدمات المنصة الخاصة بالبائعين، تظهر هنا فقط
// كل أداة لها قاعدة بيانات خاصة بحساب البائع تُحفظ فيها بياناته تلقائياً
export default function SellerToolsPage() {
  const router = useRouter();
  const [mine, setMine] = useState<MyToolRow[]>([]);
  const merchantTools = TOOLS.filter((t) => t.cat === 'merchant');

  useEffect(() => {
    if (!getUser() || sessionType() !== 'seller') { router.push('/auth/login'); return; }
    myTools().then(setMine).catch(() => {});
  }, []);

  const rowOf = (slug: string) => mine.find((r) => r.slug === slug);

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black">🛍️ أدوات التاجر</h1>
          <p className="text-gray-500 text-xs mt-1">
            {merchantTools.length} أداة احترافية خاصة بك — بيانات كل أداة تُحفظ في قاعدتها الخاصة بحسابك
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {merchantTools.map((t) => {
          const row = rowOf(t.slug);
          return (
            <Link key={t.slug} href={`/tools/${t.slug}`}
              className="card card-hover p-4 flex flex-col relative overflow-hidden group">
              <div className={`absolute -top-6 -left-6 w-20 h-20 rounded-full bg-gradient-to-br ${t.grad} opacity-15 blur-xl group-hover:opacity-30 transition-opacity`} />
              {t.badge && (
                <span className={`absolute top-3 left-3 text-[9px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-l ${t.grad}`}>{t.badge}</span>
              )}
              <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${t.grad} grid place-items-center text-2xl shadow-md mb-3`}>{t.icon}</span>
              <span className="font-extrabold text-sm leading-snug">{t.title}</span>
              <span className="text-[11px] text-gray-500 mt-1 leading-snug line-clamp-2">{t.tagline}</span>
              <span className="mt-3 text-[10px] font-bold text-gray-400 flex items-center gap-1">
                {row?.hasData
                  ? <>🗄️ لها بيانات محفوظة — آخر تحديث {new Date(row.updatedAt).toLocaleDateString('ar-YE')}</>
                  : '🗄️ قاعدة بياناتها جاهزة في حسابك'}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
