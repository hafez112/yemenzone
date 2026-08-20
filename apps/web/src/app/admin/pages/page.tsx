"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import RichTextEditor from "../../../components/RichTextEditor";

const EMPTY = { id: null as string | null, title: "", slug: "", content: "", showInMenu: false, showInFooter: true, isActive: true, sortOrder: 0, metaTitle: "", metaDesc: "" };

export default function AdminPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState(false);

  const load = () => api("/admin/design").then((d) => setPages(d.pages || [])).catch((e) => toast(e.message, "error"));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return toast("⚠️ العنوان مطلوب", "error");
    if (!form.id && !form.slug.trim()) return toast("⚠️ الرابط مطلوب", "error");
    try {
      await api("/admin/pages", { method: "POST", body: JSON.stringify(form) });
      toast(form.id ? "✅ حُدّثت الصفحة" : "✅ أُنشئت الصفحة — متاحة على /p/" + form.slug);
      setForm(EMPTY); setEditing(false); load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const toggle = async (pg: any, field: "isActive" | "showInMenu" | "showInFooter") => {
    try {
      await api("/admin/pages", { method: "POST", body: JSON.stringify({ id: pg.id, [field]: !pg[field] }) });
      toast("✅ حُدّثت الصفحة"); load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const remove = async (pg: any) => {
    if (!confirm("حذف صفحة \"" + pg.title + "\" نهائياً؟")) return;
    try { await api("/admin/pages/" + pg.id, { method: "DELETE" }); toast("🗑️ حُذفت الصفحة"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
            <div>
              <h1 className="text-2xl font-black mb-1">📄 الصفحات المخصصة</h1>
              <p className="text-sm text-gray-500">صفحات HTML حرة: من نحن · الأسئلة · سياسات المنصة</p>
            </div>
            <button className="btn" onClick={() => { setForm(EMPTY); setEditing(true); }}>➕ صفحة جديدة</button>
          </div>

          {editing && (
            <div className="card mb-4" style={{ border: "2px solid var(--primary)" }}>
              <h3 className="font-black mb-2">{form.id ? "✏️ تعديل: " + form.title : "➕ صفحة جديدة"}</h3>
              <div className="grid md:grid-cols-2 gap-2 mb-2">
                <input className="input" placeholder="العنوان *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 shrink-0" dir="ltr">/p/</span>
                  <input className="input" placeholder="الرابط (about)" value={form.slug} disabled={!!form.id} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} dir="ltr" />
                </div>
                <input className="input" placeholder="عنوان SEO (اختياري)" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
                <input className="input" placeholder="وصف SEO (اختياري)" value={form.metaDesc} onChange={(e) => setForm({ ...form, metaDesc: e.target.value })} />
              </div>
              <label className="text-xs font-extrabold text-gray-500 block mb-1">📝 محتوى الصفحة (محرر حديث — يُعرض للزوار بنفس التنسيق)</label>
              <RichTextEditor value={form.content} onChange={(html) => setForm({ ...form, content: html })}
                placeholder="اكتب محتوى الصفحة: من نحن، الأسئلة الشائعة، السياسات…" minHeight={220} />
              <div className="flex flex-wrap gap-2 mb-3">
                {([["showInMenu", "في القائمة العلوية"], ["showInFooter", "في التذييل"], ["isActive", "نشطة"]] as const).map(([k, l]) => (
                  <button key={k} className="badge cursor-pointer"
                    style={{ background: form[k] ? "var(--primary)" : "#e5e7eb", color: form[k] ? "#fff" : "#374151" }}
                    onClick={() => setForm({ ...form, [k]: !form[k] })}>{l}</button>
                ))}
                <input className="input" type="number" placeholder="الترتيب" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: +e.target.value })} style={{ maxWidth: 100 }} />
              </div>
              <div className="flex gap-2">
                <button className="btn flex-1" onClick={save}>💾 حفظ الصفحة</button>
                <button className="btn btn-danger" onClick={() => { setEditing(false); setForm(EMPTY); }}>إلغاء</button>
              </div>
            </div>
          )}

          {pages.map((pg) => (
            <div key={pg.id} className="card mb-2">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <b>{pg.title}</b>
                  <a href={"/p/" + pg.slug} target="_blank" className="text-xs text-teal-600 mr-2 underline" dir="ltr">/p/{pg.slug} ↗</a>
                  <div className="text-xs text-gray-400 mt-1">👁️ {pg.views} مشاهدة · {pg.metaDesc ? "🔍 SEO ✓" : "⚠️ بلا وصف SEO"}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn" onClick={() => { setForm({ ...pg, metaTitle: pg.metaTitle || "", metaDesc: pg.metaDesc || "" }); setEditing(true); window.scrollTo(0, 0); }}>✏️ تعديل</button>
                  <button className="btn btn-danger" onClick={() => remove(pg)}>🗑️</button>
                </div>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                <button className="badge cursor-pointer" style={{ background: pg.isActive ? "#d1fae5" : "#fee2e2", color: pg.isActive ? "#065f46" : "#991b1b" }} onClick={() => toggle(pg, "isActive")}>{pg.isActive ? "✅ نشطة" : "🚫 معطلة"}</button>
                <button className="badge cursor-pointer" style={{ background: pg.showInMenu ? "#e0f2fe" : "#f3f4f6", color: pg.showInMenu ? "#075985" : "#6b7280" }} onClick={() => toggle(pg, "showInMenu")}>📋 القائمة</button>
                <button className="badge cursor-pointer" style={{ background: pg.showInFooter ? "#e0f2fe" : "#f3f4f6", color: pg.showInFooter ? "#075985" : "#6b7280" }} onClick={() => toggle(pg, "showInFooter")}>🦶 التذييل</button>
              </div>
            </div>
          ))}
          {pages.length === 0 && <div className="card text-center py-8 text-gray-400">لا صفحات — أنشئ صفحة "من نحن" أولاً</div>}
        </main>
      </div>
    </div>
  );
}
