'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import AdminSidebar from '@/components/AdminSidebar';
import WeeklyReportsPanel from '@/components/admin/WeeklyReportsPanel';

// 📈 تحليلات المنصة — نمو 6 أشهر + توزيع + نصائح ذكية محلية
function Bar({ value, max, color, label, hint }: { value: number; max: number; color: string; label: string; hint?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
      <div className="text-[10px] font-extrabold text-white truncate">{hint ?? value.toLocaleString()}</div>
      <div className="w-full rounded-t-lg transition-all duration-500"
        style={{ height: `${Math.max(4, (value / Math.max(max, 1)) * 90)}px`, background: color }} />
      <div className="text-[10px] text-gray-400 font-bold">{label}</div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [chart, setChart] = useState<'stores' | 'orders' | 'revenue'>('stores');

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    api('/admin/analytics').then(setD).catch((e) => { toast(e.message, 'error'); router.push('/auth/admin-login'); });
  }, []);

  if (!d) return null;
  const { months, topGovs, plansDist, tips, totals, topSearches = [] } = d;
  const maxGov = Math.max(...topGovs.map((g: any) => g.count), 1);
  const maxPlan = Math.max(...plansDist.map((p: any) => p.count), 1);
  const maxSearch = Math.max(...topSearches.map((s: any) => s.count), 1);

  const chartConf = {
    stores:  { key: 'newStores',   color: 'linear-gradient(180deg,#6C3DF5,#9D6BFF)', title: '🏪 المتاجر الجديدة' },
    orders:  { key: 'orders',      color: 'linear-gradient(180deg,#00E5C7,#0ea5e9)', title: '🛒 الطلبات' },
    revenue: { key: 'subsRevenue', color: 'linear-gradient(180deg,#FFB800,#f97316)', title: '💰 إيراد الاشتراكات (ر.ي)' },
  }[chart];
  const maxChart = Math.max(...months.map((m: any) => m[chartConf.key]), 1);

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-4">
          <h1 className="text-2xl font-black text-white">📈 تحليلات المنصة</h1>

          {/* الإجماليات */}
          <div className="grid grid-cols-4 gap-2">
            {[
              [totals.stores, 'متجراً', '🏪'],
              [totals.sellers, 'بائعاً', '🧑‍💼'],
              [totals.customers, 'عميلاً', '👥'],
              [totals.products, 'منتجاً', '📦'],
              [totals.subsRevenueTotal.toLocaleString(), 'إيراد اشتراكات (6 أشهر)', '💎'],
              [totals.adsRevenueTotal.toLocaleString(), 'إيراد إعلانات (6 أشهر)', '📢'],
              [totals.featured, 'متجر متميز', '⭐'],
              [totals.pendingSubs + totals.pendingAds, 'قرار بانتظارك', '⏳'],
            ].map(([v, l, i]) => (
              <div key={String(l)} className="glass-dark rounded-2xl p-3 text-center">
                <div className="text-lg">{i}</div>
                <div className="text-white font-black text-sm">{v}</div>
                <div className="text-[10px] text-gray-500">{l}</div>
              </div>
            ))}
          </div>

          {/* 📊 التقارير الأسبوعية الذكية + ملخص المنصة */}
          <WeeklyReportsPanel />

          {/* نصائح ذكية */}
          <div className="glass-dark rounded-3xl p-4">
            <h2 className="font-extrabold text-white text-sm mb-2">🤖 نصائح ذكية للمدير</h2>
            <div className="space-y-1.5">
              {tips.map((t: string, i: number) => (
                <div key={i} className="text-xs text-gray-300 bg-white/5 rounded-xl px-3 py-2">{t}</div>
              ))}
            </div>
          </div>

          {/* الرسم البياني */}
          <div className="glass-dark rounded-3xl p-4">
            <div className="flex gap-2 mb-4">
              {(['stores', 'orders', 'revenue'] as const).map((k) => (
                <button key={k} onClick={() => setChart(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${chart === k ? 'text-white' : 'text-gray-400 bg-white/5'}`}
                  style={chart === k ? { background: 'var(--primary)' } : {}}>
                  {k === 'stores' ? '🏪 متاجر' : k === 'orders' ? '🛒 طلبات' : '💰 إيراد'}
                </button>
              ))}
            </div>
            <h2 className="font-extrabold text-white text-sm mb-3">{chartConf.title} — آخر 6 أشهر</h2>
            <div className="flex items-end gap-2 h-32">
              {months.map((m: any) => (
                <Bar key={m.label} value={m[chartConf.key]} max={maxChart} color={chartConf.color} label={m.label} />
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* المحافظات */}
            <div className="glass-dark rounded-3xl p-4">
              <h2 className="font-extrabold text-white text-sm mb-3">🗺️ أعلى المحافظات نشاطاً</h2>
              <div className="space-y-2">
                {topGovs.map((g: any) => (
                  <div key={g.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-300 font-bold w-20 truncate">{g.name}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(g.count / maxGov) * 100}%`, background: 'var(--primary)' }} />
                    </div>
                    <span className="text-xs text-white font-extrabold w-8 text-left">{g.count}</span>
                  </div>
                ))}
                {topGovs.length === 0 && <div className="text-gray-500 text-xs">لا بيانات بعد</div>}
              </div>
            </div>

            {/* الخطط */}
            <div className="glass-dark rounded-3xl p-4">
              <h2 className="font-extrabold text-white text-sm mb-3">💎 توزيع الاشتراكات على الخطط</h2>
              <div className="space-y-2">
                {plansDist.map((p: any) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-300 font-bold w-20 truncate">{p.name}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-amber-400 to-orange-500" style={{ width: `${(p.count / maxPlan) * 100}%` }} />
                    </div>
                    <span className="text-xs text-white font-extrabold w-8 text-left">{p.count}</span>
                  </div>
                ))}
                {plansDist.length === 0 && <div className="text-gray-500 text-xs">لا اشتراكات بعد</div>}
              </div>
            </div>

            {/* 🔎 أكثر كلمات البحث — ماذا يبحث عنه الزوار؟ */}
            <div className="glass-dark rounded-3xl p-4 md:col-span-2">
              <h2 className="font-extrabold text-white text-sm mb-1">🔎 أكثر ما يبحث عنه الزوار <span className="text-[10px] text-gray-400 font-normal">(آخر 30 يوماً — من البحث الموحد)</span></h2>
              <p className="text-[10px] text-gray-500 mb-3">كلمة بعدد نتائج قليل = فرصة: شجّع بائعين على إضافة منتجات بها</p>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-2">
                {topSearches.map((s: any) => (
                  <div key={s.term} className="flex items-center gap-2">
                    <span className="text-xs text-gray-300 font-bold w-28 truncate">{s.term}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-cyan-400 to-teal-400" style={{ width: `${(s.count / maxSearch) * 100}%` }} />
                    </div>
                    <span className="text-xs text-white font-extrabold w-8 text-left">{s.count}</span>
                    <span className={`text-[10px] font-bold w-16 text-left ${s.avgResults < 3 ? 'text-red-400' : 'text-gray-400'}`}>
                      {s.avgResults} نتيجة
                    </span>
                  </div>
                ))}
                {topSearches.length === 0 && <div className="text-gray-500 text-xs">لا عمليات بحث مسجلة بعد — تُجمع تلقائياً من صفحة البحث</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
