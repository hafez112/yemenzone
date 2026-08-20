"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SellerSidebar from "../../../components/SellerSidebar";
import { api, getUser } from "../../../lib/api";
import FeatureLock from "../../../components/FeatureLock";

const TREND: Record<string, { label: string; color: string }> = {
  rising: { label: "📈 صاعد", color: "#059669" },
  stable: { label: "➡️ مستقر", color: "#d97706" },
  falling: { label: "📉 هابط", color: "#dc2626" },
  insufficient: { label: "⏳ بيانات غير كافية", color: "#6b7280" },
};
const STATUS: Record<string, string> = { pending: "جديدة", confirmed: "مؤكدة", processing: "قيد التجهيز", shipped: "في الطريق", delivered: "سُلّمت", completed: "مكتملة" };

export default function SellerFinancePage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!getUser()) { router.push("/auth/login"); return; }
    api("/stores/my").then(setStore).catch(() => router.push("/seller/setup"));
    api("/seller/finance").then(setData).catch(() => {}); // مغلقة للمجاني — تُدار عبر البوابة أدناه
  }, []);

  if (!store) return null;
  if (store.features && !store.features.finance) {
    return (
      <div className="page">
        <div className="layout">
          <SellerSidebar store={store} />
          <main className="content"><FeatureLock feature="finance" /></main>
        </div>
      </div>
    );
  }
  if (!data) return null;
  const maxMonthly = Math.max(...data.monthly.map((m: any) => m.total), 1);
  const trend = TREND[data.analysis.trend];
  const sym = data.store.symbol || "ر.ي";

  return (
    <div className="page">
      <div className="layout">
        <SellerSidebar store={store} />
        <main className="content">
          <h1>📊 تقريري المالي <span className="muted small">— آخر 6 أشهر</span></h1>

          <div className="grid-cards" style={{ marginBottom: "1rem" }}>
            <div className="plan-card"><h3>💰 إجمالي المبيعات</h3><p className="price">{data.totals.total.toLocaleString()} {sym}</p><p className="small muted">{data.totals.count} طلب</p></div>
            <div className="plan-card"><h3>📅 هذا الشهر</h3><p className="price">{data.totals.thisMonthTotal.toLocaleString()}</p><p className="small muted">{data.totals.thisMonthCount} طلب</p></div>
            <div className="plan-card"><h3>🛒 متوسط الطلب</h3><p className="price">{data.totals.avgOrder.toLocaleString()}</p></div>
            <div className="plan-card"><h3>💳 محفظتي</h3><p className="price ok">{data.wallet.balance.toLocaleString()}</p><a href="/seller/wallet" className="small" style={{ color: "var(--primary)" }}>إدارة المحفظة ←</a></div>
          </div>

          {/* الرسم الشهري */}
          <section className="card">
            <div className="row between">
              <h2>📊 المبيعات الشهرية</h2>
              <span className="badge" style={{ background: "#f3f4f6", color: trend.color }}>{trend.label}
                {data.analysis.growth != null && ` ${data.analysis.growth > 0 ? "+" : ""}${data.analysis.growth}%`}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: ".5rem", height: "10rem", padding: "1rem 0 .25rem" }}>
              {data.monthly.map((m: any, i: number) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: ".3rem", height: "100%", justifyContent: "flex-end" }}>
                  <span className="small" style={{ fontWeight: 800 }}>{m.total > 0 ? (m.total / 1000).toFixed(0) + "k" : ""}</span>
                  <div title={`${m.total.toLocaleString()} — ${m.count} طلب`}
                    style={{ width: "100%", height: `${Math.max((m.total / maxMonthly) * 100, 3)}%`, borderRadius: ".5rem .5rem 0 0", background: i === data.monthly.length - 1 ? "#059669" : "linear-gradient(180deg,#6ee7b7,#34d399)" }} />
                  <span className="small muted">{m.label.slice(0, 5)}</span>
                </div>
              ))}
            </div>
            {data.analysis.forecast != null && (
              <p className="muted small">🤖 التنبؤ للشهر القادم: <strong>{data.analysis.forecast.toLocaleString()} {sym}</strong></p>
            )}
          </section>

          {/* التفصيل */}
          <div className="grid-cards" style={{ marginBottom: "1rem" }}>
            <section className="card" style={{ marginBottom: 0 }}>
              <h2>طرق الدفع</h2>
              <p className="row between small"><span>💳 إلكتروني (يُودع محفظتك)</span><strong>{data.totals.electronic.toLocaleString()}</strong></p>
              <p className="row between small"><span>💵 كاش عند الاستلام</span><strong>{data.totals.cash.toLocaleString()}</strong></p>
              <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: ".4rem 0" }} />
              <p className="row between small muted"><span>عمولة المنصة ({data.commission}%) على الإلكتروني</span><strong>{data.commissionDue.toLocaleString()}</strong></p>
            </section>
            <section className="card" style={{ marginBottom: 0 }}>
              <h2>الطلبات حسب الحالة</h2>
              {Object.entries(data.byStatus).map(([k, v]: any) => (
                <p key={k} className="row between small"><span>{STATUS[k] || k}</span><strong>{v}</strong></p>
              ))}
            </section>
          </div>

          <section className="card ai-card">
            <h2>🤖 نصائح النمو</h2>
            {data.tips.map((t: any, i: number) => <p key={i}>{t.icon} {t.text}</p>)}
          </section>
        </main>
      </div>
    </div>
  );
}
