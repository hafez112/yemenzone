"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import { useRouter } from "next/navigation";

// 💱 إدارة العملات وأسعار الصرف — عملة افتراضية واحدة تُستخدم في التقارير المالية
export default function AdminCurrenciesPage() {
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: "", name: "", symbol: "", rateToUsd: "", isDefault: false });
  const [edit, setEdit] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api("/admin/currencies").then((d) => { setList(d); setLoading(false); })
    .catch((e) => { toast(e.message, "error"); setLoading(false); });

  useEffect(() => {
    if (!getUser()) { router.push("/auth/admin-login"); return; }
    load();
  }, []);

  const add = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.symbol.trim()) return toast("⚠️ أكمل الرمز والاسم والرمز المختصر", "error");
    if (!Number(form.rateToUsd)) return toast("⚠️ أدخل سعر الصرف مقابل الدولار", "error");
    setSaving(true);
    try {
      await api("/admin/currencies", { method: "POST", body: JSON.stringify({ ...form, rateToUsd: Number(form.rateToUsd) }) });
      toast("✅ أُضيفت العملة");
      setForm({ code: "", name: "", symbol: "", rateToUsd: "", isDefault: false });
      load();
    } catch (e: any) { toast(e.message, "error"); }
    setSaving(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api(`/admin/currencies/${edit.id}`, { method: "PATCH", body: JSON.stringify(edit) });
      toast("✅ حُدّثت العملة");
      setEdit(null);
      load();
    } catch (e: any) { toast(e.message, "error"); }
    setSaving(false);
  };

  const patch = async (c: any, data: any, msg: string) => {
    try {
      await api(`/admin/currencies/${c.id}`, { method: "PATCH", body: JSON.stringify(data) });
      toast(msg);
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const remove = async (c: any) => {
    if (!confirm(`حذف عملة «${c.name}» نهائياً؟`)) return;
    try {
      await api(`/admin/currencies/${c.id}`, { method: "DELETE" });
      toast("🗑️ حُذفت العملة");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">💱 العملات وأسعار الصرف</h1>
          <p className="text-sm text-gray-500 mb-4">العملة الافتراضية تظهر في التقارير والمحافظ — حدّث أسعار الصرف دورياً مقابل الدولار</p>

          {/* إضافة */}
          <section className="card">
            <h2>➕ إضافة عملة</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="YER" dir="ltr" maxLength={5} />
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ريال يمني" />
              <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="ر.ي" />
              <input type="number" min="0" step="any" value={form.rateToUsd} onChange={(e) => setForm({ ...form, rateToUsd: e.target.value })} placeholder="السعر مقابل $" dir="ltr" />
            </div>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
              <label className="row small" style={{ gap: ".4rem" }}>
                <input type="checkbox" style={{ width: "auto", marginBottom: 0 }} checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                اجعلها العملة الافتراضية
              </label>
              <button className="btn primary" disabled={saving} onClick={add}>{saving ? "⏳…" : "💾 إضافة"}</button>
            </div>
          </section>

          {loading ? <div className="skeleton h-64 rounded-3xl" /> : (
            <section className="card !p-2">
              {list.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl mb-1 flex-wrap"
                  style={{ background: c.isDefault ? "rgba(245,158,11,.1)" : "rgba(127,127,127,.05)", border: c.isDefault ? "1px solid rgba(245,158,11,.3)" : "none" }}>
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                    style={{ background: "rgba(108,61,245,.12)" }} dir="ltr">{c.code}</span>
                  <div className="flex-1 min-w-0">
                    <b className="text-sm block truncate">{c.name} <span className="muted">({c.symbol})</span></b>
                    <span className="text-[11px] muted" dir="ltr">1 USD = {Number(c.rateToUsd).toLocaleString()} {c.code}</span>
                  </div>
                  {c.isDefault && <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>⭐ افتراضية</span>}
                  {!c.isActive && <span className="badge cancelled">معطّلة</span>}

                  {edit?.id === c.id ? (
                    <div className="flex items-center gap-1.5 flex-wrap w-full">
                      <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="الاسم"
                        style={{ width: 120, padding: ".35rem .6rem", marginBottom: 0 }} />
                      <input value={edit.symbol} onChange={(e) => setEdit({ ...edit, symbol: e.target.value })} placeholder="الرمز"
                        style={{ width: 70, padding: ".35rem .6rem", marginBottom: 0 }} />
                      <input type="number" min="0" step="any" value={edit.rateToUsd} dir="ltr" title="السعر مقابل الدولار"
                        onChange={(e) => setEdit({ ...edit, rateToUsd: e.target.value })}
                        style={{ width: 110, padding: ".35rem .6rem", marginBottom: 0 }} />
                      <button className="btn small primary" disabled={saving} onClick={saveEdit}>💾</button>
                      <button className="btn small ghost" onClick={() => setEdit(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!c.isDefault && (
                        <button className="btn small ghost" title="تعيين كافتراضية"
                          onClick={() => patch(c, { isDefault: true }, `⭐ «${c.name}» أصبحت العملة الافتراضية`)}>⭐</button>
                      )}
                      <button className="btn small ghost" onClick={() => setEdit({ id: c.id, name: c.name, symbol: c.symbol, rateToUsd: Number(c.rateToUsd) })}>✏️</button>
                      <button className={"btn small " + (c.isActive ? "ghost" : "success")}
                        onClick={() => patch(c, { isActive: !c.isActive }, c.isActive ? "⏸️ عُطّلت العملة" : "✅ فُعّلت العملة")}>
                        {c.isActive ? "⏸️" : "▶️"}
                      </button>
                      {!c.isDefault && <button className="btn small danger" onClick={() => remove(c)}>🗑️</button>}
                    </div>
                  )}
                </div>
              ))}
              {!list.length && <p className="text-center muted py-10">لا عملات بعد 💱</p>}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
