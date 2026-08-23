"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const GOVS = ["أمانة العاصمة","صنعاء","عدن","تعز","الحديدة","إب","ذمار","حضرموت","لحج","أبين","شبوة","مأرب","البيضاء","الجوف","صعدة","حجة","المحويت","عمران","الضالع","ريمة","المهرة","سقطرى"];
const empty = { id: "", name: "", phone: "", password: "", vehicle: "", governorate: "", isActive: true };

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<any>({ ...empty });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  // 💸 طلبات سحب السائقين
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wdCounts, setWdCounts] = useState<Record<string, number>>({});

  const load = () => api(`/admin/drivers${q ? `?q=${q}` : ""}`).then(setDrivers).catch((e) => toast(e.message, "error"));
  const loadWd = () => api("/admin/driver-withdrawals").then((d) => { setWithdrawals(d.withdrawals || []); setWdCounts(d.counts || {}); }).catch(() => {});
  useEffect(() => { load(); loadWd(); }, []);

  const processWd = async (id: string, approve: boolean) => {
    if (!approve && !confirm("رفض طلب السحب؟ سيُعاد المبلغ لمحفظة السائق")) return;
    try {
      await api(`/admin/driver-withdrawals/${id}/process`, { method: "POST", body: JSON.stringify({ approve }) });
      toast(approve ? "✅ تم الاعتماد — سلّم المبلغ للسائق" : "⚠️ رُفض الطلب وأُعيد المبلغ للمحفظة");
      loadWd();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const save = async () => {
    if (!form.name || !form.phone) return toast("⚠️ الاسم ورقم الجوال مطلوبان", "error");
    if (!form.id && !form.password) return toast("⚠️ كلمة المرور مطلوبة للسائق الجديد", "error");
    setSaving(true);
    try {
      const body: any = { ...form };
      if (!body.id) delete body.id;
      if (!body.password) delete body.password;
      await api("/admin/drivers", { method: "POST", body: JSON.stringify(body) });
      toast(form.id ? "✅ تم تحديث بيانات السائق" : "✅ تم إضافة السائق — سلّمه بيانات الدخول");
      setForm({ ...empty });
      setShowForm(false);
      load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string) => {
    try { await api(`/admin/drivers/${id}/toggle`, { method: "PATCH" }); toast("✅ تم تحديث الحالة"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`حذف السائق ${name}؟ ستُفك إسنادات طلباته`)) return;
    try { await api(`/admin/drivers/${id}`, { method: "DELETE" }); toast("🗑️ تم حذف السائق"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>🛵 إدارة السائقين</h1>

          {/* 💸 طلبات سحب السائقين — اعتماد أو رفض (الرفض يعيد المبلغ للمحفظة) */}
          {withdrawals.filter((w) => w.status === "pending").length > 0 && (
            <section className="card" style={{ border: "2px solid #f59e0b55", background: "#fffbeb" }}>
              <h2>💸 طلبات سحب معلقة ({wdCounts.pending || 0})</h2>
              {withdrawals.filter((w) => w.status === "pending").map((w) => (
                <div key={w.id} className="row" style={{ alignItems: "center", gap: ".6rem", padding: ".6rem 0", borderBottom: "1px solid #f59e0b22", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <b>{w.driver?.name}</b> <span className="muted small" dir="ltr">{w.driver?.phone}</span>
                    <div className="small" style={{ marginTop: ".2rem" }}>
                      💰 <b>{Number(w.amount).toLocaleString()} {w.currency}</b> — {w.method}
                    </div>
                    <div className="muted small">📋 {w.accountInfo} · {new Date(w.createdAt).toLocaleString("ar-YE")}</div>
                  </div>
                  <button className="btn primary" onClick={() => processWd(w.id, true)}>✅ تم الصرف</button>
                  <button className="btn ghost" style={{ color: "#dc2626" }} onClick={() => processWd(w.id, false)}>❌ رفض</button>
                </div>
              ))}
            </section>
          )}

          <div className="row" style={{ marginBottom: "1rem" }}>
            <input placeholder="🔍 بحث بالاسم أو الجوال..." value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              style={{ flex: 1, padding: ".7rem 1rem", borderRadius: ".8rem", border: "1px solid #e5e7eb" }} />
            <button className="btn ghost" onClick={load}>بحث</button>
            <button className="btn primary" onClick={() => { setForm({ ...empty }); setShowForm(!showForm); }}>＋ سائق جديد</button>
          </div>

          {showForm && (
            <section className="card">
              <h2>{form.id ? "✏️ تعديل سائق" : "＋ سائق جديد"}</h2>
              <input placeholder="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input dir="ltr" placeholder="رقم الجوال (77xxxxxxx)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input type="password" placeholder={form.id ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <input placeholder="وسيلة النقل (دراجة نارية / سيارة...)" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} />
              <select value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })}>
                <option value="">اختر المحافظة...</option>
                {GOVS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <div className="row">
                <button className="btn primary" onClick={save} disabled={saving}>{saving ? "⏳..." : "💾 حفظ"}</button>
                <button className="btn ghost" onClick={() => setShowForm(false)}>إلغاء</button>
              </div>
            </section>
          )}

          <section className="card">
            <h2>📋 السائقون ({drivers.length})</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>الاسم</th><th>الجوال</th><th>المركبة</th><th>المحافظة</th><th>الطلبات</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.name}</strong></td>
                      <td dir="ltr">{d.phone}</td>
                      <td>{d.vehicle || "—"}</td>
                      <td>{d.governorate || "—"}</td>
                      <td>{d.ordersCount}</td>
                      <td><span className={`badge ${d.isActive ? "active" : "cancelled"}`}>{d.isActive ? "نشط" : "موقوف"}</span></td>
                      <td className="row">
                        <button className="btn small ghost" onClick={() => { setForm({ ...d, password: "" }); setShowForm(true); }}>✏️</button>
                        <button className="btn small ghost" onClick={() => toggle(d.id)}>{d.isActive ? "⏸️" : "▶️"}</button>
                        <button className="btn small danger" onClick={() => del(d.id, d.name)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small" style={{ marginTop: ".5rem" }}>💡 السائق يدخل من /driver/login برقم جواله وكلمة مروره</p>
          </section>
        </main>
      </div>
    </div>
  );
}
