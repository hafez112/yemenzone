"use client";
import { useEffect, useState } from "react";
import SellerSidebar from "../../../components/SellerSidebar";
import { useRouter } from "next/navigation";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "مؤكد", processing: "قيد التجهيز", shipped: "في الطريق 🛵",
};

export default function SellerDeliveryPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [tab, setTab] = useState<"orders" | "drivers" | "companies">("orders");
  const [data, setData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [d, o, c] = await Promise.all([
        api("/seller/delivery/drivers"),
        api("/seller/delivery/orders"),
        api("/seller/delivery/companies"),
      ]);
      setData(d);
      setOrders(o || []);
      setCompanies(c.companies || []);
    } catch { toast("❌ تعذر تحميل بيانات التوصيل"); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (!getUser()) { router.push("/auth/login"); return; }
    api("/stores/my").then(setStore).catch(() => router.push("/seller/setup"));
    load();
  }, []);

  const assign = async (orderId: string, driverId: string | null) => {
    try {
      await api(`/seller/delivery/orders/${orderId}/assign`, { method: "PATCH", body: JSON.stringify({ driverId }) });
      toast(driverId ? "✅ تم تعيين السائق للطلب" : "↩️ تم إلغاء التعيين");
      load();
    } catch { toast("❌ تعذر تعيين السائق"); }
  };

  const toggleCompany = async (companyId: string, link: boolean) => {
    try {
      await api(`/seller/delivery/companies/${companyId}/link`, { method: "POST", body: JSON.stringify({ link }) });
      toast(link ? "✅ تم ربط الشركة بمتجرك" : "↩️ تم إلغاء الربط");
      load();
    } catch { toast("❌ تعذر تحديث الربط"); }
  };

  if (!store || loading) return <p className="muted center pt-24">⏳ جاري التحميل...</p>;

  return (
    <div className="page">
      <div className="layout">
        <SellerSidebar store={store} />
        <main className="content">
          <h1>🚚 إدارة التوصيل</h1>

          {/* 🤖 نصائح الذكاء المحلي */}
          {data?.tips?.length > 0 && (
            <section className="card ai-card">
              <h2>🤖 مساعد التوصيل الذكي</h2>
              {data.tips.map((t: any, i: number) => (
                <p key={i}>{t.icon} {t.text} {t.impact && <span className="impact">{t.impact}</span>}</p>
              ))}
              {data.eta && <p className="muted">⏱️ زمن التوصيل المتوقع: {data.eta.hours} ساعة — {data.eta.note}</p>}
            </section>
          )}

          {/* التبويبات */}
          <nav className="tabs">
            <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>📦 الطلبات {data?.unassigned ? <span className="count warn">{data.unassigned} بدون سائق</span> : null}</button>
            <button className={tab === "drivers" ? "active" : ""} onClick={() => setTab("drivers")}>🛵 السائقون</button>
            <button className={tab === "companies" ? "active" : ""} onClick={() => setTab("companies")}>🚚 شركات التوصيل</button>
          </nav>

          {/* الطلبات وتعيين السائقين */}
          {tab === "orders" && (
            <section className="card">
              <h2>📦 الطلبات النشطة</h2>
              {orders.length === 0 ? <p className="muted">لا توجد طلبات نشطة حالياً 🎉</p> : orders.map((o) => (
                <div key={o.id} className="assign-row">
                  <div>
                    <strong>{o.number}</strong> — {o.customerName} — {o.total} {o.currency}
                    <span className={`badge ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
                    {o.address && <p className="muted small">📍 {o.address}</p>}
                    {o.customerLat && o.customerLng && (
                      <a className="btn ghost small" style={{ marginTop: ".3rem", background: "#e0f2fe", color: "#0369a1", borderColor: "#bae6fd", textDecoration: "none" }}
                        target="_blank" href={`https://maps.google.com/?q=${o.customerLat},${o.customerLng}`}>
                        🗺️ موقع العميل — يظهر للسائق فور تعيينه
                      </a>
                    )}
                  </div>
                  <div className="row">
                    {o.driver ? (
                      <>
                        <span className="driver-chip">🛵 {o.driver.name}</span>
                        <a className="btn ghost small" href={`tel:${o.driver.phone}`}>📞</a>
                        <button className="btn ghost small" onClick={() => assign(o.id, null)}>↩️ إلغاء</button>
                      </>
                    ) : (
                      <select defaultValue="" onChange={(e) => e.target.value && assign(o.id, e.target.value)}>
                        <option value="" disabled>🛵 اختر سائقاً...</option>
                        {data?.suggested && <option value={data.suggested.id}>⭐ {data.suggested.name} (مرشح ذكي)</option>}
                        {data?.drivers?.filter((d: any) => d.id !== data.suggested?.id).map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name} — {d.activeOrders} طلب نشط</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
              {data?.reason && <p className="muted">{data.reason}</p>}
            </section>
          )}

          {/* السائقون */}
          {tab === "drivers" && (
            <section className="card">
              <h2>🛵 السائقون المتاحون</h2>
              {data?.drivers?.length === 0 ? <p className="muted">لا يوجد سائقون — أضفهم من لوحة الإدارة</p> : (
                <div className="grid-cards">
                  {data.drivers.map((d: any) => (
                    <div key={d.id} className={`driver-card ${data.suggested?.id === d.id ? "suggested" : ""}`}>
                      {data.suggested?.id === d.id && <span className="ai-badge">🤖 مرشح ذكي</span>}
                      {d.linked && <span className="ai-badge" style={{ background: "#059669" }}>🔗 مسند من الإدارة</span>}
                      <h3>{d.name}</h3>
                      <p>📞 {d.phone}</p>
                      <p>{d.vehicle ? `🛵 ${d.vehicle}` : "🚶 بدون وسيلة"} · 📍 {d.governorate || "—"}</p>
                      <div className="score-bar"><span style={{ width: `${d.score}%` }} /></div>
                      <p className="muted small">نشط الآن: {d.activeOrders} طلب · الدرجة: {d.score}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* شركات التوصيل */}
          {tab === "companies" && (
            <section className="card">
              <h2>🚚 شركات التوصيل</h2>
              {companies.length === 0 ? <p className="muted">لا توجد شركات مسجلة في المنصة بعد</p> : companies.map((c) => (
                <div key={c.id} className="assign-row">
                  <div>
                    <strong>{c.name}</strong>
                    {c.panelUrl && <a className="muted small" href={c.panelUrl} target="_blank"> 🔗 لوحة الشركة</a>}
                  </div>
                  <button className={`btn small ${c.linked ? "danger" : "primary"}`} onClick={() => toggleCompany(c.id, !c.linked)}>
                    {c.linked ? "↩️ إلغاء الربط" : "🔗 ربط بمتجري"}
                  </button>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
