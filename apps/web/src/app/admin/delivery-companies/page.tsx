"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const empty = { id: "", name: "", apiUrl: "", apiKey: "", panelUrl: "", isActive: true };

export default function AdminDeliveryCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ ...empty });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => api("/admin/delivery-companies").then(setCompanies).catch((e) => toast(e.message, "error"));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast("⚠️ اسم الشركة مطلوب", "error");
    setSaving(true);
    try {
      const body: any = { ...form };
      if (!body.id) delete body.id;
      await api("/admin/delivery-companies", { method: "POST", body: JSON.stringify(body) });
      toast(form.id ? "✅ تم تحديث الشركة" : "✅ تمت إضافة شركة التوصيل");
      setForm({ ...empty });
      setShowForm(false);
      load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string) => {
    try { await api(`/admin/delivery-companies/${id}/toggle`, { method: "PATCH" }); toast("✅ تم تحديث الحالة"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`حذف شركة ${name}؟ ستُفك روابط المتاجر بها`)) return;
    try { await api(`/admin/delivery-companies/${id}`, { method: "DELETE" }); toast("🗑️ تم حذف الشركة"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>🚚 شركات التوصيل</h1>

          <button className="btn primary" style={{ marginBottom: "1rem" }} onClick={() => { setForm({ ...empty }); setShowForm(!showForm); }}>
            ＋ شركة جديدة
          </button>

          {showForm && (
            <section className="card">
              <h2>{form.id ? "✏️ تعديل شركة" : "＋ شركة توصيل جديدة"}</h2>
              <input placeholder="اسم الشركة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input dir="ltr" placeholder="رابط API الشركة (اختياري)" value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} />
              <input dir="ltr" placeholder="مفتاح API (اختياري)" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
              <input dir="ltr" placeholder="رابط لوحة الشركة (اختياري)" value={form.panelUrl} onChange={(e) => setForm({ ...form, panelUrl: e.target.value })} />
              <div className="row">
                <button className="btn primary" onClick={save} disabled={saving}>{saving ? "⏳..." : "💾 حفظ"}</button>
                <button className="btn ghost" onClick={() => setShowForm(false)}>إلغاء</button>
              </div>
            </section>
          )}

          <section className="card">
            <h2>📋 الشركات ({companies.length})</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>الاسم</th><th>API</th><th>لوحة الشركة</th><th>المتاجر المرتبطة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.apiUrl ? "🔗 متصل" : "—"}</td>
                      <td>{c.panelUrl ? <a href={c.panelUrl} target="_blank">فتح ↗</a> : "—"}</td>
                      <td>{c._count?.stores ?? 0}</td>
                      <td><span className={`badge ${c.isActive ? "active" : "cancelled"}`}>{c.isActive ? "نشطة" : "موقوفة"}</span></td>
                      <td className="row">
                        <button className="btn small ghost" onClick={() => { setForm({ ...c }); setShowForm(true); }}>✏️</button>
                        <button className="btn small ghost" onClick={() => toggle(c.id)}>{c.isActive ? "⏸️" : "▶️"}</button>
                        <button className="btn small danger" onClick={() => del(c.id, c.name)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small" style={{ marginTop: ".5rem" }}>💡 التاجر يربط متجره بالشركات النشطة من لوحته: التوصيل ← شركات التوصيل</p>
          </section>
        </main>
      </div>
    </div>
  );
}
