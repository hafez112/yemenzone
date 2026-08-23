'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { toolBySlug } from '@/lib/tools';
import { addMyTool, myTools, removeMyTool, sessionType } from '@/lib/tool-db';
import { toast } from '@/components/Toast';
import ToolsAds from './ToolsAds';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🧱 غلاف موحد لكل خدمات تكنولوجيا المنصة — ترويسة + محتوى + دعوة للانضمام
export default function ToolShell({ slug, children }: { slug: string; children: ReactNode }) {
  const tool = toolBySlug(slug);
  const [inMyPanel, setInMyPanel] = useState(false);
  const [busy, setBusy] = useState(false);
  const isMerchant = tool?.cat === 'merchant';
  const loggedType = typeof window !== 'undefined' ? sessionType() : null;

  // 📈 عدادا استخدام + زيارة صامتان
  useEffect(() => {
    fetch(`${API}/api/v1/tools/${slug}/use`, { method: 'POST' }).catch(() => {});
    fetch(`${API}/api/v1/tools/${slug}/view`, { method: 'POST' }).catch(() => {});
    // هل الخدمة مضافة إلى لوحتي؟ (للمسجلين فقط)
    if (sessionType()) {
      myTools().then(rows => setInMyPanel(rows.some(r => r.slug === slug))).catch(() => {});
    }
  }, [slug]);

  if (!tool) return null;

  // ➕ إضافة/إزالة الخدمة من لوحة تحكم المستخدم — لها قاعدة بيانات خاصة في حسابه
  const toggleMyPanel = async () => {
    setBusy(true);
    try {
      if (inMyPanel) {
        await removeMyTool(slug);
        setInMyPanel(false);
        toast('✕ أُزيلت الخدمة من لوحتك');
      } else {
        await addMyTool(slug);
        setInMyPanel(true);
        toast('✅ أُضيفت الخدمة إلى لوحة تحكمك — لها الآن قاعدة بيانات خاصة في حسابك');
      }
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-night text-white" dir="rtl">
      {/* ترويسة الأداة */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/tools" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 grid place-items-center text-lg transition-colors" aria-label="كل الخدمات">🧰</Link>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.grad} grid place-items-center text-xl shadow-lg`}>{tool.icon}</div>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base truncate">{tool.title}</h1>
            <p className="text-[11px] text-white/60 truncate">{tool.tagline}</p>
          </div>
          {/* ➕ إضافة الخدمة إلى لوحة التحكم — خدمات التاجر تُدار من لوحة البائع تلقائياً */}
          {isMerchant ? (
            loggedType === 'seller' && (
              <Link href="/seller/tools" className="text-xs font-bold border border-amber-300/40 text-amber-200 rounded-full px-3 py-1.5 hover:bg-amber-400/10 transition-colors shrink-0">🛍️ لوحة التاجر</Link>
            )
          ) : (
            loggedType && (
              <button onClick={toggleMyPanel} disabled={busy}
                className={`text-xs font-bold rounded-full px-3 py-1.5 transition-colors shrink-0 border ${
                  inMyPanel
                    ? 'border-emerald-300/40 text-emerald-200 bg-emerald-400/10'
                    : 'border-white/15 text-white/70 hover:text-white hover:bg-white/10'
                }`}>
                {busy ? '…' : inMyPanel ? '✓ في لوحتي' : '➕ أضف إلى لوحتي'}
              </button>
            )
          )}
          <Link href="/" className="text-xs font-bold text-white/70 hover:text-white border border-white/15 rounded-full px-3 py-1.5 transition-colors">يمن زون</Link>
        </div>
      </header>

      {/* 📢 إعلانات علوية مستهدفة لهذه الخدمة */}
      <ToolsAds tool={slug} slot="top" />

      {/* المحتوى */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">{children}</main>

      {/* 📢 إعلانات سفلية */}
      <ToolsAds tool={slug} slot="bottom" />

      {/* 🚀 دعوة الانضمام */}
      <footer className="max-w-4xl mx-auto px-4 pb-10">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 p-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.25), rgba(245,158,11,.15))' }}>
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full anim-blob opacity-20" style={{ background: 'var(--primary, #7C3AED)' }} />
          <p className="text-lg font-extrabold mb-1">أعجبتك الأداة؟ 🎁</p>
          <p className="text-sm text-white/70 mb-4">أنشئ متجرك في يمن زون واحصل على هذه الأداة وكل أدوات التاجر داخل لوحة تحكمك — مجاناً</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/auth/seller-register" className="btn-primary px-6 py-2.5 rounded-full font-bold text-sm">🚀 أنشئ متجرك مجاناً</Link>
            <Link href="/tools" className="px-6 py-2.5 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">🧰 كل الخدمات</Link>
          </div>
        </div>
        <p className="text-center text-[11px] text-white/40 mt-4">خدمة مجانية من منصة يمن زون — تعمل داخل متصفحك وبياناتك لا تغادر جهازك</p>
      </footer>
    </div>
  );
}
