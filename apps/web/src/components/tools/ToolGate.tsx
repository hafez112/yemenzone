'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { toolBySlug } from '@/lib/tools';
import { buyTool, myAccess, sessionType, toolPrices, toolPriceCurrencies } from '@/lib/tool-db';
import { useCurrency } from '@/lib/currency';
import { toast } from '@/components/Toast';

// 🛡️ حارس الخدمات:
// • خدمات التاجر (cat=merchant) → للبائعين فقط — تظهر وتعمل داخل لوحة تحكم البائع
// • بقية الخدمات → تتطلب تسجيل الدخول كعميل لاستخدامها
// • الخدمة المدفوعة (تسعّرها الإدارة) → تُشترى ببطاقة يمن زون فقط وتفتح تلقائياً فور الدفع
export default function ToolGate({ slug, children }: { slug: string; children: ReactNode }) {
  const [verdict, setVerdict] = useState<'checking' | 'allow' | 'login' | 'seller-only' | 'paywall'>('checking');
  const [price, setPrice] = useState(0);
  const [priceCur, setPriceCur] = useState('');
  const [busy, setBusy] = useState(false);
  const { list: currencies } = useCurrency();
  const priceSym = currencies.find((c) => c.code === String(priceCur || 'YER').toUpperCase())?.symbol || priceCur || 'ر.ي';

  useEffect(() => {
    const tool = toolBySlug(slug);
    const typ = sessionType();
    if (tool?.cat === 'merchant') {
      if (typ !== 'seller') { setVerdict('seller-only'); return; }
    } else if (!typ) {
      setVerdict('login');
      return;
    }
    // 💰 هل الخدمة مدفوعة؟ وهل اشتراها المستخدم؟
    (async () => {
      try {
        const prices = await toolPrices();
        const p = prices[slug] || 0;
        if (!p) { setVerdict('allow'); return; }
        const curs = await toolPriceCurrencies();
        setPriceCur(curs[slug] || 'YER');
        const access = await myAccess();
        if (access.purchased.includes(slug)) { setVerdict('allow'); return; }
        setPrice(p);
        setVerdict('paywall');
      } catch { setVerdict('allow'); } // تعذّر الفحص — لا نحجب
    })();
  }, [slug]);

  // 💳 الشراء بالبطاقة — الفتح تلقائي فور نجاح الدفع
  const buy = async () => {
    setBusy(true);
    try {
      const r = await buyTool(slug);
      toast(r.message || '🎉 فُتحت الخدمة');
      setVerdict('allow');
    } catch (e: any) {
      toast(e.message, 'error');
    }
    setBusy(false);
  };

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

  // 💰 خدمة مدفوعة — تُشترى ببطاقة يمن زون فقط وتفتح فوراً
  if (verdict === 'paywall') {
    const typ = sessionType();
    const cardHref = typ === 'seller' ? '/seller/card' : '/customer/card';
    return (
      <div className="max-w-md mx-auto text-center rounded-3xl border border-amber-300/25 bg-amber-400/5 p-8 mt-6">
        <div className="text-5xl mb-4">💎</div>
        <h2 className="text-xl font-black mb-2">خدمة مدفوعة</h2>
        <p className="text-sm text-white/70 mb-1 leading-relaxed">
          هذه الخدمة احترافية بسعر رمزي حددته إدارة المنصة — شراء مرة واحدة وفتح دائم.
        </p>
        <p className="text-3xl font-black text-amber-300 my-4">{price.toLocaleString()} <span className="text-sm">{priceSym}</span></p>
        <button onClick={buy} disabled={busy}
          className="btn-primary w-full px-6 py-3 rounded-full font-extrabold text-sm disabled:opacity-60">
          {busy ? '⏳ جارٍ الدفع من بطاقتك…' : '💳 ادفع ببطاقة يمن زون وافتحها فوراً'}
        </button>
        <p className="text-[11px] text-white/50 mt-3">
          الدفع حصرياً عبر بطاقة يمن زون — <Link href={cardHref} className="underline text-amber-200/80">اشحن بطاقتك من هنا</Link>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
