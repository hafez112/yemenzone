"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SellerSidebar from "../../../components/SellerSidebar";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const WD_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "⏳ قيد المعالجة", cls: "pending" },
  paid: { label: "✅ حُوّل", cls: "active" },
  rejected: { label: "❌ مرفوض", cls: "cancelled" },
};

export default function SellerWalletPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [form, setForm] = useState({ amount: "", method: "الكريمي", accountInfo: "" });
  const [busy, setBusy] = useState(false);

  const load = () => api("/seller/wallet").then(setData).catch((e) => toast(e.message, "error"));
  useEffect(() => {
    if (!getUser()) { router.push("/auth/login"); return; }
    api("/stores/my").then(setStore).catch(() => router.push("/seller/setup"));
    load();
    api("/seller/finance/settlements").then(setSettlements).catch(() => {});
  }, []);

  const withdraw = async () => {
    if (!form.amount || !form.accountInfo.trim()) return toast("⚠️ أدخل المبلغ وبيانات الحساب", "error");
    setBusy(true);
    try {
      const r = await api("/seller/wallet/withdraw", { method: "POST", body: JSON.stringify({ ...form, amount: +form.amount }) });
      toast(r.message);
      setForm({ amount: "", method: "الكريمي", accountInfo: "" });
      load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  if (!store || !data) return null;
  const { wallet, transactions, withdrawals, tips } = data;

  return (
    <div className="page">
      <div className="layout">
        <SellerSidebar store={store} />
        <main className="content">
          <h1>💰 محفظتي</h1>

          {/* الرصيد */}
          <div className="card" style={{ background: "linear-gradient(135deg, #059669, #14b8a6)", color: "#fff", textAlign: "center", padding: "1.75rem" }}>
            <p style={{ opacity: .85, fontSize: ".85rem" }}>الرصيد المتاح للسحب</p>
            <p style={{ fontSize: "2.2rem", fontWeight: 900 }}>{Number(wallet.balance).toLocaleString()} <span style={{ fontSize: "1rem" }}>ر.ي</span></p>
            <p style={{ opacity: .85, fontSize: ".78rem" }}>تُضاف أرباح الطلبات المدفوعة إلكترونياً تلقائياً 💳</p>
          </div>

          {/* نصائح ذكية */}
          {tips?.length > 0 && (
            <section className="card ai-card">
              <h2>🤖 مساعد المحفظة</h2>
              {tips.map((t: any, i: number) => <p key={i}>{t.icon} {t.text}</p>)}
            </section>
          )}

          {/* طلب سحب */}
          <section className="card">
            <h2>💸 طلب سحب</h2>
            <input type="number" placeholder="المبلغ (أقل حد 1,000 ر.ي)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option>الكريمي</option>
              <option>جيب</option>
              <option>ون كاش</option>
              <option>حوالة بنكية</option>
            </select>
            <input placeholder="رقم الحساب / المحفظة للتحويل إليه" value={form.accountInfo} onChange={(e) => setForm({ ...form, accountInfo: e.target.value })} />
            <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={withdraw} disabled={busy}>
              {busy ? "⏳..." : "💸 إرسال طلب السحب"}
            </button>
            <p className="muted small">يُحجز المبلغ فوراً ويُحوّل خلال 24-48 ساعة — عند الرفض يعود لمحفظتك تلقائياً</p>
          </section>

          {/* طلبات السحب */}
          {withdrawals.length > 0 && (
            <section className="card">
              <h2>📤 طلبات السحب</h2>
              {withdrawals.map((wd: any) => (
                <div key={wd.id} className="assign-row">
                  <div>
                    <strong>{Number(wd.amount).toLocaleString()} ر.ي</strong>
                    <span className={`badge ${WD_STATUS[wd.status]?.cls}`}>{WD_STATUS[wd.status]?.label}</span>
                    <p className="muted small">{wd.method} · {new Date(wd.createdAt).toLocaleDateString("ar-YE")}{wd.note ? ` · ${wd.note}` : ""}</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 📋 كشوف التسوية */}
          {settlements.length > 0 && (
            <section className="card">
              <h2>📋 كشوف التسوية</h2>
              <p className="muted small">بيانات مالية دورية تصدرها الإدارة — المبيعات والعمولة والمرتجعات والصافي</p>
              {settlements.map((st: any) => (
                <div key={st.id} className="assign-row">
                  <div className="flex-1">
                    <b>{st.number}</b>{" "}
                    <span className={`badge ${st.status === "paid" ? "active" : "pending"}`}>{st.status === "paid" ? "✅ مسوّى" : "📋 صادر"}</span>
                    <p className="muted small">
                      {new Date(st.periodStart).toLocaleDateString("ar-YE")} ← {new Date(st.periodEnd).toLocaleDateString("ar-YE")} · {st.ordersCount} طلب
                    </p>
                    <p className="small">
                      مبيعات {Number(st.gross).toLocaleString()} · عمولة {Number(st.commission).toLocaleString()} · مرتجعات {Number(st.refunds).toLocaleString()} ·
                      صافي <b className="ok">{Number(st.net).toLocaleString()} ر.ي</b>
                    </p>
                  </div>
                  <a className="btn small ghost" href={`/settlement/${st.id}`} target="_blank">🖨️ طباعة</a>
                </div>
              ))}
            </section>
          )}

          {/* الحركات */}
          <section className="card">
            <h2>📜 حركات المحفظة</h2>
            {transactions.length === 0 ? <p className="muted">لا حركات بعد — ستظهر أرباح الطلبات المدفوعة هنا</p> : transactions.map((t: any) => (
              <div key={t.id} className="assign-row">
                <div>
                  <strong className={t.type === "credit" ? "ok" : "bad"}>{t.type === "credit" ? "+" : "−"}{Number(t.amount).toLocaleString()} ر.ي</strong>
                  <p className="muted small">{t.note || "—"} · {new Date(t.createdAt).toLocaleDateString("ar-YE")}</p>
                </div>
                <span className="badge">{t.type === "credit" ? "💰 إيداع" : "💸 خصم"}</span>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
