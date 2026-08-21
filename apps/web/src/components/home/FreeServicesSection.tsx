import Link from 'next/link';
import { TOOLS } from '@/lib/tools';

// 🧰 قسم «الخدمات المجانية» في الصفحة الرئيسية
// يظهر ضمن أقسام إدارة التصميم (/admin/design) — تتحكم الإدارة بموقعه وإظهاره/إخفائه
// البطاقات بألوان الواجهة القياسية لتتلون تلقائياً مع ثيمات استوديو التطبيق والويب
export default function FreeServicesSection() {
  return (
    <section className="py-6">
      <div className="flex items-end justify-between mb-5 px-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="section-chip">🧰</span>
          <div>
            <h2 className="f-2xl font-black">الخدمات المجانية</h2>
            <p className="text-gray-500 f-xs mt-0.5">{TOOLS.length} خدمة قوية ومجانية بالكامل — للتاجر والزائر</p>
          </div>
        </div>
        <Link href="/tools"
          className="chip-filter on !py-1.5 shrink-0 hidden sm:inline-block">
          الكل ←
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-3 pb-2 max-w-6xl mx-auto snap-x edge-fade" style={{ scrollbarWidth: 'none' }}>
        {TOOLS.map((t) => (
          <Link key={t.slug} href={`/tools/${t.slug}`}
            className="card-hover snap-start shrink-0 w-40 bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center">
            <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${t.grad} grid place-items-center text-2xl shadow-md mb-2.5`}>{t.icon}</span>
            <span className="font-extrabold text-[13px] text-gray-800 leading-snug">{t.title}</span>
            <span className="text-[10px] text-gray-500 mt-1 leading-snug line-clamp-2">{t.tagline}</span>
            {t.badge && (
              <span className="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t.badge}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
