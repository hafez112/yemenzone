"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import { loadCurrencies, convertAmount, type Cur } from "@/lib/currency";

const TP_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "⏳ قيد المراجعة", cls: "pending" },
  approved: { label: "✅ معتمد", cls: "active" },
  rejected: { label: "❌ مرفوض", cls: "cancelled" },
};

// 💳 لوحة بطاقة يمن زون الموحدة — تعمل للعميل (/customer/card) والبائع (/seller/card)
// رصيد + شحن + بيانات المالك + طلب تعديل البيانات إلى الإدارة
export default function CardPanel({ base, backHref, backLabel }: { base: string; backHref: string; backLabel: string }) {
  const [data, setData] = useState<any>(null);
  const [redeemForm, setRedeemForm] = useState({ cardNumber: "", pin: "" });
  const [gateways, setGateways] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<Cur[]>([]);
  const [proofForm, setProofForm] = useState({ amount: "", gatewayName: "", currency: "" });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [editForm, setEditForm] = useState({ holderName: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  const load = () => api(base).then(setData).catch((e) => toast(e.message, "error"));
  useEffect(() => {
    load();
    api("/v1/payments/gateways?scope=topup").then((g) => { setGateways(g); if (g[0]) setProofForm((f) => ({ ...f, gatewayName: g[0].name })); }).catch(() => {});
    loadCurrencies().then((list) => {
      setCurrencies(list);
      const def = list.find((c) => c.isDefault) || list[0];
      if (def) setProofForm((f) => (f.currency ? f : { ...f, currency: def.code }));
    }).catch(() => {});
  }, []);

  const redeem = async () => {
    if (!redeemForm.cardNumber || !redeemForm.pin) return toast("⚠️ أدخل رقم البطاقة والرمز", "error");
    setBusy(true);
    try {
      const r = await api(`${base}/redeem`, { method: "POST", body: JSON.stringify(redeemForm) });
      toast(r.message);
      setRedeemForm({ cardNumber: "", pin: "" });
      load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const topupProof = async () => {
    if (!proofForm.amount || !proofFile) return toast("⚠️ أدخل المبلغ واختر صورة الإثبات", "error");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", proofFile);
      const up = await fetch(`${API}/api/v1/payments/upload-proof`, { method: "POST", body: fd }).then((r) => r.json());
      if (!up.url) throw new Error(up.message || "فشل الرفع");
      await api(`${base}/topup-proof`, { method: "POST", body: JSON.stringify({ ...proofForm, amount: +proofForm.amount, proofImage: up.url }) });
      toast("✅ أُرسل طلب الشحن — سيُضاف الرصيد بعد المراجعة");
      setProofForm({ amount: "", gatewayName: gateways[0]?.name || "", currency: proofForm.currency });
      setProofFile(null);
      load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  // 📝 إرسال طلب تعديل بيانات البطاقة إلى الإدارة
  const sendEdit = async () => {
    if (!editForm.holderName.trim() && !editForm.phone.trim()) return toast("⚠️ أدخل الاسم أو رقم الجوال المطلوب", "error");
    setBusy(true);
    try {
      const r = await api(`${base}/edit-request`, { method: "POST", body: JSON.stringify(editForm) });
      toast(r.message);
      setEditForm({ holderName: "", phone: "", message: "" });
      load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  if (!data) return null;
  const { card, topups, editRequests = [], tips } = data;

  // 💱 رموز العملات — بطاقة المستخدم بعملتها الأصلية، والسجلات بعملاتها المحفوظة
  const curSymbol = (code?: string) => currencies.find((c) => c.code === code)?.symbol || code || "ر.ي";
  const cardSym = curSymbol(card.currency);
  // تقدير فوري: ما سيُضاف فعلاً لبطاقتك بعد تحويل عملة التحويل إلى عملة البطاقة
  const fromCur = currencies.find((c) => c.code === proofForm.currency);
  const cardCur = currencies.find((c) => c.code === card.currency);
  const estCredit = proofForm.amount && fromCur && cardCur ? convertAmount(+proofForm.amount, fromCur, cardCur) : null;

  return (
    <div className="page">
      <main className="content" style={{ maxWidth: "40rem", margin: "0 auto" }}>
        <h1>💳 بطاقتي</h1>

        {/* البطاقة */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--primary), #14b8a6)", color: "#fff", textAlign: "center", padding: "2rem 1.5rem" }}>
          <p style={{ opacity: .85, fontSize: ".85rem" }}>💳 بطاقة يمن زون</p>
          <p dir="ltr" style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: 2, margin: ".5rem 0" }}>{card.cardNumber}</p>
          <p style={{ fontSize: "2rem", fontWeight: 900 }}>{Number(card.balance).toLocaleString()} <span style={{ fontSize: ".9rem" }}>{cardSym}</span></p>
          <p style={{ opacity: .85, fontSize: ".8rem" }}>الرصيد المتاح</p>
          {!card.isActive && (
            <p style={{ marginTop: ".6rem", background: "rgba(220,38,38,.25)", borderRadius: "999px", padding: ".3rem .9rem", display: "inline-block", fontSize: ".8rem", fontWeight: 800 }}>
              ⛔ البطاقة موقوفة من الإدارة
            </p>
          )}
        </div>

        {/* 👤 بيانات صاحب البطاقة */}
        <section className="card">
          <h2>👤 بيانات البطاقة</h2>
          <div style={{ background: "#f9fafb", borderRadius: ".8rem", padding: ".8rem", fontSize: ".9rem", marginBottom: ".8rem" }}>
            <div>الاسم: <strong>{card.holderName || "—"}</strong></div>
            <div style={{ marginTop: ".3rem" }}>الجوال المرتبط: <strong dir="ltr">{card.phone || "—"}</strong></div>
          </div>

          {/* 📝 طلب تعديل البيانات */}
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: ".9rem" }}>📝 طلب تعديل البيانات من الإدارة</summary>
            <div style={{ marginTop: ".7rem", display: "grid", gap: ".5rem" }}>
              <input placeholder="الاسم الجديد (اتركه فارغاً إن لم يتغير)" value={editForm.holderName}
                onChange={(e) => setEditForm({ ...editForm, holderName: e.target.value })} />
              <input dir="ltr" placeholder="رقم الجوال الجديد" value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              <textarea placeholder="رسالة للإدارة (اختياري) — سبب التعديل" value={editForm.message}
                onChange={(e) => setEditForm({ ...editForm, message: e.target.value })} rows={2} />
              <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={sendEdit} disabled={busy}>
                {busy ? "⏳..." : "📨 إرسال الطلب للإدارة"}
              </button>
            </div>
          </details>

          {/* حالة طلبات التعديل */}
          {editRequests.length > 0 && (
            <div style={{ marginTop: ".8rem" }}>
              {editRequests.map((r: any) => (
                <div key={r.id} className="assign-row">
                  <div style={{ fontSize: ".85rem" }}>
                    <strong>تعديل: {r.holderName ? `الاسم ← ${r.holderName} ` : ""}{r.phone ? `الجوال ← ${r.phone}` : ""}</strong>
                    <span className={`badge ${TP_STATUS[r.status]?.cls}`}>{TP_STATUS[r.status]?.label}</span>
                    <p className="muted small">{new Date(r.createdAt).toLocaleDateString("ar-YE")}{r.adminNote ? ` · رد الإدارة: ${r.adminNote}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* نصائح ذكية */}
        {tips?.length > 0 && (
          <section className="card ai-card">
            <h2>🤖 مساعد البطاقة</h2>
            {tips.map((t: any, i: number) => <p key={i}>{t.icon} {t.text}</p>)}
          </section>
        )}

        {/* شحن ببطاقة */}
        <section className="card">
          <h2>🎫 شحن ببطاقة يمن زون</h2>
          <input dir="ltr" placeholder="YZ-0000-0000-0000" value={redeemForm.cardNumber}
            onChange={(e) => setRedeemForm({ ...redeemForm, cardNumber: e.target.value.toUpperCase() })} />
          <input dir="ltr" type="password" inputMode="numeric" placeholder="الرمز السري (6 أرقام)" value={redeemForm.pin}
            onChange={(e) => setRedeemForm({ ...redeemForm, pin: e.target.value })} />
          <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={redeem} disabled={busy}>
            {busy ? "⏳..." : "⚡ شحن فوري"}
          </button>
          <p className="muted small">تُباع البطاقات لدى الوكلاء المعتمدين — الشحن فوري وآمن</p>
        </section>

        {/* شحن عبر بوابة */}
        {gateways.length > 0 && (
          <section className="card">
            <h2>🏦 شحن عبر تحويل</h2>
            <select value={proofForm.gatewayName} onChange={(e) => setProofForm({ ...proofForm, gatewayName: e.target.value })}>
              {gateways.map((g) => <option key={g.id} value={g.name}>{g.provider === "bank" ? "🏦" : "📱"} {g.name}</option>)}
            </select>
            {gateways.find((g) => g.name === proofForm.gatewayName) && (
              <p className="muted small" style={{ background: "#f9fafb", padding: ".6rem", borderRadius: ".6rem" }}>
                📌 {gateways.find((g) => g.name === proofForm.gatewayName)?.accountInfo} — {gateways.find((g) => g.name === proofForm.gatewayName)?.instructions}
              </p>
            )}
            <div style={{ display: "flex", gap: ".5rem" }}>
              <input type="number" placeholder="المبلغ المحوّل" value={proofForm.amount} onChange={(e) => setProofForm({ ...proofForm, amount: e.target.value })} style={{ flex: 1 }} />
              {currencies.length > 0 && (
                <select value={proofForm.currency} onChange={(e) => setProofForm({ ...proofForm, currency: e.target.value })} style={{ width: "7.5rem" }}>
                  {currencies.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>)}
                </select>
              )}
            </div>
            {/* 💱 تقدير فوري لما سيُضاف لبطاقتك إن كانت عملة التحويل مختلفة */}
            {estCredit != null && proofForm.currency !== card.currency && (
              <p className="muted small" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: ".6rem", borderRadius: ".6rem", color: "#166534" }}>
                💱 سيُضاف لبطاقتك ≈ <strong>{estCredit.toLocaleString()} {cardSym}</strong> بسعر صرف الإدارة الحالي
              </p>
            )}
            <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} style={{ padding: ".5rem" }} />
            <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={topupProof} disabled={busy}>
              {busy ? "⏳..." : "📤 إرسال طلب الشحن"}
            </button>
          </section>
        )}

        {/* سجل الشحن */}
        <section className="card">
          <h2>📜 سجل الشحن</h2>
          {topups.length === 0 ? <p className="muted">لا عمليات شحن بعد</p> : topups.map((t: any) => (
            <div key={t.id} className="assign-row">
              <div>
                <strong>+{Number(t.creditedAmount ?? t.amount).toLocaleString()} {cardSym}</strong>
                <span className={`badge ${TP_STATUS[t.status]?.cls}`}>{TP_STATUS[t.status]?.label}</span>
                <p className="muted small">
                  {t.method}
                  {t.currency && t.currency !== card.currency ? ` · حوّلت ${Number(t.amount).toLocaleString()} ${curSymbol(t.currency)}` : ""}
                  {" · "}{new Date(t.createdAt).toLocaleDateString("ar-YE")}
                </p>
              </div>
            </div>
          ))}
        </section>

        <a href={backHref} className="btn ghost" style={{ width: "100%", justifyContent: "center" }}>→ {backLabel}</a>
      </main>
    </div>
  );
}
