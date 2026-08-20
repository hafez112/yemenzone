"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import { useRouter } from "next/navigation";

// 🏙️ إدارة المحافظات — تُستخدم في فلاتر المتاجر والعناوين والتوصيل
export default function AdminGovernoratesPage() {
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", nameEn: "", sort: 0 });
  const [edit, setEdit] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api("/admin/governorates").then((d) => { setList(d); setLoading(false); })
    .catch((e) => { toast(e.message, "error"); setLoading(false); });

  useEffect(() => {
    if (!getUser()) { router.push("/auth/admin-login"); return; }
    load();
  }, []);

  const add = async () => {
    if (!form.name.trim()) return toast("⚠️ اسم المحافظة مطلوب", "error");
    setSaving(true);
    try {
      await api("/admin/governorates", { method: "POST", body: JSON.stringify(form) });
      toast("✅ أُضيفت المحافظة");
      setForm({ name: "", nameEn: "", sort: 0 });
      load();
    } catch (e: any) { toast(e.message, "error"); }
    setSaving(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api(`/admin/governorates/${edit.id}`, { method: "PATCH", body: JSON.stringify(edit) });
      toast("✅ حُدّثت المحافظة");
      setEdit(null);
      load();
    } catch (e: any) { toast(e.message, "error"); }
    setSaving(false);
  };

  const toggle = async (g: any) => {
    try {
      await api(`/admin/governorates/${g.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !g.isActive }) });
      toast(g.isActive ? "⏸️ عُطّلت المحافظة — لن تظهر في القوائم" : "✅ فُعّلت المحافظة");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const remove = async (g: any) => {
    if (!confirm(`حذف محافظة «${g.name}» نهائياً؟`)) return;
    try {
      await api(`/admin/governorates/${g.id}`, { method: "DELETE" });
      toast("🗑️ حُذفت المحافظة");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const active = list.filter((g) => g.isActive).length;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🏙️ إدارة المحافظات</h1>
          <p className="text-sm text-gray-500 mb-4">تظهر للبائعين في إعدادات المتجر وللزوار في فلاتر البحث — {active} مفعّلة من {list.length}</p>

          {/* إضافة */}
          <section className="card">
            <h2>➕ إضافة محافظة</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الاسم بالعربية — مثل: عدن" />
              <input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="الاسم بالإنجليزية (اختياري)" dir="ltr" />
              <input type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} placeholder="الترتيب" />
            </div>
            <button className="btn primary" disabled={saving} onClick={add}>{saving ? "⏳…" : "💾 إضافة"}</button>
          </section>

          {loading ? <div className="skeleton h-64 rounded-3xl" /> : (
            <section className="card !p-2">
              {list.map((g, i) => (
                <div key={g.id} className={`flex items-center gap-2 p-2.5 rounded-xl ${i < list.length - 1 ? "mb-1" : ""}`}
                  style={{ background: "rgba(127,127,127,.05)" }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 font-black"
                    style={{ background: g.isActive ? "rgba(108,61,245,.12)" : "rgba(127,127,127,.12)" }}>
                    {g.sort || i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <b className="text-sm block truncate">{g.name}</b>
                    {g.nameEn && <span className="text-[11px] muted" dir="ltr">{g.nameEn}</span>}
                  </div>
                  {!g.isActive && <span className="badge cancelled">معطّلة</span>}

                  {edit?.id === g.id ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                        style={{ width: 110, padding: ".35rem .6rem", marginBottom: 0 }} />
                      <input type="number" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) })}
                        style={{ width: 60, padding: ".35rem .6rem", marginBottom: 0 }} title="الترتيب" />
                      <button className="btn small primary" disabled={saving} onClick={saveEdit}>💾</button>
                      <button className="btn small ghost" onClick={() => setEdit(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button className="btn small ghost" onClick={() => setEdit({ id: g.id, name: g.name, nameEn: g.nameEn || "", sort: g.sort })}>✏️</button>
                      <button className={"btn small " + (g.isActive ? "ghost" : "success")} onClick={() => toggle(g)}>
                        {g.isActive ? "⏸️" : "▶️"}
                      </button>
                      <button className="btn small danger" onClick={() => remove(g)}>🗑️</button>
                    </div>
                  )}
                </div>
              ))}
              {!list.length && <p className="text-center muted py-10">لا محافظات بعد — أضف أول محافظة من الأعلى 🏙️</p>}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
