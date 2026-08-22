'use client';
import Link from 'next/link';
import { useCurrency } from '@/lib/currency';
import { offerLeftText } from '@/lib/offer';

// الأسعار — من قاعدة البيانات (الخطط المزروعة)
export default function Pricing({ plans }: { plans: any[] }) {
  const { list } = useCurrency();
  const planSym = (code?: string) => list.find((c) => c.code === String(code || 'YER').toUpperCase())?.symbol || code || 'ر.ي';
  return (
    <section id="pricing" className="max-w-5xl mx-auto px-3 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black mb-2">خطط تناسب <span className="grad-text">الجميع</span></h2>
        <p className="text-gray-500">ابدأ مجاناً — وطوّر متجرك متى ما نما</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4 stagger">
        {plans.map((p, i) => {
          const feat = p.features as any;
          const popular = i === 1;
          return (
            <div key={p.id}
              className={`relative rounded-3xl p-6 card-hover ${
                popular ? 'glass-dark text-white scale-105 shadow-2xl' : 'glass'
              }`}>
              {popular && (
                <span className="absolute -top-3 right-1/2 translate-x-1/2 text-xs font-extrabold px-4 py-1 rounded-full"
                  style={{ background: 'var(--accent)', color: '#000' }}>
                  ⭐ الأكثر اختياراً
                </span>
              )}
              <h3 className="font-extrabold text-lg mb-1">{p.name}</h3>
              {p.offerBadge && Number(p.priceBefore) > Number(p.priceMonthly) && (
                <div className="mb-2 space-y-1">
                  <span className="inline-block text-[11px] font-black text-amber-950 bg-gradient-to-l from-amber-300 to-amber-400 rounded-full px-3 py-1 anim-soft-pulse">{p.offerBadge}</span>
                  <div className="text-xs font-bold opacity-60"><s>{Number(p.priceBefore).toLocaleString()} {planSym(p.currency)}</s></div>
                </div>
              )}
              <div className="mb-4">
                <span className="text-4xl font-black grad-text">
                  {Number(p.priceMonthly) === 0 ? 'مجاناً' : Number(p.priceMonthly).toLocaleString()}
                </span>
                {Number(p.priceMonthly) > 0 && <span className="text-sm opacity-70"> {planSym(p.currency)} / شهرياً</span>}
                {Number(p.priceMonthly) > 0 && offerLeftText(p.offerEndsAt) && (
                  <span className="block text-[11px] font-black text-red-400 mt-1">{offerLeftText(p.offerEndsAt)}</span>
                )}
              </div>
              <ul className={`space-y-2 text-sm mb-6 ${popular ? 'text-gray-300' : 'text-gray-500'}`}>
                <li>📦 {feat.maxProducts === -1 ? 'منتجات غير محدودة' : `حتى ${feat.maxProducts} منتجاً`}</li>
                <li>🖼️ {feat.maxImages} صور لكل منتج</li>
                <li>🏪 {feat.storeKinds?.length || 1} نوع متجر</li>
                <li>{feat.analytics ? '📊 إحصائيات متقدمة' : '📊 إحصائيات أساسية'}</li>
                {feat.customDomain && <li>🌐 نطاق خاص</li>}
              </ul>
              <Link href="/auth/login"
                className={`block text-center font-extrabold py-3 rounded-2xl transition-all ${
                  popular ? 'btn-primary text-white' : 'bg-gray-900/5 hover:bg-gray-900/10 text-gray-800'
                }`}>
                {Number(p.priceMonthly) === 0 ? 'ابدأ مجاناً' : 'اشترك الآن'}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
