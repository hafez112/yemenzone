"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const PURPOSE: Record<string, string> = { order: "🛒 طلب", subscription: "💎 اشتراك", ad: "📢 إعلان", topup: "💰 شحن محفظة", pservice: "🧩 خدمة منصة" };
const STATUS: Record<string, string> = { pending: "⏳ معلّقة", approved: "✅ معتمدة", rejected: "❌ مرفوضة" };
const emptyGateway = { id: "", name: "", provider: "bank", scopes: ["orders"], accountInfo: "", instructions: "", fee: 0, isActive: true, merchantId: "", apiUrl: "", apiKey: "", apiSecret: "" };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<"pending" | "all" | "gateways">("pending");
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [gForm, setGForm] = useState<any>({ ...emptyGateway });
  const [showGForm, setShowGForm] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [testing, setTesting] = useState("");
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const load = () => {
    api("/admin/payments/stats").then(setStats).catch((e) => toast(e.message, "error"));
    api("/admin/payment-gateways").then(setGateways).catch(() => {});
  };
  const loadPayments = (t = tab) =>
    api(`/admin/payments${t === "pending" ? "?status=pending" : ""}`).then(setPayments).catch((e) => toast(e.message, "error"));

  useEffect(() => { load(); loadPayments("pending"); }, []);

  const review = async (p: any, approve: boolean) => {
    // كل نوع دفعة له نقطة مراجعة: الاشتراك يفعّل الخطة، الإعلان يبث البانر فوراً
    const endpoint = p.purpose === "subscription"
      ? `/admin/payments/${p.id}/review-subscription`
      : p.purpose === "ad"
        ? `/admin/ads/review-payment/${p.id}`
        : `/admin/payments/${p.id}/review-order`;
    const body = { approve };
    try {
      await api(endpoint, { method: "PATCH", body: JSON.stringify(body) });
      toast(approve ? "✅ اعتُمدت الدفعة وأُشعر العميل 📨" : "❌ رُفضت الدفعة");
      load(); loadPayments();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const saveGateway = async () => {
    if (!gForm.name) return toast("⚠️ اسم البوابة مطلوب", "error");
    try {
      const body = { ...gForm };
      if (!body.id) delete body.id;
      await api("/admin/payment-gateways", { method: "POST", body: JSON.stringify(body) });
      toast("✅ تم حفظ البوابة");
      setGForm({ ...emptyGateway });
      setShowGForm(false);
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const toggleGateway = async (id: string) => {
    try { await api(`/admin/payment-gateways/${id}/toggle`, { method: "PATCH" }); toast("✅ تم التحديث"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const delGateway = async (id: string) => {
    if (!confirm("حذف هذه البوابة؟")) return;
    try { await api(`/admin/payment-gateways/${id}`, { method: "DELETE" }); toast("🗑️ تم الحذف"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  // 🔌 اختبار اتصال البوابة برابط API المضبوط
  const testGateway = async (id: string) => {
    setTesting(id);
    try {
      const r = await api(`/admin/payment-gateways/${id}/test`, { method: "POST" });
      setTestResults((prev) => ({ ...prev, [id]: r }));
      toast(r.ok ? "🟢 الاتصال ناجح" : "🔴 تعذر الاتصال", r.ok ? "success" : "error");
    } catch (e: any) { toast(e.message, "error"); }
    setTesting("");
  };

  const trustColor = (s: number) => s >= 80 ? "#059669" : s >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>💳 مركز المدفوعات</h1>

          {stats && (
            <>
              <div className="grid-cards" style={{ marginBottom: "1rem" }}>
                <div className="plan-card"><h3>⏳ معلّقة</h3><p className="price">{stats.pending}</p></div>
                <div className="plan-card"><h3>✅ اعتُمدت اليوم</h3><p className="price ok">{stats.approvedToday}</p></div>
                <div className="plan-card"><h3>💰 إجمالي معتمد</h3><p className="price">{stats.totalApproved.toLocaleString()}</p></div>
                <div className="plan-card"><h3>🏦 بوابات نشطة</h3><p className="price">{stats.gateways}</p></div>
              </div>
              <section className="card ai-card">
                <h2>🤖 نصائح المدفوعات</h2>
                {stats.tips.map((t: any, i: number) => <p key={i}>{t.icon} {t.text}</p>)}
              </section>
            </>
          )}

          <nav className="tabs">
            <button className={tab === "pending" ? "active" : ""} onClick={() => { setTab("pending"); loadPayments("pending"); }}>⏳ معلّقة {stats?.pending ? <span className="count warn">{stats.pending}</span> : null}</button>
            <button className={tab === "all" ? "active" : ""} onClick={() => { setTab("all"); loadPayments("all"); }}>📜 الكل</button>
            <button className={tab === "gateways" ? "active" : ""} onClick={() => setTab("gateways")}>🏦 البوابات</button>
          </nav>

          {/* المدفوعات */}
          {tab !== "gateways" && (
            payments.length === 0 ? <div className="empty-state">🎉 لا توجد دفعات هنا</div> : payments.map((p) => (
              <article key={p.id} className="card">
                <header className="row between">
                  <div>
                    <a href={`/receipt/${p.number}`} target="_blank" title="فتح سند الدفع"><strong className="underline decoration-purple-300 underline-offset-4">{p.number}</strong></a> <span className="badge">{PURPOSE[p.purpose] || p.purpose}</span>
                    <span className={`badge ${p.status}`}>{STATUS[p.status]}</span>
                    {p.ai && <span className="badge" style={{ background: "#f3f4f6", color: trustColor(p.ai.trustScore) }}>🤖 ثقة {p.ai.trustScore}%</span>}
                  </div>
                  <strong>{Number(p.amount).toLocaleString()} {p.currency}</strong>
                </header>
                <p className="small">💳 {p.method} · 👤 {p.payerId.slice(0, 20)} · 🕐 {new Date(p.createdAt).toLocaleString("ar-YE")}</p>
                {p.orderInfo && <p className="small">🛒 الطلب: {p.orderInfo.number} — {p.orderInfo.customer} — متجر {p.orderInfo.store}</p>}

                {/* التحليل الذكي */}
                {p.ai?.alerts?.map((a: any, i: number) => (
                  <p key={i} className={a.level === "danger" ? "bad small" : a.level === "warn" ? "small" : "ok small"}
                    style={a.level === "warn" ? { color: "#d97706" } : {}}>{a.text}</p>
                ))}

                <div className="row" style={{ marginTop: ".5rem" }}>
                  {p.proofImage && <button className="btn ghost small" onClick={() => setZoom(`${API_URL}${p.proofImage}`)}>🖼️ عرض الإثبات</button>}
                  {p.status === "pending" && <>
                    <button className="btn primary small" onClick={() => review(p, true)}>✅ اعتماد</button>
                    <button className="btn danger small" onClick={() => review(p, false)}>❌ رفض</button>
                  </>}
                </div>
              </article>
            ))
          )}

          {/* البوابات */}
          {tab === "gateways" && (
            <>
              <button className="btn primary" style={{ marginBottom: "1rem" }} onClick={() => { setGForm({ ...emptyGateway }); setShowGForm(!showGForm); }}>＋ بوابة جديدة</button>
              {showGForm && (
                <section className="card">
                  <h2>{gForm.id ? "✏️ تعديل بوابة" : "＋ بوابة دفع جديدة"}</h2>
                  <input placeholder="اسم البوابة (الكريمي / جيب / ون كاش...)" value={gForm.name} onChange={(e) => setGForm({ ...gForm, name: e.target.value })} />
                  <select value={gForm.provider} onChange={(e) => setGForm({ ...gForm, provider: e.target.value })}>
                    <option value="bank">🏦 بنك / حوالة</option>
                    <option value="wallet">📱 محفظة جوال</option>
                    <option value="card">💳 بطاقة</option>
                  </select>
                  <input placeholder="رقم الحساب / المحفظة" value={gForm.accountInfo} onChange={(e) => setGForm({ ...gForm, accountInfo: e.target.value })} />
                  <textarea rows={2} placeholder="تعليمات الدفع للعميل" value={gForm.instructions} onChange={(e) => setGForm({ ...gForm, instructions: e.target.value })}
                    style={{ width: "100%", padding: ".7rem", borderRadius: ".8rem", border: "1px solid #e5e7eb", fontFamily: "inherit", marginBottom: ".5rem" }} />
                  <input type="number" placeholder="رسوم ثابتة (0 = بدون)" value={gForm.fee} onChange={(e) => setGForm({ ...gForm, fee: +e.target.value })} />
                  <div style={{ background: "linear-gradient(135deg,#f3e8ff,#ccfbf1)", borderRadius: ".9rem", padding: ".8rem", marginBottom: ".5rem", border: "1px dashed #c4b5fd" }}>
                    <p className="small" style={{ fontWeight: 800, marginBottom: ".4rem" }}>⚡ الربط التلقائي (اختياري) — للتحقق من الدفع آلياً عبر API البنك/المحفظة</p>
                    <input placeholder="معرف التاجر (Merchant ID)" value={gForm.merchantId} onChange={(e) => setGForm({ ...gForm, merchantId: e.target.value })} dir="ltr" />
                    <input placeholder="رابط API البوابة (https://...)" value={gForm.apiUrl} onChange={(e) => setGForm({ ...gForm, apiUrl: e.target.value })} dir="ltr" />
                    <input placeholder="مفتاح API (API Key)" value={gForm.apiKey} onChange={(e) => setGForm({ ...gForm, apiKey: e.target.value })} dir="ltr" />
                    <input placeholder="المفتاح السري (API Secret)" type="password" value={gForm.apiSecret} onChange={(e) => setGForm({ ...gForm, apiSecret: e.target.value })} dir="ltr" style={{ marginBottom: 0 }} />
                    {gForm.id && <p className="small" style={{ margin: ".4rem 0 0", color: "#6d28d9" }}>🔐 الأسرار محفوظة مشفّرة — اترك الحقول فارغة للإبقاء على القيم الحالية</p>}
                  </div>
                  <p className="muted small">النطاقات:</p>
                  <div className="row" style={{ marginBottom: ".5rem" }}>
                    {["orders", "subscription", "topup"].map((sc) => (
                      <label key={sc} className="row small" style={{ gap: ".25rem" }}>
                        <input type="checkbox" style={{ width: "auto", marginBottom: 0 }}
                          checked={gForm.scopes.includes(sc)}
                          onChange={(e) => setGForm({ ...gForm, scopes: e.target.checked ? [...gForm.scopes, sc] : gForm.scopes.filter((x: string) => x !== sc) })} />
                        {PURPOSE[sc]}
                      </label>
                    ))}
                  </div>
                  <div className="row">
                    <button className="btn primary" onClick={saveGateway}>💾 حفظ</button>
                    <button className="btn ghost" onClick={() => setShowGForm(false)}>إلغاء</button>
                  </div>
                </section>
              )}
              <section className="card">
                <h2>🏦 البوابات ({gateways.length})</h2>
                {gateways.map((g) => (
                  <div key={g.id} className="assign-row">
                    <div>
                      <strong>{g.name}</strong>
                      <span className="badge">{g.provider === "bank" ? "🏦" : g.provider === "wallet" ? "📱" : "💳"} {g.provider}</span>
                      <span className={`badge ${g.isActive ? "active" : "cancelled"}`}>{g.isActive ? "نشطة" : "موقوفة"}</span>
                      {g.fee > 0 && <span className="badge">رسوم {g.fee}</span>}
                      {g.merchantId && <span className="badge" style={{ background: "#dbeafe", color: "#1e40af" }}>⚡ ربط تلقائي</span>}
                      <p className="muted small">{g.accountInfo || "—"} · نطاقات: {(g.scopes as string[]).map((s) => PURPOSE[s]).join("، ")}</p>
                      {g.stats && (
                        <p className="muted small" style={{ marginBottom: 0 }}>
                          💰 {g.stats.payments} عملية · معتمدة {g.stats.approvedAmount.toLocaleString()} ريال
                          {g.stats.pending > 0 && <> · ⏳ {g.stats.pending} بانتظار</>}
                        </p>
                      )}
                      {testResults[g.id] && (
                        <p className="small" style={{ marginBottom: 0, color: testResults[g.id].ok ? "#065f46" : "#991b1b" }}>
                          {testResults[g.id].ok ? "🟢" : "🔴"} {testResults[g.id].message}
                          {testResults[g.id].latencyMs != null && ` (${testResults[g.id].latencyMs}ms)`}
                        </p>
                      )}
                    </div>
                    <div className="row">
                      {g.apiUrl && <button className="btn small ghost" disabled={testing === g.id} onClick={() => testGateway(g.id)}>{testing === g.id ? "⏳" : "🔌 اختبار"}</button>}
                      <button className="btn small ghost" onClick={() => { setGForm({ ...g, accountInfo: g.accountInfo || "", instructions: g.instructions || "", merchantId: "", apiUrl: g.apiUrl || "", apiKey: "", apiSecret: "" }); setShowGForm(true); toast("🔐 الحقول السرية فارغة عمداً — اتركها فارغة للإبقاء على القيم الحالية"); }}>✏️</button>
                      <button className="btn small ghost" onClick={() => toggleGateway(g.id)}>{g.isActive ? "⏸️" : "▶️"}</button>
                      <button className="btn small danger" onClick={() => delGateway(g.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
        </main>
      </div>

      {/* عارض صورة الإثبات */}
      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", cursor: "zoom-out" }}>
          <img src={zoom} alt="إثبات الدفع" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "1rem" }} />
        </div>
      )}
    </div>
  );
}
