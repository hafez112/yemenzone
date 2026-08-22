import type { Metadata } from 'next';
import Link from 'next/link';
import { SERVER_API as API } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'الباقات والأسعار — يمن زون',
  description: 'قارن باقات يمن زون بالتفصيل: المنتجات، الصور، الإحصائيات، الكوبونات، النطاق الخاص — ابدأ مجاناً ورقِّ متى احتجت.',
};

async function getPlans() {
  try {
    const d = await fetch(`${API}/api/v1/plans`, { next: { revalidate: 300 } }).then((r) => r.json());
    return { plans: Array.isArray(d?.plans) ? d.plans : [], labels: d?.featureLabels || {} };
  } catch { return { plans: [], labels: {} }; }
}

const KIND_AR: Record<string, string> = {
  products: 'متجر منتجات', restaurant: 'مطعم', hotel: 'فندق', rentals: 'معرض إيجارات', services: 'مركز خدمات',
};

// قيمة الميزة في الخلية: ✓ / ✗ / رقم / نص أنواع
function Cell({ v }: { v: any }) {
  if (v === true) return <span className="text-emerald-500 text-lg font-black">✓</span>;
  if (v === false || v === undefined || v === null) return <span className="text-gray-300 text-lg">✕</span>;
  if (typeof v === 'number') return <span className="font-black text-sm">{v === -1 ? '♾️ بلا حدود' : v.toLocaleString('en-US')}</span>;
  if (Array.isArray(v)) return <span className="text-xs font-bold text-gray-500">{v.map((k: string) => KIND_AR[k] || k).join('، ')}</span>;
  return <span className="text-xs font-bold">{String(v)}</span>;
}

// صف المقارنة: ميزات رقمية أولاً ثم البوليانية
const NUMERIC_ROWS = [
  { key: 'maxProducts', label: '📦 عدد المنتجات' },
  { key: 'maxImages', label: '🖼️ صور لكل منتج' },
  { key: 'storeKinds', label: '🏪 أنواع الأنشطة' },
];

// 💎 مقارنة الباقات — كل الأرقام والميزات من قاعدة البيانات مباشرة (يحدّثها المدير)
export default async function PlansPage() {
  const { plans, labels } = await getPlans();
  const boolKeys = Object.keys(labels as Record<string, string>);

  return (
    <main className="min-h-screen pb-24 pt-24 px-4 bg-gradient-to-b from-purple-50/60 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black mb-3">باقات تنمو مع تجارتك 💎</h1>
          <p className="text-gray-500">ابدأ مجاناً — ورقِّ متى احتجت مزايا أكبر. بلا عقود، ألغِ متى شئت.</p>
        </div>

        {plans.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-gray-400 font-bold">الباقات تُجهّز — عد قريباً</div>
        ) : (
          <>
            {/* بطاقات الأسعار */}
            <div className={`grid gap-3 mb-10 ${plans.length === 1 ? 'max-w-xs mx-auto' : plans.length === 2 ? 'grid-cols-2 max-w-lg mx-auto' : 'grid-cols-1 sm:grid-cols-3'}`}>
              {plans.map((p: any, i: number) => {
                const monthly = Number(p.priceMonthly);
                const yearly = p.priceYearly !== null && p.priceYearly !== undefined ? Number(p.priceYearly) : null;
                const highlight = i === Math.min(1, plans.length - 1);
                return (
                  <div key={p.id} className={`rounded-3xl p-1.5 ${highlight ? 'gradient-border' : ''}`}>
                    <div className={`rounded-[calc(1.5rem-4px)] p-5 text-center h-full ${highlight ? 'bg-night text-white' : 'glass'}`}>
                      {highlight && <div className="text-[10px] font-black text-amber-300 mb-1">⭐ الأكثر اختياراً</div>}
                      <h2 className="font-black text-lg">{p.name}</h2>
                      <div className="my-3">
                        {monthly === 0 ? (
                          <div className="text-3xl font-black text-emerald-500">مجاناً 🎁</div>
                        ) : (
                          <>
                            <span className="text-3xl font-black" style={highlight ? {} : { color: 'var(--primary)' }}>{monthly.toLocaleString('en-US')}</span>
                            <span className="text-xs font-bold opacity-60"> {p.currency === 'YER' ? 'ر.ي / شهر' : p.currency}</span>
                          </>
                        )}
                        {yearly !== null && yearly > 0 && monthly > 0 && (
                          <div className={`text-[11px] font-bold mt-1 ${highlight ? 'text-amber-300' : 'text-amber-600'}`}>
                            سنوياً {yearly.toLocaleString('en-US')} — وفّر {Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100))}% 🔥
                          </div>
                        )}
                      </div>
                      <Link href="/auth/seller-register"
                        className={`block w-full py-2.5 rounded-full text-sm font-extrabold ${highlight ? 'btn-primary btn-shine text-white' : 'border-2'}`}
                        style={highlight ? {} : { borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                        {monthly === 0 ? '🚀 ابدأ مجاناً' : '✨ اختر الباقة'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* جدول المقارنة التفصيلي */}
            <div className="glass rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-center min-w-[420px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-right px-4 py-3 text-xs font-black text-gray-400">الميزة</th>
                      {plans.map((p: any) => (
                        <th key={p.id} className="px-3 py-3 text-sm font-black">{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {NUMERIC_ROWS.map((row, ri) => (
                      <tr key={row.key} className={ri % 2 ? 'bg-gray-50/60' : ''}>
                        <td className="text-right px-4 py-3 text-xs font-bold text-gray-600">{row.label}</td>
                        {plans.map((p: any) => (
                          <td key={p.id} className="px-3 py-3"><Cell v={p.effectiveFeatures?.[row.key]} /></td>
                        ))}
                      </tr>
                    ))}
                    {boolKeys.map((k, ri) => (
                      <tr key={k} className={(ri + NUMERIC_ROWS.length) % 2 ? 'bg-gray-50/60' : ''}>
                        <td className="text-right px-4 py-3 text-xs font-bold text-gray-600">{labels[k]}</td>
                        {plans.map((p: any) => (
                          <td key={p.id} className="px-3 py-3"><Cell v={p.effectiveFeatures?.[k] === true} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-center text-[11px] text-gray-400 mt-4">
              كل الباقات تشمل: لوحة تحكم كاملة من الجوال، رابط متجر خاص، QR جاهز، دعم فني مباشر 🎧، تقريراً أسبوعياً ذكياً 📊
            </p>

            <div className="text-center mt-8">
              <Link href="/start" className="text-sm font-bold hover:underline" style={{ color: 'var(--primary)' }}>
                ← كيف تبدأ متجرك في 4 خطوات؟
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
