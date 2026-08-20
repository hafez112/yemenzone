"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

// 🔗 ربط السائقين وشركات التوصيل بمتاجر البائعين — الإدارة تسند والبائع يستخدم
export default function AdminDeliveryLinksPage() {
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  const load = (query = q) =>
    api("/admin/delivery/links" + (query ? "?q=" + encodeURIComponent(query) : ""))
      .then(setData)
      .catch((e) => toast(e.message, "error"));
  useEffect(() => { load(""); }, []);

  const toggle = async (storeId: string, kind: "company" | "driver", id: string, link: boolean) => {
    setBusy(kind + id);
    try {
      await api(`/admin/delivery/links/${storeId}/${kind}`, { method: "POST", body: JSON.stringify({ [kind === "company" ? "companyId" : "driverId"]: id, link }) });
      toast(link ? "🔗 تم الربط — أُشعر البائع فوراً" : "✂️ تم فك الربط");
      await load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(""); }
  };

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>🔗 ربط التوصيل بالمتاجر</h1>
          <p className="muted small" style={{ marginTop: "-.5rem", marginBottom: "1rem" }}>
            أسند السائقين وشركات التوصيل لكل متجر — ما تربطه هنا يظهر للبائع في لوحته ويقيّد تعيينه بالسائقين المسندين
          </p>

          <div className="row" style={{ marginBottom: "1rem" }}>
            <input placeholder="🔍 ابحث باسم متجر أو نطاقه..." value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()} style={{ flex: 1 }} />
            <button className="btn primary" onClick={() => load()}>بحث</button>
          </div>

          {data && (
            <p className="muted small" style={{ marginBottom: ".75rem" }}>
              🛵 {data.drivers.length} سائق نشط · 🚚 {data.companies.length} شركة نشطة · 🏪 {data.stores.length} متجر
            </p>
          )}

          {(data?.stores || []).map((s: any) => (
            <section key={s.id} className="card" style={{ marginBottom: ".75rem" }}>
              <div className="assign-row" style={{ cursor: "pointer" }} onClick={() => setOpen(open === s.id ? null : s.id)}>
                <div className="flex-1">
                  <b>{s.name}</b>{" "}
                  <span className={`badge ${s.status === "active" ? "active" : "cancelled"}`}>{s.status === "active" ? "نشط" : "موقوف"}</span>
                  <div className="text-xs muted">
                    {s.slug}.yemenzone.com · {s.governorate || "—"} · 👤 {s.sellerName} {s.sellerPhone ? `(${s.sellerPhone})` : ""}
                  </div>
                </div>
                <span className="badge" style={{ background: "#ede9fe", color: "#6d28d9" }}>🛵 {s.driverIds.length}</span>
                <span className="badge" style={{ background: "#d1fae5", color: "#065f46" }}>🚚 {s.companyIds.length}</span>
                <button className="btn small ghost">{open === s.id ? "▲ إغلاق" : "▼ إدارة الربط"}</button>
              </div>

              {open === s.id && (
                <div style={{ marginTop: ".75rem", borderTop: "1px dashed #e5e7eb", paddingTop: ".75rem" }}>
                  <h3 style={{ fontSize: ".9rem", fontWeight: 900, marginBottom: ".5rem" }}>🛵 السائقون المسندون للمتجر</h3>
                  <div className="flex flex-wrap gap-2" style={{ marginBottom: "1rem" }}>
                    {data.drivers.map((d: any) => {
                      const on = s.driverIds.includes(d.id);
                      return (
                        <button key={d.id} disabled={busy === "driver" + d.id}
                          className="badge cursor-pointer"
                          style={{ background: on ? "#059669" : "#f3f4f6", color: on ? "#fff" : "#374151", opacity: busy === "driver" + d.id ? .5 : 1 }}
                          onClick={() => toggle(s.id, "driver", d.id, !on)}>
                          {on ? "✅ " : ""}{d.name} {d.governorate ? `· ${d.governorate}` : ""} {d.vehicle ? `(${d.vehicle})` : ""}
                        </button>
                      );
                    })}
                    {data.drivers.length === 0 && <span className="muted small">لا سائقين نشطين — أضفهم من صفحة السائقين</span>}
                  </div>

                  <h3 style={{ fontSize: ".9rem", fontWeight: 900, marginBottom: ".5rem" }}>🚚 شركات التوصيل المرتبطة</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.companies.map((c: any) => {
                      const on = s.companyIds.includes(c.id);
                      return (
                        <button key={c.id} disabled={busy === "company" + c.id}
                          className="badge cursor-pointer"
                          style={{ background: on ? "#0d9488" : "#f3f4f6", color: on ? "#fff" : "#374151", opacity: busy === "company" + c.id ? .5 : 1 }}
                          onClick={() => toggle(s.id, "company", c.id, !on)}>
                          {on ? "✅ " : ""}{c.name}
                        </button>
                      );
                    })}
                    {data.companies.length === 0 && <span className="muted small">لا شركات نشطة — أضفها من صفحة شركات التوصيل</span>}
                  </div>
                </div>
              )}
            </section>
          ))}
          {data && data.stores.length === 0 && (
            <section className="card" style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>لا متاجر مطابقة للبحث</section>
          )}
        </main>
      </div>
    </div>
  );
}
