"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import { useCurrency } from '../../../lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || "";

// 🛒 السلات المهجورة — عملاء ملأوا سلالهم وغادروا دون إتمام الطلب
export default function AdminCartsPage() {
  const { list: CURS, def: defCur } = useCurrency();
  const dsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  const load = (query = q) =>
    api("/admin/carts/abandoned" + (query ? "?q=" + encodeURIComponent(query) : ""))
      .then(setData)
      .catch((e) => toast(e.message, "error"));
  useEffect(() => { load(""); }, []);

  const remind = async (g: any) => {
    setBusy(g.key);
    try {
      await api("/admin/carts/remind", { method: "POST", body: JSON.stringify({ customerId: g.customer?.id, storeId: g.store.id }) });
      toast(`🔔 أُرسل تذكير لـ ${g.customer.name} — سيظهر في إشعاراته`);
      await load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(""); }
  };

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>🛒 السلات المهجورة</h1>
          <p className="muted small" style={{ marginTop: "-.5rem", marginBottom: "1rem" }}>
            عملاء أضافوا منتجات لسلالهم وغادروا دون طلب منذ أكثر من ساعة — ذكّرهم بلمسة واحدة 🔔
          </p>

          {data && (
            <div className="grid-3" style={{ marginBottom: "1rem" }}>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{data.stats.carts}</div>
                <div className="muted small">🛒 سلة مهجورة</div>
              </div>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#dc2626" }}>{data.stats.value.toLocaleString()}</div>
                <div className="muted small">💰 قيمة مهددة بالضياع ({dsym()})</div>
              </div>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#059669" }}>{data.stats.registered}</div>
                <div className="muted small">👤 عملاء مسجلون (يمكن تذكيرهم)</div>
              </div>
            </div>
          )}

          <div className="row" style={{ marginBottom: "1rem" }}>
            <input placeholder="🔍 ابحث باسم عميل أو جواله أو متجر..." value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()} style={{ flex: 1 }} />
            <button className="btn primary" onClick={() => load()}>بحث</button>
          </div>

          {!data && <p className="muted" style={{ textAlign: "center", padding: "3rem" }}>⏳ جارٍ التحميل…</p>}
          {data && data.carts.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: ".5rem" }}>🎉</div>
              <b>لا سلات مهجورة الآن</b>
              <p className="muted small">كل من ملأ سلته أكمل طلبه — ممتاز!</p>
            </div>
          )}

          {(data?.carts || []).map((g: any) => (
            <div key={g.key} className="card" style={{ marginBottom: ".75rem" }}>
              <div className="row" style={{ cursor: "pointer" }} onClick={() => setOpen(open === g.key ? null : g.key)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{g.customer ? `👤 ${g.customer.name}` : "🕶️ زائر غير مسجل"}</b>
                  {g.customer && <span className="muted small" dir="ltr"> · {g.customer.phone}</span>}
                  <div className="muted small">
                    🏪 {g.store.name} · {g.items.length} {g.items.length === 1 ? "منتج" : "منتجات"} ·
                    آخر نشاط {new Date(g.updatedAt).toLocaleString("ar")}
                  </div>
                </div>
                <div style={{ textAlign: "left", flexShrink: 0 }}>
                  <b style={{ color: "#dc2626" }}>{g.total.toLocaleString()} {dsym()}</b>
                  {g.remindedAt && <div className="muted small">🔔 ذُكّر {new Date(g.remindedAt).toLocaleDateString("ar")}</div>}
                </div>
                <span className="muted">{open === g.key ? "▲" : "▼"}</span>
              </div>

              {open === g.key && (
                <div style={{ marginTop: ".75rem", borderTop: "1px solid #e5e7eb", paddingTop: ".75rem" }}>
                  {g.items.map((it: any, i: number) => (
                    <div key={i} className="row" style={{ padding: ".4rem 0", borderBottom: "1px dashed #f3f4f6" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: it.image ? `url(${API}${it.image}) center/cover` : "#e5e7eb", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b className="small">{it.name}</b>
                        {it.variant && <span className="muted small"> · {it.variant}</span>}
                        {!it.available && <span className="small" style={{ color: "#dc2626" }}> · ⚠️ لم يعد متاحاً</span>}
                      </div>
                      <span className="muted small">×{it.qty}</span>
                      <b className="small">{(it.price * it.qty).toLocaleString()}</b>
                    </div>
                  ))}
                  <div className="row" style={{ marginTop: ".75rem" }}>
                    {g.customer ? (
                      <button className="btn primary" disabled={busy === g.key} onClick={() => remind(g)}>
                        {busy === g.key ? "⏳…" : "🔔 أرسل تذكيراً لهذا العميل"}
                      </button>
                    ) : (
                      <span className="muted small">🕶️ زائر غير مسجل — لا يمكن إشعاره (التذكير للمسجلين فقط)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
