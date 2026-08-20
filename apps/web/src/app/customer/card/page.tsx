"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const TP_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "⏳ قيد المراجعة", cls: "pending" },
  approved: { label: "✅ معتمد", cls: "active" },
  rejected: { label: "❌ مرفوض", cls: "cancelled" },
};

export default function CustomerCardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [redeemForm, setRedeemForm] = useState({ cardNumber: "", pin: "" });
  const [gateways, setGateways] = useState<any[]>([]);
  const [proofForm, setProofForm] = useState({ amount: "", gatewayName: "" });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  const load = () => api("/customer/card").then(setData).catch((e) => toast(e.message, "error"));
  useEffect(() => {
    if (!getUser()) { router.push("/auth/customer-login"); return; }
    load();
    api("/v1/payments/gateways?scope=topup").then((g) => { setGateways(g); if (g[0]) setProofForm((f) => ({ ...f, gatewayName: g[0].name })); }).catch(() => {});
  }, []);

  const redeem = async () => {
    if (!redeemForm.cardNumber || !redeemForm.pin) return toast("⚠️ أدخل رقم البطاقة والرمز", "error");
    setBusy(true);
    try {
      const r = await api("/customer/card/redeem", { method: "POST", body: JSON.stringify(redeemForm) });
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
      await api("/customer/card/topup-proof", { method: "POST", body: JSON.stringify({ ...proofForm, amount: +proofForm.amount, proofImage: up.url }) });
      toast("✅ أُرسل طلب الشحن — سيُضاف الرصيد بعد المراجعة");
      setProofForm({ amount: "", gatewayName: gateways[0]?.name || "" });
      setProofFile(null);
      load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  if (!data) return null;
  const { card, topups, tips } = data;

  return (
    <div className="page">
      <main className="content" style={{ maxWidth: "40rem", margin: "0 auto" }}>
        <h1>💳 بطاقتي</h1>

        {/* البطاقة */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--primary), #14b8a6)", color: "#fff", textAlign: "center", padding: "2rem 1.5rem" }}>
          <p style={{ opacity: .85, fontSize: ".85rem" }}>💳 بطاقة يمن زون</p>
          <p dir="ltr" style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: 2, margin: ".5rem 0" }}>{card.cardNumber}</p>
          <p style={{ fontSize: "2rem", fontWeight: 900 }}>{Number(card.balance).toLocaleString()} <span style={{ fontSize: ".9rem" }}>ر.ي</span></p>
          <p style={{ opacity: .85, fontSize: ".8rem" }}>الرصيد المتاح</p>
        </div>

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
            <input type="number" placeholder="المبلغ المحوّل (ر.ي)" value={proofForm.amount} onChange={(e) => setProofForm({ ...proofForm, amount: e.target.value })} />
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
                <strong>+{Number(t.amount).toLocaleString()} ر.ي</strong>
                <span className={`badge ${TP_STATUS[t.status]?.cls}`}>{TP_STATUS[t.status]?.label}</span>
                <p className="muted small">{t.method} · {new Date(t.createdAt).toLocaleDateString("ar-YE")}</p>
              </div>
            </div>
          ))}
        </section>

        <a href="/customer" className="btn ghost" style={{ width: "100%", justifyContent: "center" }}>→ لوحة تحكمي</a>
      </main>
    </div>
  );
}
