'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

// 📊 التقرير الأسبوعي الذكي — يُبنى لحظياً + يصل إشعار به كل أسبوع
export default function SellerReportsPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    api('/seller/reports/weekly')
      .then(setReport)
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const growth = report?.orders?.growth;
  const trend = growth === null || growth === undefined ? 'stable' : growth > 5 ? 'rising' : growth < -5 ? 'falling' : 'stable';

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-indigo-50 via-white to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">📊 تقريرك الأسبوعي</h1>
          <p className="text-sm text-gray-500 mb-4">ملخص ذكي لآخر 7 أيام — ويصلك إشعار به تلقائياً كل أسبوع 🔔</p>

          {loading ? (
            <div className="bg-white rounded-3xl p-10 text-center text-gray-400 font-bold animate-pulse">⏳ نجهّز تقريرك...</div>
          ) : !report ? (
            <div className="bg-white rounded-3xl p-10 text-center text-gray-400 font-bold">تعذر تحميل التقرير</div>
          ) : (
            <div className="space-y-4">
              {/* بطاقة النمو الرئيسية */}
              <div className={`rounded-3xl p-6 text-white shadow-lg bg-gradient-to-l ${trend === 'rising' ? 'from-emerald-500 to-teal-600' : trend === 'falling' ? 'from-rose-500 to-orange-500' : 'from-indigo-500 to-purple-600'}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-sm font-bold opacity-90">مبيعات آخر 7 أيام</div>
                    <div className="text-3xl font-black mt-1">{Number(report.orders.total).toLocaleString('en-US')} <span className="text-base font-bold">ريال</span></div>
                    <div className="text-xs font-bold opacity-90 mt-1">الأسبوع السابق: {Number(report.orders.prevTotal).toLocaleString('en-US')} ريال</div>
                  </div>
                  <div className="text-center bg-white/20 rounded-2xl px-5 py-3 backdrop-blur">
                    <div className="text-3xl font-black">
                      {growth === null ? '—' : `${growth > 0 ? '+' : ''}${growth}%`}
                    </div>
                    <div className="text-xs font-bold">{trend === 'rising' ? '📈 في صعود' : trend === 'falling' ? '📉 في تراجع' : '➖ مستقر'}</div>
                  </div>
                </div>
              </div>

              {/* بطاقات الأرقام */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '🛒', label: 'الطلبات', val: report.orders.count, sub: `السابق: ${report.orders.prevCount}` },
                  ...(report.bookings > 0 ? [{ icon: '📅', label: 'الحجوزات', val: report.bookings, sub: 'هذا الأسبوع' }] : []),
                  { icon: '⭐', label: 'تقييمات جديدة', val: report.newReviews, sub: `متوسطك ${Number(report.ratingAvg).toFixed(1)}` },
                  { icon: '🏆', label: 'أصناف مباعة', val: report.topProducts.reduce((s: number, p: any) => s + p.qty, 0), sub: 'الأعلى طلباً' },
                ].map((c, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <div className="text-2xl">{c.icon}</div>
                    <div className="text-xl font-black mt-1">{c.val}</div>
                    <div className="text-xs font-bold text-gray-500">{c.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* الأكثر مبيعاً */}
              {report.topProducts.length > 0 && (
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                  <h2 className="font-black mb-3">🏆 الأكثر مبيعاً هذا الأسبوع</h2>
                  <div className="space-y-2">
                    {report.topProducts.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        <span className="text-lg">{['🥇', '🥈', '🥉'][i] || '🏅'}</span>
                        <span className="font-bold flex-1 truncate">{p.name}</span>
                        <span className="text-sm font-black text-amber-700">{p.qty} قطعة</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* تنبيه المخزون */}
              {report.lowStock.length > 0 && (
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-red-100">
                  <h2 className="font-black mb-3">⚠️ مخزون يحتاج انتباهك</h2>
                  <div className="space-y-2">
                    {report.lowStock.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        <span className="font-bold flex-1 truncate">{p.name}</span>
                        <span className={`text-xs font-black px-2 py-1 rounded-full ${p.stock === 0 ? 'bg-red-500 text-white' : 'bg-orange-100 text-orange-700'}`}>
                          {p.stock === 0 ? 'نفد ❌' : `بقي ${p.stock}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">حدّث الكميات من صفحة المنتجات حتى لا تفقد مبيعات 📦</p>
                </div>
              )}

              {/* النصيحة الذكية */}
              <div className="bg-gradient-to-l from-teal-50 to-emerald-50 border border-teal-200 rounded-3xl p-5">
                <h2 className="font-black mb-2">💡 نصيحة الأسبوع</h2>
                <p className="text-sm font-bold text-gray-700 leading-7">{report.advice}</p>
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                الفترة: {new Date(report.period.from).toLocaleDateString('ar-YE')} — {new Date(report.period.to).toLocaleDateString('ar-YE')} • يُحدَّث التقرير لحظياً عند فتح الصفحة
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
