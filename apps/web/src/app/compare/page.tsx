'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { imgUrl } from '@/lib/api';
import { clearCompare } from '@/lib/recent';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// ⚖️ مقارنة المنتجات جنباً إلى جنب — حتى 4
function CompareInner() {
  const { fmt } = useCurrency();
  const params = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = params.get('ids') || '';
    if (!ids) { setLoading(false); return; }
    fetch(`${API}/api/v1/compare?ids=${ids}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => toast('تعذر تحميل المقارنة', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const bestPrice = items.length ? Math.min(...items.map((p) => Number(p.salePrice || p.price))) : 0;

  const Row = ({ label, render, highlight }: any) => (
    <tr style={{ borderBottom: '1px solid rgba(127,127,127,.1)' }}>
      <td className="py-3 px-2 text-[11px] font-black text-gray-400 whitespace-nowrap">{label}</td>
      {items.map((p) => (
        <td key={p.id} className={`py-3 px-2 text-center text-xs font-bold ${highlight ? 'bg-emerald-50/60' : ''}`}>
          {render(p)}
        </td>
      ))}
    </tr>
  );

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black">⚖️ مقارنة المنتجات</h1>
          {items.length > 0 && (
            <button onClick={() => { clearCompare(); toast('🧹 أُفرغت قائمة المقارنة'); history.back(); }}
              className="text-xs font-extrabold text-red-500 bg-red-50 px-3 py-1.5 rounded-full">
              🧹 مسح القائمة
            </button>
          )}
        </div>

        {loading ? <div className="skeleton h-80 rounded-3xl" /> : !items.length ? (
          <div className="glass rounded-3xl p-12 text-center text-gray-400">
            <div className="text-5xl mb-3">⚖️</div>
            لا منتجات للمقارنة — أضفها من صفحة المنتج بزر «أضف للمقارنة»
            <div className="mt-4">
              <Link href="/explore" className="btn-primary text-white text-sm font-extrabold px-6 py-2.5 rounded-full inline-block">
                🧭 تصفح المنتجات
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass rounded-3xl p-3 overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: items.length * 150 }}>
              <tbody>
                {/* الصور والأسماء */}
                <tr>
                  <td className="w-16" />
                  {items.map((p) => (
                    <td key={p.id} className="p-2 text-center align-top">
                      <Link href={`/store/${p.store.slug}/product/${p.id}`} className="block group">
                        <div className="w-full h-24 md:h-32 rounded-2xl skeleton mb-2 flex items-center justify-center text-3xl group-hover:scale-[1.03] transition-transform"
                          style={p.images?.[0] ? { background: `url(${imgUrl(p.images[0])}) center/cover`, animation: 'none' } : {}}>
                          {!p.images?.[0] && '📦'}
                        </div>
                        <div className="text-xs font-black leading-snug">{p.name}</div>
                      </Link>
                    </td>
                  ))}
                </tr>

                <Row label="💰 السعر" highlight render={(p: any) => {
                  const price = Number(p.salePrice || p.price);
                  const isBest = price === bestPrice && items.length > 1;
                  return (
                    <div>
                      <div className={`font-black text-sm ${isBest ? 'text-emerald-600' : ''}`} style={!isBest ? { color: 'var(--primary)' } : {}}>
                        {fmt(price, p.currency)}
                        {isBest && <span className="block text-[9px]">🏆 الأرخص</span>}
                      </div>
                      {p.salePrice && <div className="text-[9px] text-gray-400 line-through">{Number(p.price).toLocaleString()}</div>}
                    </div>
                  );
                }} />
                <Row label="🔥 الخصم" render={(p: any) => p.salePrice
                  ? <span className="text-red-500 font-black">-{Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100)}%</span>
                  : <span className="text-gray-300">—</span>} />
                <Row label="📦 التوفر" render={(p: any) => p.stock > 0
                  ? <span className="text-emerald-600">✅ متوفر ({p.stock})</span>
                  : <span className="text-red-500">⚠️ نفد</span>} />
                <Row label="🏪 المتجر" render={(p: any) => (
                  <Link href={`/store/${p.store.slug}`} className="hover:underline" style={{ color: 'var(--primary)' }}>
                    {p.store.name} {p.store.isVerified && '✅'}
                  </Link>
                )} />
                <Row label="⭐ تقييم المتجر" render={(p: any) => p.store.ratingAvg > 0
                  ? <span style={{ color: 'var(--accent)' }}>★ {p.store.ratingAvg.toFixed(1)} <span className="text-gray-400">({p.store.ratingCount})</span></span>
                  : <span className="text-gray-300">جديد</span>} />
                <Row label="📍 المحافظة" render={(p: any) => <span className="text-gray-500">{p.store.governorate || '—'}</span>} />
                <Row label="🗂️ الصنف" render={(p: any) => <span className="text-gray-500">{p.category?.name || 'عام'}</span>} />
                <Row label="👁️ المشاهدات" render={(p: any) => <span className="text-gray-500">{p.viewsCount.toLocaleString()}</span>} />

                {/* الوصف */}
                <tr>
                  <td className="py-3 px-2 text-[11px] font-black text-gray-400 align-top">📝 الوصف</td>
                  {items.map((p) => (
                    <td key={p.id} className="py-3 px-2 text-[10px] text-gray-500 leading-relaxed align-top">
                      {p.description ? p.description.slice(0, 120) + (p.description.length > 120 ? '…' : '') : '—'}
                    </td>
                  ))}
                </tr>

                {/* أزرار */}
                <tr>
                  <td />
                  {items.map((p) => (
                    <td key={p.id} className="p-2 text-center">
                      <Link href={`/store/${p.store.slug}/product/${p.id}`}
                        className="block py-2.5 rounded-xl text-white text-xs font-extrabold shadow"
                        style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                        👁️ عرض وشراء
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ComparePage() {
  return <Suspense fallback={<main className="min-h-screen pt-20 px-3"><div className="skeleton h-80 rounded-3xl max-w-4xl mx-auto" /></main>}><CompareInner /></Suspense>;
}
