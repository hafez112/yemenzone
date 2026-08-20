"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const WD_STATUS: Record<string, string> = { pending: "⏳ معلّق", paid: "✅ حُوّل", rejected: "❌ مرفوض" };
const TP_STATUS: Record<string, string> = { pending: "⏳ معلّق", approved: "✅ معتمد", rejected: "❌ مرفوض" };

export default function AdminCardsPage() {
  const [tab, setTab] = useState<"cards" | "topups" | "withdrawals">("cards");
  const [stats, setStats] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [batchForm, setBatchForm] = useState({ name: "", count: 50, value: 5000 });
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [filterBatch, setFilterBatch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);

  const load = () => api("/admin/cards/stats").then(setStats).catch((e) => toast(e.message, "error"));
  const loadBatches = () => api("/admin/cards/batches").then(setBatches).catch(() => {});
  const loadCards = () => api(`/admin/cards?${filterBatch ? `batchId=${filterBatch}&` : ""}${filterStatus ? `status=${filterStatus}` : ""}`).then(setCards).catch(() => {});
  const loadTopups = () => api("/admin/topups").then(setTopups).catch(() => {});
  const loadWithdrawals = () => api("/admin/withdrawals").then(setWithdrawals).catch(() => {});

  useEffect(() => { load(); loadBatches(); loadTopups(); loadWithdrawals(); }, []);
  useEffect(() => { loadCards(); }, [filterBatch, filterStatus]);

  const createBatch = async () => {
    if (!batchForm.name || !batchForm.value) return toast("⚠️ أكمل بيانات الدفعة", "error");
    try {
      const r = await api("/admin/cards/batches", { method: "POST", body: JSON.stringify(batchForm) });
      toast(`🎫 وُلّدت ${r.generated} بطاقة بنجاح`);
      setShowBatchForm(false);
      setBatchForm({ name: "", count: 50, value: 5000 });
      load(); loadBatches(); loadCards();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const toggleCard = async (id: string) => {
    try { await api(`/admin/cards/${id}/toggle`, { method: "PATCH" }); toast("✅ تم التحديث"); loadCards(); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const reviewTopup = async (id: string, approve: boolean) => {
    try { await api(`/admin/topups/${id}/review`, { method: "PATCH", body: JSON.stringify({ approve }) }); toast(approve ? "✅ اعتُمد الشحن وأُضيف الرصيد" : "❌ رُفض"); loadTopups(); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const reviewWithdrawal = async (id: string, approve: boolean) => {
    if (approve && !confirm("تأكيد أنك حوّلت المبلغ للتاجر؟")) return;
    try { await api(`/admin/withdrawals/${id}/review`, { method: "PATCH", body: JSON.stringify({ approve }) }); toast(approve ? "✅ سُجّل التحويل" : "❌ رُفض وأُعيد المبلغ للمحفظة"); loadWithdrawals(); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const printBatch = (batchId: string, name: string) => {
    api(`/admin/cards?batchId=${batchId}`).then((list) => {
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html dir="rtl"><head><title>بطاقات ${name}</title><style>
        body{font-family:sans-serif;padding:20px} .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .card{border:2px dashed #6C3DF5;border-radius:12px;padding:14px;text-align:center}
        .num{font-weight:900;font-size:16px;direction:ltr} .pin{color:#6C3DF5;font-weight:900;direction:ltr}
        @media print{button{display:none}}</style></head><body>
        <h2>🎫 بطاقات يمن زون — ${name}</h2><div class="grid">
        ${list.map((c: any) => `<div class="card"><div class="num">${c.cardNumber}</div><div>الرمز: <span class="pin">${c.pin}</span></div><div>${Number(c.value).toLocaleString()} ر.ي</div></div>`).join("")}
        </div><button onclick="print()">🖨️ طباعة</button></body></html>`);
      w.document.close();
    });
  };

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>🎫 البطاقات والمحافظ</h1>

          {stats && (
            <>
              <div className="grid-cards" style={{ marginBottom: "1rem" }}>
                <div className="plan-card"><h3>🎫 بطاقات متاحة</h3><p className="price">{stats.unusedCards}</p></div>
                <div className="plan-card"><h3>✅ مستخدمة</h3><p className="price ok">{stats.usedCards}</p></div>
                <div className="plan-card"><h3>💳 أرصدة العملاء</h3><p className="price">{stats.cardsBalance.toLocaleString()}</p></div>
                <div className="plan-card"><h3>💰 محافظ التجار</h3><p className="price">{stats.walletsBalance.toLocaleString()}</p></div>
              </div>
              <section className="card ai-card">
                <h2>🤖 نصائح ذكية</h2>
                {stats.tips.map((t: any, i: number) => <p key={i}>{t.icon} {t.text}</p>)}
              </section>
            </>
          )}

          <nav className="tabs">
            <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}>🎫 البطاقات</button>
            <button className={tab === "topups" ? "active" : ""} onClick={() => setTab("topups")}>💰 طلبات الشحن {stats?.pendingTopups ? <span className="count warn">{stats.pendingTopups}</span> : null}</button>
            <button className={tab === "withdrawals" ? "active" : ""} onClick={() => setTab("withdrawals")}>💸 طلبات السحب {stats?.pendingWithdrawals ? <span className="count warn">{stats.pendingWithdrawals}</span> : null}</button>
          </nav>

          {/* البطاقات */}
          {tab === "cards" && (
            <>
              <button className="btn primary" style={{ marginBottom: "1rem" }} onClick={() => setShowBatchForm(!showBatchForm)}>＋ توليد دفعة بطاقات</button>
              {showBatchForm && (
                <section className="card">
                  <h2>🎫 دفعة بطاقات جديدة</h2>
                  <input placeholder="اسم الدفعة (مثال: دفعة رمضان 5000)" value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} />
                  <input type="number" placeholder="عدد البطاقات (حتى 500)" value={batchForm.count} onChange={(e) => setBatchForm({ ...batchForm, count: +e.target.value })} />
                  <input type="number" placeholder="قيمة البطاقة الواحدة (ر.ي)" value={batchForm.value} onChange={(e) => setBatchForm({ ...batchForm, value: +e.target.value })} />
                  <div className="row">
                    <button className="btn primary" onClick={createBatch}>⚡ توليد</button>
                    <button className="btn ghost" onClick={() => setShowBatchForm(false)}>إلغاء</button>
                  </div>
                </section>
              )}

              <section className="card">
                <h2>📦 الدفعات ({batches.length})</h2>
                {batches.map((b) => (
                  <div key={b.id} className="assign-row">
                    <div>
                      <strong>{b.name}</strong> — {b.count} بطاقة × {Number(b.value).toLocaleString()} ر.ي
                      <p className="muted small">{new Date(b.createdAt).toLocaleDateString("ar-YE")}</p>
                    </div>
                    <button className="btn small ghost" onClick={() => printBatch(b.id, b.name)}>🖨️ طباعة</button>
                  </div>
                ))}
              </section>

              <section className="card">
                <h2>🎫 البطاقات</h2>
                <div className="row" style={{ marginBottom: ".75rem" }}>
                  <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} style={{ marginBottom: 0, maxWidth: 220 }}>
                    <option value="">كل الدفعات</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ marginBottom: 0, maxWidth: 160 }}>
                    <option value="">كل الحالات</option>
                    <option value="unused">متاحة</option>
                    <option value="used">مستخدمة</option>
                    <option value="disabled">موقوفة</option>
                  </select>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>الرقم</th><th>الرمز</th><th>القيمة</th><th>الدفعة</th><th>الحالة</th><th></th></tr></thead>
                    <tbody>
                      {cards.map((c) => (
                        <tr key={c.id}>
                          <td dir="ltr"><strong>{c.cardNumber}</strong></td>
                          <td dir="ltr">{c.pin}</td>
                          <td>{Number(c.value).toLocaleString()}</td>
                          <td className="small">{c.batch?.name || "—"}</td>
                          <td><span className={`badge ${c.isDisabled ? "cancelled" : c.isUsed ? "shipped" : "active"}`}>{c.isDisabled ? "موقوفة" : c.isUsed ? "مستخدمة" : "متاحة"}</span></td>
                          <td>{!c.isUsed && <button className="btn small ghost" onClick={() => toggleCard(c.id)}>{c.isDisabled ? "▶️" : "⏸️"}</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* طلبات الشحن */}
          {tab === "topups" && (
            <section className="card">
              <h2>💰 طلبات شحن بطاقات العملاء</h2>
              {topups.length === 0 ? <p className="muted">لا توجد طلبات 🎉</p> : topups.map((t) => (
                <div key={t.id} className="assign-row">
                  <div>
                    <strong>{Number(t.amount).toLocaleString()} ر.ي</strong> — {t.customer?.name} ({t.customer?.phone})
                    <span className={`badge ${t.status}`}>{TP_STATUS[t.status]}</span>
                    <p className="muted small">{t.method} · بطاقة <span dir="ltr">{t.card?.cardNumber}</span></p>
                  </div>
                  <div className="row">
                    {t.proofImage && <button className="btn small ghost" onClick={() => setZoom(`${API_URL}${t.proofImage}`)}>🖼️</button>}
                    {t.status === "pending" && <>
                      <button className="btn small primary" onClick={() => reviewTopup(t.id, true)}>✅</button>
                      <button className="btn small danger" onClick={() => reviewTopup(t.id, false)}>❌</button>
                    </>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* طلبات السحب */}
          {tab === "withdrawals" && (
            <section className="card">
              <h2>💸 طلبات سحب التجار</h2>
              {withdrawals.length === 0 ? <p className="muted">لا توجد طلبات 🎉</p> : withdrawals.map((wd) => (
                <div key={wd.id} className="assign-row">
                  <div>
                    <strong>{Number(wd.amount).toLocaleString()} ر.ي</strong> — {wd.wallet?.seller?.name}
                    <span className={`badge ${wd.status === "paid" ? "active" : wd.status}`}>{WD_STATUS[wd.status]}</span>
                    <p className="muted small">{wd.method}: {wd.accountInfo} · {new Date(wd.createdAt).toLocaleDateString("ar-YE")}</p>
                  </div>
                  {wd.status === "pending" && (
                    <div className="row">
                      <button className="btn small primary" onClick={() => reviewWithdrawal(wd.id, true)}>✅ حوّلت</button>
                      <button className="btn small danger" onClick={() => reviewWithdrawal(wd.id, false)}>❌ رفض</button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </main>
      </div>

      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", cursor: "zoom-out" }}>
          <img src={zoom} alt="إثبات" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "1rem" }} />
        </div>
      )}
    </div>
  );
}
