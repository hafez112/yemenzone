"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SellerSidebar from "../../../components/SellerSidebar";
import FeatureLock from "../../../components/FeatureLock";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "جديدة", color: "#d97706" },
  confirmed: { label: "مؤكدة", color: "#2563eb" },
  processing: { label: "قيد التجهيز", color: "#7c3aed" },
  shipped: { label: "في الطريق", color: "#0891b2" },
  delivered: { label: "سُلّمت", color: "#059669" },
  completed: { label: "مكتملة", color: "#059669" },
  cancelled: { label: "ملغاة", color: "#dc2626" },
};

// إحصائيات المتجر — تحليل محلي ذكي (بدون خوادم خارجية)
export default function SellerAnalyticsPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [fin, setFin] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!getUser()) { router.push("/auth/login"); return; }
    api("/stores/my").then(setStore).catch(() => router.push("/seller/setup"));
    api("/seller/finance").then(setFin).catch((e) => toast(e.message, "error"));
    api("/seller/orders?status=all").then(setOrders).catch(() => {});
  }, []);

  if (!store || !fin) return null;

  const maxMonthly = Math.max(...fin.monthly.map((m: any) => m.total), 1);
  const thisM = fin.monthly[fin.monthly.length - 1];
  const prevM = fin.monthly[fin.monthly.length - 2] || { total: 0, count: 0 };
  const growth = prevM.total > 0 ? Math.round(((thisM.total - prevM.total) / prevM.total) * 100) : (thisM.total > 0 ? 100 : 0);

  // ── أكثر المنتجات مبيعاً (تجميع محلي من الطلبات) ──
  const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const o of orders) {
    if (["cancelled", "refunded"].includes(o.status)) continue;
    for (const it of o.items || []) {
      if (!prodMap[it.productId]) prodMap[it.productId] = { name: it.name, qty: 0, revenue: 0 };
      prodMap[it.productId].qty += it.qty;
      prodMap[it.productId].revenue += Number(it.price) * it.qty;
    }
  }
  const topProducts = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxQty = Math.max(...topProducts.map((p) => p.qty), 1);

  const statusEntries = Object.entries(fin.byStatus || {});
  const totalOrders = statusEntries.reduce((s, [, n]) => s + Number(n), 0) || 1;

  // ── نصائح الذكاء المحلي ──
  const tips: string[] = [];
  if (growth > 10) tips.push("📈 مبيعاتك تنمو بقوة هذا الشهر — حافظ على مخزون المنتجات الأكثر طلباً");
  if (growth < -10) tips.push("📉 المبيعات أقل من الشهر الماضي — جرّب كوبون خصم لتحفيز العملاء");
  const cancelled = Number((fin.byStatus || {}).cancelled || 0);
  if (cancelled / totalOrders > 0.15) tips.push("⚠️ نسبة الإلغاء مرتفعة — راجع أسباب إلغاء الطلبات مع العملاء");
  if (fin.cash > fin.electronic * 2) tips.push("💵 معظم مبيعاتك كاش — فعّل الدفع الإلكتروني لتسهيل التحصيل");
  if (!tips.length) tips.push("✨ أداء متجرك مستقر — استمر!");

  // 🔒 قفل الميزة — تُفتح بترقية الخطة وموافقة الإدارة أو بمنحة خاصة
  if (store.features && !store.features.analytics) {
    return (
      <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
          <SellerSidebar store={store} />
          <FeatureLock feature="analytics" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <section className="flex-1">
          <h1 className="text-2xl font-black mb-4">📊 إحصائيات المتجر</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-purple-600">{fin.total.toLocaleString()}</div>
              <div className="text-xs text-gray-500">إجمالي المبيعات</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-teal-600">{totalOrders === 1 && !statusEntries.length ? 0 : totalOrders}</div>
              <div className="text-xs text-gray-500">عدد الطلبات</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-blue-600">{Math.round(fin.avgOrder).toLocaleString()}</div>
              <div className="text-xs text-gray-500">متوسط الطلب</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className={`text-xl font-black ${growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>{growth >= 0 ? "+" : ""}{growth}%</div>
              <div className="text-xs text-gray-500">نمو الشهر</div>
            </div>
          </div>

          {/* المبيعات الشهرية */}
          <div className="glass rounded-3xl p-4 mb-4">
            <h2 className="font-black mb-3">📅 المبيعات — آخر 6 أشهر</h2>
            <div className="flex items-end gap-2 h-32">
              {fin.monthly.map((m: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-gray-500">{m.total > 0 ? Math.round(m.total / 1000) + "k" : ""}</div>
                  <div className="w-full rounded-t-lg" style={{ height: `${Math.max((m.total / maxMonthly) * 90, 4)}%`, background: "linear-gradient(180deg, var(--primary), #9D6BFF)" }} />
                  <div className="text-[10px] text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* حالات الطلبات */}
            <div className="glass rounded-3xl p-4">
              <h2 className="font-black mb-3">🛒 الطلبات حسب الحالة</h2>
              {!statusEntries.length && <p className="text-sm text-gray-400 text-center py-4">لا توجد طلبات بعد</p>}
              {statusEntries.map(([st, n]) => {
                const s = STATUS[st] || { label: st, color: "#6b7280" };
                const pct = Math.round((Number(n) / totalOrders) * 100);
                return (
                  <div key={st} className="mb-2">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>{s.label}</span><span>{Number(n)} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* أكثر المنتجات مبيعاً */}
            <div className="glass rounded-3xl p-4">
              <h2 className="font-black mb-3">🏆 الأكثر مبيعاً</h2>
              {!topProducts.length && <p className="text-sm text-gray-400 text-center py-4">لا توجد مبيعات بعد</p>}
              {topProducts.map((p, i) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="truncate">{i + 1}. {p.name}</span><span>{p.qty} قطعة</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(p.qty / maxQty) * 100}%`, background: "linear-gradient(90deg, var(--secondary), #00BFA5)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* نصائح الذكاء المحلي */}
          <div className="glass rounded-3xl p-4 border-r-4 border-purple-400">
            <h2 className="font-black mb-2">🤖 تحليل الذكاء المحلي</h2>
            {tips.map((t, i) => <p key={i} className="text-sm text-gray-600 mb-1">{t}</p>)}
          </div>
        </section>
      </div>
    </main>
  );
}
