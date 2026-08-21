'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { toolBySlug } from '@/lib/tools';
import { sessionType } from '@/lib/tool-db';

// 🛡️ حارس الخدمات:
// • خدمات التاجر (cat=merchant) → للبائعين فقط — تظهر وتعمل داخل لوحة تحكم البائع
// • بقية الخدمات → تتطلب تسجيل الدخول كعميل لاستخدامها
export default function ToolGate({ slug, children }: { slug: string; children: ReactNode }) {
  const [verdict, setVerdict] = useState<'checking' | 'allow' | 'login' | 'seller-only'>('checking');

  useEffect(() => {
    const tool = toolBySlug(slug);
    const typ = sessionType();
    if (tool?.cat === 'merchant') {
      setVerdict(typ === 'seller' ? 'allow' : 'seller-only');
    } else {
      setVerdict(typ ? 'allow' : 'login');
    }
  }, [slug]);

  if (verdict === 'checking') {
    return (
      <div className="grid place-items-center py-24">
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  // 🛍️ خدمة تاجر — لغير البائع: بطاقة توجيه أنيقة بدل المحتوى
  if (verdict === 'seller-only') {
    return (
      <div className="max-w-md mx-auto text-center rounded-3xl border border-white/10 bg-white/5 p-8 mt-6">
        <div className="text-5xl mb-4">🛍️</div>
        <h2 className="text-xl font-black mb-2">خدمة خاصة بالتجار</h2>
        <p className="text-sm text-white/70 mb-6 leading-relaxed">
          هذه الخدمة جزء من لوحة تحكم البائع في يمن زون.
          {sessionType() === 'customer'
            ? ' أنت مسجل كعميل — أنشئ حساب بائع مجاناً لتصل إليها وإلى كل أدوات التاجر.'
            : ' سجّل الدخول كبائع أو أنشئ متجرك مجاناً لتصل إليها وإلى كل أدوات التاجر.'}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/auth/login" className="btn-primary px-6 py-2.5 rounded-full font-bold text-sm">🔑 دخول البائعين</Link>
          <Link href="/auth/seller-register" className="px-6 py-2.5 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">🚀 أنشئ متجرك مجاناً</Link>
        </div>
        <Link href="/tools" className="inline-block mt-5 text-xs text-white/50 hover:text-white/80 transition-colors">🧰 تصفح الخدمات العامة</Link>
      </div>
    );
  }

  // 🔐 خدمة عامة — تتطلب دخول العميل
  if (verdict === 'login') {
    return (
      <div className="max-w-md mx-auto text-center rounded-3xl border border-white/10 bg-white/5 p-8 mt-6">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-black mb-2">سجّل الدخول لاستخدام الخدمة</h2>
        <p className="text-sm text-white/70 mb-6 leading-relaxed">
          الخدمة مجانية بالكامل — سجّل دخولك كعميل لتستخدمها وتحفظ بياناتك في قاعدة بياناتها الخاصة بحسابك، وتضيفها إلى لوحة تحكمك.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/auth/customer-login?next=/tools/${slug}`} className="btn-primary px-6 py-2.5 rounded-full font-bold text-sm">🔑 تسجيل الدخول</Link>
          <Link href={`/auth/customer-register?next=/tools/${slug}`} className="px-6 py-2.5 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">✨ حساب جديد — مجاناً</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
