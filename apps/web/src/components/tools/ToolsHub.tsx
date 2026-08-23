'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TOOLS, TOOL_CATS, type ToolCategory } from '@/lib/tools';
import { sessionType } from '@/lib/tool-db';
import ToolsAds from './ToolsAds';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🧰 بوابة «تكنولوجيا المنصة» — كل الخدمات المجانية في مكان واحد
// 🛍️ خدمات التاجر تظهر للبائعين فقط — بقية الزوار يرون الخدمات العامة
export default function ToolsHub({ visible }: { visible: string[] }) {
  const [cat, setCat] = useState<ToolCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const [isSeller, setIsSeller] = useState(false);

  // 👁️ زيارة البوابة — صامتة
  useEffect(() => {
    fetch(`${API}/api/v1/tools/hub/view`, { method: 'POST' }).catch(() => {});
    setIsSeller(sessionType() === 'seller');
  }, []);

  const tools = useMemo(() => {
    // إن وصلت قائمة الإدارة نلتزم بها (إظهار/إخفاء + ترتيب)، وإلا نعرض الكل
    const base = (visible.length
      ? visible.map((k) => TOOLS.find((t) => t.slug === k)).filter(Boolean) as typeof TOOLS
      : TOOLS
    ).filter((t) => isSeller || t.cat !== 'merchant'); // 🛍️ خدمات التاجر للبائعين فقط
    const term = q.trim();
    return base.filter((t) =>
      (cat === 'all' || t.cat === cat) &&
      (!term || t.title.includes(term) || t.tagline.includes(term) || t.desc.includes(term)));
  }, [visible, cat, q, isSeller]);

  // التصنيفات المعروضة — تصنيف «للتاجر» يظهر للبائعين فقط
  const cats = TOOL_CATS.filter((c) => isSeller || c.id !== 'merchant');
  const count = TOOLS.filter((t) => isSeller || t.cat !== 'merchant').length;

  return (
    <div className="min-h-screen bg-night text-white" dir="rtl">
      {/* 🌌 البطل */}
      <section className="relative overflow-hidden pt-16 pb-14 px-4 text-center">
        <div className="absolute inset-0 bg-aurora opacity-50" />
        <div className="absolute -top-20 right-1/4 w-80 h-80 anim-blob opacity-25" style={{ background: 'linear-gradient(135deg,#7C3AED,#F59E0B)' }} />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 anim-blob opacity-20" style={{ background: 'linear-gradient(135deg,#06B6D4,#7C3AED)', animationDelay: '-5s' }} />
        <div className="relative max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white border border-white/15 rounded-full px-4 py-1.5 mb-6 transition-colors">يمن زون — الرئيسية</Link>
          <div className="text-6xl mb-4">🧰</div>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
            تكنولوجيا <span className="text-transparent bg-clip-text bg-gradient-to-l from-purple-400 via-fuchsia-400 to-amber-300">المنصة</span>
          </h1>
          <p className="text-white/70 text-sm sm:text-lg leading-relaxed mb-2">
            {count} خدمة قوية ومجانية بالكامل — صُممت بأحدث التقنيات لتكون يدك اليمنى كل يوم
          </p>
          <p className="text-xs text-white/50">سجّل دخولك لتستخدم أي خدمة · بيانات كل خدمة تُحفظ في قاعدتها الخاصة بحسابك 🔒</p>

          {/* 🔍 بحث */}
          <div className="mt-7 max-w-md mx-auto relative">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن خدمة... (فواتير، QR، عملات)"
              className="w-full bg-white/10 border border-white/15 rounded-2xl py-3.5 pr-11 pl-4 text-sm outline-none focus:border-purple-400 focus:bg-white/15 transition-all placeholder:text-white/40" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50">🔎</span>
          </div>
        </div>
      </section>

      {/* 📢 إعلانات البوابة */}
      <ToolsAds slot="top" />

      {/* التصنيفات */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {cats.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${cat === c.id ? 'bg-gradient-to-l from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/30' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🗂️ الشبكة */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-16">
        {tools.length === 0 ? (
          <div className="text-center py-20 text-white/50">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-bold">لا توجد خدمة بهذا الاسم</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((t, i) => (
              <Link key={t.slug} href={`/tools/${t.slug}`}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl p-5"
                style={{ animationDelay: `${i * 40}ms` }}>
                <div className={`absolute -top-8 -left-8 w-28 h-28 rounded-full bg-gradient-to-br ${t.grad} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
                {t.badge && (
                  <span className={`absolute top-4 left-4 text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-l ${t.grad} shadow-lg`}>{t.badge}</span>
                )}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.grad} grid place-items-center text-3xl shadow-lg mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform`}>{t.icon}</div>
                <h2 className="font-extrabold text-lg mb-1">{t.title}</h2>
                <p className="text-xs font-bold text-purple-300 mb-2">{t.tagline}</p>
                <p className="text-xs text-white/60 leading-relaxed line-clamp-2">{t.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-white/70 group-hover:text-white group-hover:gap-2.5 transition-all">
                  جرّبها الآن <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 🚀 CTA */}
        <div className="mt-12 relative overflow-hidden rounded-3xl border border-white/10 p-8 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.3), rgba(6,182,212,.2))' }}>
          <h2 className="text-2xl font-black mb-2">هل أنت تاجر؟ 🛍️</h2>
          <p className="text-white/70 text-sm mb-5 max-w-xl mx-auto">هذه الخدمات عيّنة مما ينتظرك داخل لوحة تحكم متجرك — أنشئ متجرك الإلكتروني في يمن زون خلال دقائق وابدأ البيع اليوم</p>
          <Link href="/auth/seller-register" className="inline-block btn-primary px-8 py-3 rounded-full font-extrabold">🚀 أنشئ متجرك مجاناً</Link>
        </div>

        {/* 📢 إعلانات أسفل البوابة */}
        <ToolsAds slot="bottom" />
      </main>
    </div>
  );
}
