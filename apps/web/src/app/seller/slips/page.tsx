'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';

// 🖨️ بوالص الشحن — فردية أو جماعية، كل بوليصة في صفحة مستقلة عند الطباعة
const STATUS_AR: Record<string, string> = {
  pending: 'جديد', confirmed: 'مؤكد', processing: 'قيد التجهيز',
  shipped: 'في الطريق', delivered: 'سُلّم', completed: 'مكتمل', cancelled: 'ملغي',
};

function SlipsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    const ids = params.get('ids') || '';
    if (!ids) { setErr('لم تُحدد طلبات'); return; }
    api(`/seller/orders/slips?ids=${encodeURIComponent(ids)}`)
      .then(setData)
      .catch((e) => { setErr(e.message); toast(e.message, 'error'); });
  }, []);

  if (err) return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="text-center"><div className="text-5xl mb-3">🚫</div><p className="font-bold text-gray-600">{err}</p></div>
    </main>
  );
  if (!data) return <main className="min-h-screen bg-gray-100 flex items-center justify-center pt-20"><div className="skeleton w-full max-w-2xl h-80 rounded-3xl mx-4" /></main>;

  return (
    <main className="min-h-screen bg-gray-200 pt-20 pb-6 px-3">
      {/* أدوات — لا تُطبع، لاصقة تحت الشريط العلوي الثابت فلا تختفي عن البائع */}
      <div className="no-print max-w-2xl mx-auto mb-4 flex gap-2 sticky top-16 z-40 glass rounded-2xl p-2 shadow-lg">
        <button onClick={() => window.print()}
          className="flex-1 py-3 rounded-xl text-white font-extrabold shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
          🖨️ طباعة {data.orders.length > 1 ? `${data.orders.length} بوالص` : 'البوليصة'}
        </button>
        <button onClick={() => history.back()}
          className="px-5 py-3 rounded-xl bg-white font-bold text-gray-600 shadow">→ رجوع</button>
      </div>

      <div className="print-root max-w-2xl mx-auto space-y-6">
        {data.orders.map((o: any) => (
          <div key={o.id} className="slip-sheet print-page bg-white rounded-3xl shadow-xl overflow-hidden" style={{ color: '#1e1b2e' }}>
            {/* رأس البوليصة */}
            <div className="p-5 text-white flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1e1b2e, #4c1d95)' }}>
              <div>
                <div className="text-lg font-black">📦 بوليصة شحن</div>
                <div className="text-xs opacity-75">{data.store.name} — منصة يمن زون</div>
              </div>
              <div className="text-left">
                <div className="text-xl font-black" dir="ltr">{o.number}</div>
                <div className="text-[11px] opacity-75">{new Date(o.createdAt).toLocaleDateString('ar-YE')}</div>
              </div>
            </div>

            {/* المستلم */}
            <div className="p-5 pb-0">
              <div className="rounded-2xl p-4" style={{ background: '#f6f4ff', border: '1.5px dashed #c4b5fd' }}>
                <div className="text-[11px] font-black text-gray-400 mb-2">المستلم 👤</div>
                <div className="font-black text-base">{o.customerName}</div>
                <div className="text-sm font-bold mt-1" dir="ltr">📱 {o.customerPhone}</div>
                {o.address && <div className="text-xs text-gray-500 mt-1">📍 {o.address}</div>}
              </div>
            </div>

            {/* الأصناف */}
            <div className="p-5">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e1f5' }}>
                    <th className="text-right py-1.5 text-gray-400 text-[11px]">الصنف</th>
                    <th className="py-1.5 text-gray-400 text-[11px] w-14">الكمية</th>
                    <th className="py-1.5 text-gray-400 text-[11px] w-20 text-left">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((it: any) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid #f1eefc' }}>
                      <td className="py-2 font-bold">{it.name}</td>
                      <td className="py-2 text-center">{it.qty}</td>
                      <td className="py-2 text-left font-bold">{Number(it.qty * it.price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  💳 {o.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : o.paymentMethod?.replace(/^store:/, '') || '—'}
                  {o.deliveryMethod ? ` · 🚚 ${o.deliveryMethod}` : ''}
                </span>
                <span className="font-black text-lg" style={{ color: '#6C3DF5' }}>
                  {Number(o.total).toLocaleString()} ر.ي
                </span>
              </div>
              {o.notes && <p className="mt-2 text-xs text-gray-500">📝 ملاحظات العميل: {o.notes}</p>}

              {/* توقيع الاستلام */}
              <div className="mt-5 grid grid-cols-2 gap-4 text-[11px] text-gray-400">
                <div className="border-t-2 border-dashed border-gray-300 pt-2 text-center">توقيع المندوب</div>
                <div className="border-t-2 border-dashed border-gray-300 pt-2 text-center">توقيع المستلم</div>
              </div>
              <div className="mt-3 text-center text-[10px] text-gray-300">
                الحالة عند الطباعة: {STATUS_AR[o.status] || o.status} · {data.store.phone ? `هاتف المتجر: ${data.store.phone}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function SlipsPage() {
  return <Suspense fallback={<main className="min-h-screen pt-20 px-3"><div className="skeleton h-80 rounded-3xl max-w-2xl mx-auto" /></main>}><SlipsInner /></Suspense>;
}
