"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SellerSidebar from "../../../components/SellerSidebar";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import { useCurrency } from "../../../lib/currency";
import FeatureLock from "../../../components/FeatureLock";

// عملاء المتجر — تحليل محلي ذكي من بيانات الطلبات (بدون خوادم خارجية)
export default function SellerCustomersPage() {
  const { list: CURS, def: defCur } = useCurrency();
  const dsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!getUser()) { router.push("/auth/login"); return; }
    api("/stores/my").then(setStore).catch(() => router.push("/seller/setup"));
    api("/seller/orders?status=all").then(setOrders).catch((e) => toast(e.message, "error"));
  }, []);

  if (!store) return null;
  if (store.features && !store.features.crm) {
    return (
      <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
          <SellerSidebar store={store} />
          <section className="flex-1"><FeatureLock feature="crm" /></section>
        </div>
      </main>
    );
  }

  // ── تجميع العملاء من الطلبات ──
  const map: Record<string, any> = {};
  for (const o of orders) {
    const key = o.customerPhone || o.customerName || "زائر";
    if (!map[key]) map[key] = { name: o.customerName || "عميل", phone: o.customerPhone || "", count: 0, spent: 0, last: o.createdAt };
    map[key].count++;
    if (!["cancelled", "refunded"].includes(o.status)) map[key].spent += Number(o.total);
    if (new Date(o.createdAt) > new Date(map[key].last)) map[key].last = o.createdAt;
  }
  let customers = Object.values(map).sort((a: any, b: any) => b.spent - a.spent);
  if (q.trim()) customers = customers.filter((c: any) => c.name.includes(q) || c.phone.includes(q));

  // ── الذكاء المحلي: تصنيف العملاء ──
  const badge = (c: any) => {
    const days = (Date.now() - new Date(c.last).getTime()) / 86400000;
    if (c.count >= 3) return { t: "👑 VIP", c: "#7c3aed", bg: "#f3e8ff" };
    if (days <= 14) return { t: "🔥 نشط", c: "#059669", bg: "#d1fae5" };
    if (days > 30) return { t: "💤 خامل", c: "#6b7280", bg: "#f3f4f6" };
    return { t: "🌱 جديد", c: "#d97706", bg: "#fef3c7" };
  };

  const totalSpent = customers.reduce((s: number, c: any) => s + c.spent, 0);
  const vip = customers.filter((c: any) => c.count >= 3).length;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <section className="flex-1">
          <h1 className="text-2xl font-black mb-4">👥 عملاء متجري</h1>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-2xl font-black text-purple-600">{customers.length}</div>
              <div className="text-xs text-gray-500">عميل</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-2xl font-black text-amber-600">{vip}</div>
              <div className="text-xs text-gray-500">عميل VIP</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-2xl font-black text-teal-600">{totalSpent.toLocaleString()}</div>
              <div className="text-xs text-gray-500">إجمالي المشتريات</div>
            </div>
          </div>

          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث بالاسم أو رقم الجوال..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 mb-4 focus:border-purple-400 outline-none" />

          {!customers.length && (
            <div className="glass rounded-3xl p-10 text-center text-gray-400">
              <div className="text-5xl mb-3">👥</div>
              لا يوجد عملاء بعد — سيظهرون هنا مع أول طلب
            </div>
          )}

          <div className="space-y-3">
            {customers.map((c: any, i: number) => {
              const b = badge(c);
              return (
                <div key={i} className="glass rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-lg shrink-0">
                    {c.name?.[0] || "؟"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{c.name}</div>
                    <div className="text-xs text-gray-400" dir="ltr">{c.phone || "—"}</div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="font-black text-teal-600 text-sm">{c.spent.toLocaleString()} {dsym()}</div>
                    <div className="text-xs text-gray-400">{c.count} طلب</div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0" style={{ color: b.c, background: b.bg }}>{b.t}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
