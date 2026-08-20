"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const PURPOSE: Record<string, string> = { order: "🛒 طلبات", subscription: "💎 اشتراكات", topup: "💰 شحن", pservice: "🧩 خدمات منصة" };
const METHOD: Record<string, string> = { card: "💳 بطاقة", gateway: "🏦 بوابات", cash: "💵 كاش", transfer: "📤 تحويل" };
const TREND: Record<string, { label: string; color: string }> = {
  rising: { label: "📈 صاعد", color: "#059669" },
  stable: { label: "➡️ مستقر", color: "#d97706" },
  falling: { label: "📉 هابط", color: "#dc2626" },
  insufficient: { label: "⏳ بيانات غير كافية", color: "#6b7280" },
};
const KIND_AR: Record<string, { label: string; color: string }> = {
  payment: { label: "💳 دفعة", color: "#059669" },
  wallet: { label: "👛 محفظة", color: "#7c3aed" },
  withdrawal: { label: "💸 سحب", color: "#dc2626" },
  topup: { label: "💰 شحن بطاقة", color: "#d97706" },
  expense: { label: "📤 مصروف", color: "#b91c1c" },
};
const EXP_CATS: Record<string, string> = { hosting: "🖥️ استضافة وخوادم", marketing: "📣 تسويق", salaries: "👥 رواتب", fees: "🏦 رسوم بنكية", other: "📦 أخرى" };
const fmt = (n: number) => Number(n || 0).toLocaleString();

export default function AdminFinancePage() {
  const [tab, setTab] = useState<"overview" | "journal" | "income" | "balance" | "settlements" | "expenses" | "tax" | "currencies">("overview");
  const [data, setData] = useState<any>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [commission, setCommission] = useState("");
  const [editingRate, setEditingRate] = useState<Record<string, string>>({});
  const [newCur, setNewCur] = useState({ code: "", name: "", symbol: "", rateToUsd: "" });
  const [showNew, setShowNew] = useState(false);
  // 📒 دفتر اليومية
  const [journal, setJournal] = useState<any>(null);
  const [jFilter, setJFilter] = useState({ kind: "", from: "", to: "" });
  // 💸 المصروفات
  const [expenses, setExpenses] = useState<any>(null);
  const [expFilter, setExpFilter] = useState({ category: "", month: "" });
  const [newExp, setNewExp] = useState({ title: "", category: "hosting", amount: "", note: "", spentAt: "" });
  const [showExpForm, setShowExpForm] = useState(false);
  // بقية التقارير
  const [income, setIncome] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  // 📋 كشوف التسوية الفعلية + تقرير العمولات
  const [stList, setStList] = useState<any[]>([]);
  const [commReport, setCommReport] = useState<any>(null);
  const [stQ, setStQ] = useState("");
  const [genForm, setGenForm] = useState({ sellerId: "", from: "", to: "" });
  const [showGen, setShowGen] = useState(false);
  const [storeRate, setStoreRate] = useState<Record<string, string>>({});
  const [tax, setTax] = useState<any>(null);

  const load = () => {
    api("/admin/finance/overview").then((d) => { setData(d); setCommission(String(d.commission)); }).catch((e) => toast(e.message, "error"));
    api("/admin/currencies").then(setCurrencies).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const loadJournal = () => {
    const q = new URLSearchParams(Object.entries(jFilter).filter(([, v]) => v) as any).toString();
    api("/admin/finance/journal" + (q ? "?" + q : "")).then(setJournal).catch((e) => toast(e.message, "error"));
  };
  const loadExpenses = () => {
    const q = new URLSearchParams(Object.entries(expFilter).filter(([, v]) => v) as any).toString();
    api("/admin/finance/expenses" + (q ? "?" + q : "")).then(setExpenses).catch((e) => toast(e.message, "error"));
  };
  useEffect(() => {
    if (tab === "journal") loadJournal();
    if (tab === "expenses") loadExpenses();
    if (tab === "income" && !income) api("/admin/finance/income-statement").then(setIncome).catch((e) => toast(e.message, "error"));
    if (tab === "balance" && !balance) api("/admin/finance/balance-sheet").then(setBalance).catch((e) => toast(e.message, "error"));
    if (tab === "settlements" && !settlements.length) api("/admin/finance/settlements").then(setSettlements).catch((e) => toast(e.message, "error"));
    if (tab === "settlements") loadSt();
    if (tab === "tax" && !tax) api("/admin/finance/tax-report").then(setTax).catch((e) => toast(e.message, "error"));
  }, [tab]);

  // 📥 تصدير دفتر اليومية
  const exportJournal = async () => {
    try {
      const q = new URLSearchParams(Object.entries(jFilter).filter(([, v]) => v) as any).toString();
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "") + "/api/admin/finance/journal-export" + (q ? "?" + q : ""), {
        headers: { Authorization: "Bearer " + (localStorage.getItem("yz_token") || "") },
      });
      if (!res.ok) throw new Error("فشل التصدير");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "journal.csv"; a.click();
      URL.revokeObjectURL(url);
      toast("✅ تم تصدير دفتر اليومية");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const addExpense = async () => {
    if (!newExp.title.trim() || !newExp.amount) return toast("⚠️ البيان والمبلغ مطلوبان", "error");
    try {
      await api("/admin/finance/expenses", { method: "POST", body: JSON.stringify({ ...newExp, amount: +newExp.amount, spentAt: newExp.spentAt || undefined }) });
      toast("✅ سُجّل المصروف");
      setNewExp({ title: "", category: "hosting", amount: "", note: "", spentAt: "" });
      setShowExpForm(false);
      setIncome(null); setBalance(null); setTax(null);
      loadExpenses();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("حذف هذا القيد من المصروفات؟")) return;
    try {
      await api("/admin/finance/expenses/" + id, { method: "DELETE" });
      toast("🗑️ حُذف القيد");
      setIncome(null); setBalance(null); setTax(null);
      loadExpenses();
    } catch (e: any) { toast(e.message, "error"); }
  };

  // 📋 كشوف التسوية
  const loadSt = (query = stQ) => {
    api("/admin/finance/settlements/list" + (query ? "?q=" + encodeURIComponent(query) : "")).then(setStList).catch((e) => toast(e.message, "error"));
    api("/admin/finance/commission-report").then(setCommReport).catch(() => {});
  };

  const generateSt = async () => {
    if (!genForm.sellerId) return toast("⚠️ اختر البائع", "error");
    try {
      const st = await api("/admin/finance/settlements/generate", { method: "POST", body: JSON.stringify({ sellerId: genForm.sellerId, from: genForm.from || undefined, to: genForm.to || undefined }) });
      toast(`✅ صدر الكشف ${st.number} — أُشعر البائع`);
      setShowGen(false);
      setGenForm({ sellerId: "", from: "", to: "" });
      loadSt("");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const paySt = async (id: string, number: string) => {
    if (!confirm(`تأكيد تسوية الكشف ${number}؟ يعني أن الحساب مع البائع أُغلق`)) return;
    try { await api(`/admin/finance/settlements/${id}/pay`, { method: "PATCH" }); toast("✅ سُوّي الكشف وأُشعر البائع"); loadSt(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const exportSt = async (id: string, number: string) => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "") + `/api/admin/finance/settlements/${id}/export`, {
        headers: { Authorization: "Bearer " + (localStorage.getItem("yz_token") || "") },
      });
      if (!res.ok) throw new Error("فشل التصدير");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `settlement-${number}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast("📥 صُدّر الكشف CSV");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const saveStoreRate = async (storeId: string) => {
    const raw = (storeRate[storeId] ?? "").trim();
    try {
      await api(`/admin/finance/commission/store/${storeId}`, { method: "PATCH", body: JSON.stringify({ percent: raw === "" ? null : +raw }) });
      toast(raw === "" ? "↩️ عاد المتجر للنسبة العامة" : "🎯 حُدّدت عمولة مخصصة للمتجر");
      loadSt();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const saveCommission = async () => {
    try {
      await api("/admin/finance/commission", { method: "POST", body: JSON.stringify({ percent: +commission }) });      toast("✅ حُدّثت العمولة");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const saveRate = async (code: string) => {
    const rate = +(editingRate[code] || 0);
    if (!rate) return toast("⚠️ أدخل سعراً صحيحاً", "error");
    try { await api(`/admin/currencies/${code}/rate`, { method: "PATCH", body: JSON.stringify({ rate }) }); toast(`✅ حُدّث سعر ${code}`); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const toggleCur = async (code: string) => {
    try { await api(`/admin/currencies/${code}/toggle`, { method: "PATCH" }); toast("✅ تم التحديث"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const setDefault = async (code: string) => {
    try { await api(`/admin/currencies/${code}/default`, { method: "PATCH" }); toast(`✅ ${code} أصبحت الافتراضية`); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const addCurrency = async () => {
    if (!newCur.code || !newCur.name || !newCur.symbol || !newCur.rateToUsd) return toast("⚠️ أكمل كل الحقول", "error");
    try {
      await api("/admin/currencies", { method: "POST", body: JSON.stringify({ ...newCur, rateToUsd: +newCur.rateToUsd }) });
      toast("✅ أُضيفت العملة");
      setNewCur({ code: "", name: "", symbol: "", rateToUsd: "" });
      setShowNew(false);
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const maxMonthly = data ? Math.max(...data.monthly.map((m: any) => m.total), 1) : 1;
  const trend = data ? TREND[data.analysis.trend] : null;

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>💹 المركز المالي</h1>

          <nav className="tabs">
            <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>📊 النظرة العامة</button>
            <button className={tab === "journal" ? "active" : ""} onClick={() => setTab("journal")}>📒 دفتر اليومية</button>
            <button className={tab === "income" ? "active" : ""} onClick={() => setTab("income")}>📈 قائمة الدخل</button>
            <button className={tab === "balance" ? "active" : ""} onClick={() => setTab("balance")}>⚖️ المركز المالي</button>
            <button className={tab === "settlements" ? "active" : ""} onClick={() => setTab("settlements")}>🤝 التسويات</button>
            <button className={tab === "expenses" ? "active" : ""} onClick={() => setTab("expenses")}>💸 المصروفات</button>
            <button className={tab === "tax" ? "active" : ""} onClick={() => setTab("tax")}>🧾 الزكاة والضرائب</button>
            <button className={tab === "currencies" ? "active" : ""} onClick={() => setTab("currencies")}>💱 العملات</button>
          </nav>

          {tab === "overview" && data && (
            <>
              <div className="grid-cards" style={{ marginBottom: "1rem" }}>
                <div className="plan-card"><h3>💰 إيرادات كل الأوقات</h3><p className="price">{data.allTime.total.toLocaleString()}</p><p className="small muted">{data.allTime.count} دفعة</p></div>
                <div className="plan-card"><h3>📅 آخر 6 أشهر</h3><p className="price">{data.sixMonths.total.toLocaleString()}</p><p className="small muted">{data.sixMonths.count} دفعة</p></div>
                <div className="plan-card"><h3>🏛️ أرباح العمولة (6 أشهر)</h3><p className="price ok">{data.commissionEarnings.toLocaleString()}</p><p className="small muted">{data.commission}% من مبيعات الطلبات</p></div>
                <div className="plan-card"><h3>🏦 التزامات</h3><p className="price bad">{(data.walletsLiability + data.cardsLiability).toLocaleString()}</p><p className="small muted">محافظ + بطاقات</p></div>
              </div>

              {/* الاتجاه + التنبؤ */}
              <section className="card">
                <div className="row between">
                  <h2>📊 الإيرادات الشهرية</h2>
                  <span className="badge" style={{ background: "#f3f4f6", color: trend!.color }}>{trend!.label}
                    {data.analysis.growth != null && ` ${data.analysis.growth > 0 ? "+" : ""}${data.analysis.growth}%`}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: ".5rem", height: "10rem", padding: "1rem 0 .25rem" }}>
                  {data.monthly.map((m: any, i: number) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: ".3rem", height: "100%", justifyContent: "flex-end" }}>
                      <span className="small" style={{ fontWeight: 800 }}>{m.total > 0 ? (m.total / 1000).toFixed(0) + "k" : ""}</span>
                      <div style={{ width: "100%", height: `${Math.max((m.total / maxMonthly) * 100, 3)}%`, borderRadius: ".5rem .5rem 0 0", background: i === data.monthly.length - 1 ? "var(--primary)" : "linear-gradient(180deg,#c4b5fd,#a78bfa)" }} />
                      <span className="small muted">{m.label.slice(0, 5)}</span>
                    </div>
                  ))}
                </div>
                {data.analysis.forecast != null && (
                  <p className="muted small">🤖 التنبؤ للشهر القادم: <strong>{data.analysis.forecast.toLocaleString()} ر.ي</strong>
                    {data.analysis.best && ` · أفضل شهر: ${data.analysis.best.label} (${data.analysis.best.total.toLocaleString()})`}</p>
                )}
              </section>

              {/* التفصيل */}
              <div className="grid-cards" style={{ marginBottom: "1rem" }}>
                <section className="card" style={{ marginBottom: 0 }}>
                  <h2>حسب الغرض</h2>
                  {Object.entries(data.byPurpose).map(([k, v]: any) => (
                    <p key={k} className="row between small"><span>{PURPOSE[k] || k}</span><strong>{v.toLocaleString()}</strong></p>
                  ))}
                </section>
                <section className="card" style={{ marginBottom: 0 }}>
                  <h2>حسب الوسيلة</h2>
                  {Object.entries(data.byMethod).map(([k, v]: any) => (
                    <p key={k} className="row between small"><span>{METHOD[k] || k}</span><strong>{v.toLocaleString()}</strong></p>
                  ))}
                </section>
              </div>

              {/* العمولة */}
              <section className="card">
                <h2>🏛️ عمولة المنصة</h2>
                <div className="row">
                  <input type="number" min="0" max="30" step="0.5" value={commission} onChange={(e) => setCommission(e.target.value)} style={{ maxWidth: 120, marginBottom: 0 }} />
                  <span className="muted small">% من كل دفعة طلب معتمدة</span>
                  <button className="btn primary small" onClick={saveCommission}>💾 حفظ</button>
                </div>
              </section>

              <section className="card ai-card">
                <h2>🤖 نصائح مالية</h2>
                {data.tips.map((t: any, i: number) => <p key={i}>{t.icon} {t.text}</p>)}
              </section>
            </>
          )}

          {tab === "journal" && (
            <>
              <section className="card" style={{ marginBottom: "1rem" }}>
                <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
                  <select value={jFilter.kind} onChange={(e) => setJFilter({ ...jFilter, kind: e.target.value })} style={{ maxWidth: 170, marginBottom: 0 }}>
                    <option value="">كل الأنواع</option>
                    {Object.entries(KIND_AR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <input type="date" value={jFilter.from} onChange={(e) => setJFilter({ ...jFilter, from: e.target.value })} style={{ maxWidth: 160, marginBottom: 0 }} />
                  <input type="date" value={jFilter.to} onChange={(e) => setJFilter({ ...jFilter, to: e.target.value })} style={{ maxWidth: 160, marginBottom: 0 }} />
                  <button className="btn primary small" onClick={loadJournal}>🔍 عرض</button>
                  <button className="btn ghost small" onClick={exportJournal}>📥 تصدير CSV</button>
                </div>
              </section>
              {journal && (
                <section className="card">
                  <div className="row between" style={{ flexWrap: "wrap" }}>
                    <h2>📒 دفتر اليومية ({journal.totals.count} قيد)</h2>
                    <p className="small"><span style={{ color: "#059669" }}>وارد: <strong>{fmt(journal.totals.debit)}</strong></span> · <span style={{ color: "#dc2626" }}>منصرف: <strong>{fmt(journal.totals.credit)}</strong></span></p>
                  </div>
                  {journal.entries.length === 0 && <p className="muted small" style={{ textAlign: "center", padding: "1rem" }}>لا قيود في هذه الفترة</p>}
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>التاريخ</th><th>المستند</th><th>النوع</th><th>البيان</th><th>الطرف</th><th>مدين (وارد)</th><th>دائن (منصرف)</th></tr></thead>
                      <tbody>
                        {journal.entries.map((e: any, i: number) => (
                          <tr key={i}>
                            <td className="small muted">{new Date(e.date).toLocaleString("ar-YE", { dateStyle: "short", timeStyle: "short" })}</td>
                            <td className="small" dir="ltr">{e.doc}</td>
                            <td><span className="small" style={{ color: KIND_AR[e.kind]?.color }}>{KIND_AR[e.kind]?.label || e.kind}</span></td>
                            <td className="small">{e.description}</td>
                            <td className="small muted">{e.party}</td>
                            <td style={{ color: "#059669", fontWeight: 700 }}>{e.debit ? fmt(e.debit) : ""}</td>
                            <td style={{ color: "#dc2626", fontWeight: 700 }}>{e.credit ? fmt(e.credit) : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}

          {tab === "income" && income && (
            <>
              <div className="grid-cards" style={{ marginBottom: "1rem" }}>
                <div className="plan-card"><h3>📈 إجمالي الإيرادات</h3><p className="price ok">{fmt(income.totals.revenue)}</p><p className="small muted">عمولات + اشتراكات + خدمات</p></div>
                <div className="plan-card"><h3>📤 إجمالي المصروفات</h3><p className="price bad">{fmt(income.totals.expenses)}</p><p className="small muted">6 أشهر</p></div>
                <div className="plan-card"><h3>{income.totals.net >= 0 ? "✅ صافي ربح" : "🔻 صافي خسارة"}</h3><p className="price" style={{ color: income.totals.net >= 0 ? "#059669" : "#dc2626" }}>{fmt(income.totals.net)}</p><p className="small muted">الإيرادات − المصروفات</p></div>
              </div>
              <section className="card">
                <h2>📊 قائمة الدخل الشهرية</h2>
                <p className="muted small" style={{ marginTop: 0 }}>مبدأ الاستحقاق: شحن البطاقات وأرصدة المحافظ التزامات لا تُحسب إيراداً — الإيراد = العمولات ({income.commission}%) + الاشتراكات + خدمات المنصة</p>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>الشهر</th><th>عمولات</th><th>اشتراكات</th><th>خدمات</th><th>إجمالي الإيراد</th><th>المصروفات</th><th>الصافي</th></tr></thead>
                    <tbody>
                      {income.months.map((m: any) => (
                        <tr key={m.key}>
                          <td><strong>{m.label}</strong></td>
                          <td>{fmt(m.revenue.commissions)}</td>
                          <td>{fmt(m.revenue.subscriptions)}</td>
                          <td>{fmt(m.revenue.pservices)}</td>
                          <td style={{ color: "#059669", fontWeight: 700 }}>{fmt(m.revenue.total)}</td>
                          <td style={{ color: "#dc2626" }}>{fmt(m.expenses.total)}</td>
                          <td style={{ fontWeight: 900, color: m.net >= 0 ? "#059669" : "#dc2626" }}>{fmt(m.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {income.months.some((m: any) => Object.keys(m.expenses.byCategory).length > 0) && (
                  <div style={{ marginTop: "1rem" }}>
                    <h3 style={{ fontSize: "1rem" }}>📤 المصروفات حسب الفئة (6 أشهر)</h3>
                    {Object.entries(income.months.reduce((acc: any, m: any) => {
                      for (const [k, v] of Object.entries(m.expenses.byCategory)) acc[k] = (acc[k] || 0) + (v as number);
                      return acc;
                    }, {})).map(([k, v]: any) => (
                      <p key={k} className="row between small"><span>{EXP_CATS[k] || k}</span><strong>{fmt(v)}</strong></p>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {tab === "balance" && balance && (
            <>
              <div className="grid-cards" style={{ marginBottom: "1rem" }}>
                <div className="plan-card"><h3>💵 النقدية التشغيلية</h3><p className="price ok">{fmt(balance.assets.cash)}</p><p className="small muted">مقبوضات − مدفوعات − مصروفات</p></div>
                <div className="plan-card"><h3>⏳ ذمم مدينة</h3><p className="price">{fmt(balance.assets.receivable)}</p><p className="small muted">{balance.assets.receivableCount} دفعة معلقة</p></div>
                <div className="plan-card"><h3>🏦 إجمالي الالتزامات</h3><p className="price bad">{fmt(balance.liabilities.total)}</p><p className="small muted">محافظ + بطاقات + سحوبات</p></div>
                <div className="plan-card"><h3>{balance.equity >= 0 ? "👑 صافي حقوق الملكية" : "⚠️ عجز"}</h3><p className="price" style={{ color: balance.equity >= 0 ? "#059669" : "#dc2626" }}>{fmt(balance.equity)}</p><p className="small muted">الأصول − الالتزامات</p></div>
              </div>
              <div className="grid-cards">
                <section className="card" style={{ marginBottom: 0 }}>
                  <h2>💰 الأصول</h2>
                  <p className="row between small"><span>💵 النقدية التشغيلية</span><strong>{fmt(balance.assets.cash)}</strong></p>
                  <p className="row between small"><span>⏳ ذمم مدينة (دفعات معلقة)</span><strong>{fmt(balance.assets.receivable)}</strong></p>
                  <p className="row between" style={{ borderTop: "2px solid #e5e7eb", paddingTop: ".5rem" }}><span><strong>إجمالي الأصول</strong></span><strong style={{ color: "#059669" }}>{fmt(balance.assets.total)}</strong></p>
                </section>
                <section className="card" style={{ marginBottom: 0 }}>
                  <h2>🏦 الالتزامات</h2>
                  <p className="row between small"><span>👛 أرصدة محافظ البائعين</span><strong>{fmt(balance.liabilities.wallets)}</strong></p>
                  <p className="row between small"><span>💳 أرصدة بطاقات العملاء</span><strong>{fmt(balance.liabilities.cards)}</strong></p>
                  <p className="row between small"><span>💸 سحوبات معلقة الدفع</span><strong>{fmt(balance.liabilities.pendingWithdrawals)}</strong></p>
                  <p className="row between" style={{ borderTop: "2px solid #e5e7eb", paddingTop: ".5rem" }}><span><strong>إجمالي الالتزامات</strong></span><strong style={{ color: "#dc2626" }}>{fmt(balance.liabilities.total)}</strong></p>
                </section>
              </div>
            </>
          )}

          {tab === "settlements" && (
            <>
              {/* 🤝 أرباح العمولات — من الخصم الآلي الفعلي */}
              {commReport && (
                <section className="card" style={{ marginBottom: "1rem" }}>
                  <h2>🤝 أرباح عمولات المنصة</h2>
                  <p className="muted small" style={{ marginTop: 0 }}>تُخصم تلقائياً من محفظة البائع فور تسليم كل طلب ({commReport.globalRate}% عامة أو نسبة المتجر المخصصة) — وتُعكس تلقائياً عند الاسترجاع</p>
                  <div className="row" style={{ gap: ".5rem", flexWrap: "wrap", marginBottom: ".75rem" }}>
                    <span className="badge" style={{ background: "#ede9fe", color: "#6d28d9" }}>هذا الشهر: {fmt(commReport.thisMonth.total)} ر.ي ({commReport.thisMonth.orders} طلب)</span>
                    <span className="badge" style={{ background: "#f3f4f6", color: "#374151" }}>الشهر الماضي: {fmt(commReport.lastMonth.total)} ر.ي</span>
                    <span className="badge" style={{ background: "#d1fae5", color: "#065f46" }}>الإجمالي: {fmt(commReport.allTime.total)} ر.ي ({commReport.allTime.orders} طلب)</span>
                  </div>
                  {commReport.topStores.length > 0 && (
                    <p className="small muted">🏆 الأعلى عمولة: {commReport.topStores.map((t: any) => `${t.name} (${fmt(t.total)})`).join(" · ")}</p>
                  )}
                </section>
              )}

              {/* 📋 كشوف التسوية */}
              <section className="card" style={{ marginBottom: "1rem" }}>
                <div className="row between">
                  <h2>📋 كشوف التسوية ({stList.length})</h2>
                  <div className="row" style={{ gap: ".4rem" }}>
                    <button className="btn ghost small" onClick={() => loadSt()}>🔄</button>
                    <button className="btn primary small" onClick={() => setShowGen(!showGen)}>{showGen ? "إلغاء" : "＋ كشف جديد"}</button>
                  </div>
                </div>
                {showGen && (
                  <div className="card" style={{ background: "#faf5ff", marginBottom: ".75rem" }}>
                    <h3 className="small" style={{ marginTop: 0 }}>＋ توليد كشف تسوية لبائع</h3>
                    <div className="row" style={{ flexWrap: "wrap", gap: ".5rem" }}>
                      <select value={genForm.sellerId} onChange={(e) => setGenForm({ ...genForm, sellerId: e.target.value })} style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                        <option value="">— اختر البائع —</option>
                        {settlements.map((s) => <option key={s.sellerId} value={s.sellerId}>{s.name} ({s.storeName})</option>)}
                      </select>
                      <input type="date" value={genForm.from} onChange={(e) => setGenForm({ ...genForm, from: e.target.value })} style={{ maxWidth: 150, marginBottom: 0 }} title="من — فارغ = بداية الشهر" />
                      <input type="date" value={genForm.to} onChange={(e) => setGenForm({ ...genForm, to: e.target.value })} style={{ maxWidth: 150, marginBottom: 0 }} title="إلى — فارغ = اليوم" />
                      <button className="btn primary small" onClick={generateSt}>📋 توليد</button>
                    </div>
                  </div>
                )}
                <div className="row" style={{ marginBottom: ".5rem" }}>
                  <input placeholder="🔍 برقم الكشف أو اسم البائع..." value={stQ} onChange={(e) => setStQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadSt()} style={{ flex: 1, marginBottom: 0 }} />
                  <button className="btn ghost small" onClick={() => loadSt()}>بحث</button>
                </div>
                {stList.length === 0 && <p className="muted small" style={{ textAlign: "center", padding: "1rem" }}>لا كشوف بعد — ولّد أول كشف تسوية لبائع</p>}
                {stList.map((st) => (
                  <div key={st.id} className="assign-row" style={{ flexWrap: "wrap", gap: ".4rem" }}>
                    <div className="flex-1">
                      <b>{st.number}</b>{" "}
                      <span className={`badge ${st.status === "paid" ? "active" : ""}`}>{st.status === "paid" ? "✅ مسوّى" : "📋 صادر"}</span>
                      <div className="text-xs muted">
                        {st.seller?.name} · {st.seller?.stores?.[0]?.name} · {new Date(st.periodStart).toLocaleDateString("ar-YE")} ← {new Date(st.periodEnd).toLocaleDateString("ar-YE")} · {st.ordersCount} طلب
                      </div>
                      <div className="text-xs">
                        مبيعات {fmt(st.gross)} · عمولة <b style={{ color: "#7c3aed" }}>{fmt(st.commission)}</b> · مرتجعات {fmt(st.refunds)} · صافي <b style={{ color: "#059669" }}>{fmt(st.net)}</b>
                      </div>
                    </div>
                    <a className="btn small ghost" href={`/settlement/${st.id}`} target="_blank">🖨️ طباعة</a>
                    <button className="btn small ghost" onClick={() => exportSt(st.id, st.number)}>📥 CSV</button>
                    {st.status !== "paid" && <button className="btn small primary" onClick={() => paySt(st.id, st.number)}>✅ تسوية</button>}
                  </div>
                ))}
              </section>

              {/* 🎯 عمولة مخصصة لكل متجر */}
              {commReport && (
                <section className="card" style={{ marginBottom: "1rem" }}>
                  <h2>🎯 عمولة مخصصة لكل متجر</h2>
                  <p className="muted small" style={{ marginTop: 0 }}>فارغ = النسبة العامة ({commReport.globalRate}%) — القيمة بين 0 و 30</p>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>المتجر</th><th>النسبة الحالية</th><th>تخصيص %</th><th></th></tr></thead>
                      <tbody>
                        {commReport.stores.map((s: any) => (
                          <tr key={s.id}>
                            <td><strong>{s.name}</strong><div className="small muted" dir="ltr">{s.slug}</div></td>
                            <td>{s.override != null ? <span className="badge" style={{ background: "#ede9fe", color: "#6d28d9" }}>{s.override}% مخصصة</span> : <span className="small muted">عامة</span>}</td>
                            <td><input type="number" min={0} max={30} placeholder={String(commReport.globalRate)}
                              value={storeRate[s.id] ?? (s.override != null ? String(s.override) : "")}
                              onChange={(e) => setStoreRate({ ...storeRate, [s.id]: e.target.value })}
                              style={{ maxWidth: 90, marginBottom: 0, padding: ".35rem" }} /></td>
                            <td><button className="btn small primary" onClick={() => saveStoreRate(s.id)}>💾</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* المراكز الحالية المحسوبة */}
              <section className="card">
                <div className="row between">
                  <h2>🤝 مراكز البائعين الحالية ({settlements.length})</h2>
                  <button className="btn ghost small" onClick={() => { setSettlements([]); api("/admin/finance/settlements").then(setSettlements); }}>🔄 تحديث</button>
                </div>
                <p className="muted small" style={{ marginTop: 0 }}>لقطة حية: مبيعات إلكترونية معتمدة، رصيد المحفظة، وسحوبات معلقة</p>
                {settlements.length === 0 && <p className="muted small" style={{ textAlign: "center", padding: "1rem" }}>لا بائعون نشطون</p>}
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>البائع</th><th>المتجر</th><th>المبيعات الإلكترونية</th><th>رصيد المحفظة</th><th>سحب معلق</th><th>الصافي</th></tr></thead>
                    <tbody>
                      {settlements.map((s) => (
                        <tr key={s.sellerId}>
                          <td><strong>{s.name}</strong><div className="small muted" dir="ltr">{s.phone}</div></td>
                          <td className="small">{s.storeName}</td>
                          <td>{fmt(s.sales)}</td>
                          <td>{fmt(s.walletBalance)}</td>
                          <td style={{ color: "#d97706" }}>{fmt(s.pendingWithdrawal)}</td>
                          <td style={{ fontWeight: 900, color: s.netPosition >= 0 ? "#059669" : "#dc2626" }}>{fmt(s.netPosition)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {tab === "expenses" && (
            <>
              <div className="row" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
                <button className="btn primary" onClick={() => setShowExpForm(!showExpForm)}>{showExpForm ? "إلغاء" : "＋ قيد مصروف جديد"}</button>
                <select value={expFilter.category} onChange={(e) => { setExpFilter({ ...expFilter, category: e.target.value }); setTimeout(loadExpenses, 0); }} style={{ maxWidth: 180, marginBottom: 0 }}>
                  <option value="">كل الفئات</option>
                  {Object.entries(EXP_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input type="month" value={expFilter.month} onChange={(e) => { setExpFilter({ ...expFilter, month: e.target.value }); setTimeout(loadExpenses, 0); }} style={{ maxWidth: 160, marginBottom: 0 }} />
              </div>
              {showExpForm && (
                <section className="card" style={{ marginBottom: "1rem" }}>
                  <h2>＋ تسجيل مصروف</h2>
                  <input placeholder="البيان (مثال: اشتراك خادم Contabo)" value={newExp.title} onChange={(e) => setNewExp({ ...newExp, title: e.target.value })} />
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    <select value={newExp.category} onChange={(e) => setNewExp({ ...newExp, category: e.target.value })} style={{ maxWidth: 190 }}>
                      {Object.entries(EXP_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="number" placeholder="المبلغ (ر.ي)" value={newExp.amount} onChange={(e) => setNewExp({ ...newExp, amount: e.target.value })} style={{ maxWidth: 150 }} />
                    <input type="date" value={newExp.spentAt} onChange={(e) => setNewExp({ ...newExp, spentAt: e.target.value })} style={{ maxWidth: 160 }} title="تاريخ الاستحقاق — فارغ = اليوم" />
                  </div>
                  <input placeholder="ملاحظة (اختياري)" value={newExp.note} onChange={(e) => setNewExp({ ...newExp, note: e.target.value })} />
                  <button className="btn primary" onClick={addExpense}>💾 تسجيل القيد</button>
                </section>
              )}
              {expenses && (
                <section className="card">
                  <div className="row between"><h2>💸 سجل المصروفات</h2><p className="small">الإجمالي: <strong style={{ color: "#dc2626" }}>{fmt(expenses.total)}</strong></p></div>
                  {expenses.items.length === 0 && <p className="muted small" style={{ textAlign: "center", padding: "1rem" }}>لا مصروفات مسجلة — سجّل تكاليف التشغيل لتظهر قائمة الدخل بدقة</p>}
                  {expenses.items.map((e: any) => (
                    <div key={e.id} className="row between" style={{ padding: ".6rem 0", borderBottom: "1px solid #f3f4f6", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <strong className="small">{e.title}</strong>
                        <div className="small muted">{EXP_CATS[e.category] || e.category} · {new Date(e.spentAt).toLocaleDateString("ar-YE")}{e.note ? " · " + e.note : ""}</div>
                      </div>
                      <strong style={{ color: "#dc2626" }}>{fmt(Number(e.amount))}</strong>
                      <button className="btn small ghost" style={{ color: "#dc2626" }} onClick={() => deleteExpense(e.id)}>🗑️</button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}

          {tab === "tax" && tax && (
            <>
              <div className="grid-cards" style={{ marginBottom: "1rem" }}>
                <div className="plan-card"><h3>🕌 الوعاء الزكوي</h3><p className="price">{fmt(tax.zakat.base)}</p><p className="small muted">نقدية + ذمم − التزامات</p></div>
                <div className="plan-card"><h3>🕌 الزكاة المستحقة ({tax.zakat.rate}%)</h3><p className="price" style={{ color: "#7c3aed" }}>{fmt(tax.zakat.due)}</p><p className="small muted">عند حولان الحول وبلوغ النصاب</p></div>
                <div className="plan-card"><h3>📈 صافي الربح السنوي (مقدّر)</h3><p className="price ok">{fmt(tax.annualized.netProfit)}</p><p className="small muted">من متوسط 6 أشهر</p></div>
                <div className="plan-card"><h3>💰 الإيراد السنوي (مقدّر)</h3><p className="price">{fmt(tax.annualized.revenue)}</p><p className="small muted">عمولات + اشتراكات + خدمات</p></div>
              </div>
              <section className="card ai-card">
                <h2>⚖️ ملاحظات الامتثال القانوني</h2>
                {tax.notes.map((n: string, i: number) => <p key={i} className="small">{n}</p>)}
              </section>
            </>
          )}

          {tab === "currencies" && (
            <>
              <button className="btn primary" style={{ marginBottom: "1rem" }} onClick={() => setShowNew(!showNew)}>＋ عملة جديدة</button>
              {showNew && (
                <section className="card">
                  <h2>＋ إضافة عملة</h2>
                  <input dir="ltr" placeholder="الرمز (SAR)" value={newCur.code} onChange={(e) => setNewCur({ ...newCur, code: e.target.value.toUpperCase() })} />
                  <input placeholder="الاسم (ريال سعودي)" value={newCur.name} onChange={(e) => setNewCur({ ...newCur, name: e.target.value })} />
                  <input placeholder="الرمز المختصر (ر.س)" value={newCur.symbol} onChange={(e) => setNewCur({ ...newCur, symbol: e.target.value })} />
                  <input type="number" step="0.000001" placeholder="السعر مقابل الدولار (3.75)" value={newCur.rateToUsd} onChange={(e) => setNewCur({ ...newCur, rateToUsd: e.target.value })} />
                  <div className="row">
                    <button className="btn primary" onClick={addCurrency}>💾 إضافة</button>
                    <button className="btn ghost" onClick={() => setShowNew(false)}>إلغاء</button>
                  </div>
                </section>
              )}
              <section className="card">
                <h2>💱 العملات ({currencies.length})</h2>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>العملة</th><th>السعر مقابل $</th><th>تحديث السعر</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                    <tbody>
                      {currencies.map((c) => (
                        <tr key={c.code}>
                          <td><strong>{c.symbol} {c.name}</strong> <span className="muted small" dir="ltr">({c.code})</span>
                            {c.isDefault && <span className="badge active">افتراضية</span>}</td>
                          <td dir="ltr">{Number(c.rateToUsd)}</td>
                          <td>
                            <div className="row">
                              <input type="number" step="0.000001" placeholder={String(Number(c.rateToUsd))} value={editingRate[c.code] || ""}
                                onChange={(e) => setEditingRate({ ...editingRate, [c.code]: e.target.value })}
                                style={{ width: 110, padding: ".4rem .6rem", marginBottom: 0 }} />
                              <button className="btn small primary" onClick={() => saveRate(c.code)}>💾</button>
                            </div>
                          </td>
                          <td><span className={`badge ${c.isActive ? "active" : "cancelled"}`}>{c.isActive ? "نشطة" : "معطلة"}</span></td>
                          <td className="row">
                            {!c.isDefault && c.isActive && <button className="btn small ghost" onClick={() => setDefault(c.code)}>⭐ افتراضية</button>}
                            {!c.isDefault && <button className="btn small ghost" onClick={() => toggleCur(c.code)}>{c.isActive ? "⏸️" : "▶️"}</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted small" style={{ marginTop: ".5rem" }}>آخر تحديث يظهر في التقارير — حدّث الأسعار شهرياً لدقة أفضل 💡</p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
