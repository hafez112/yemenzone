"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api, imgUrl } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import RichTextEditor from "../../../components/RichTextEditor";
import ImageUpload from "../../../components/ImageUpload";
import VideoInput from "../../../components/VideoInput";

const EMPTY = {
  id: null as string | null,
  title: "", slug: "", excerpt: "", content: "",
  cover: "", videoUrl: "", category: "", tags: "", metaDesc: "",
  isPublished: false,
};

const stripHtml = (html?: string) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// 📰 مركز المحتوى — مقالات المدونة + SEO لكل مقال
export default function AdminBlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState(false);

  const load = () => api("/admin/blog").then(setPosts).catch((e) => toast(e.message, "error"));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return toast("⚠️ عنوان المقال مطلوب", "error");
    try {
      await api("/admin/blog", { method: "POST", body: JSON.stringify(form) });
      toast(form.id ? "✅ حُدّث المقال" : form.isPublished ? "📰 نُشر المقال" : "📝 حُفظت المسودة");
      setForm(EMPTY); setEditing(false); load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const togglePublish = async (p: any) => {
    try {
      await api("/admin/blog", { method: "POST", body: JSON.stringify({ id: p.id, isPublished: !p.isPublished }) });
      toast(p.isPublished ? "📥 أُعيد المقال مسودة" : "📰 نُشر المقال — يظهر الآن للزوار");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const remove = async (p: any) => {
    if (!confirm(`حذف مقال «${p.title}» نهائياً؟`)) return;
    try { await api(`/admin/blog/${p.id}`, { method: "DELETE" }); toast("🗑️ حُذف المقال"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const published = posts.filter((p) => p.isPublished).length;

  return (
    <main className="page">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
            <div>
              <h1 className="text-2xl font-black">📰 مدونة المنصة</h1>
              <p className="text-xs text-gray-500 mt-1">
                {published} منشور · {posts.length - published} مسودة — المقالات تجلب زواراً من قوقل
              </p>
            </div>
            <button className="btn primary" onClick={() => { setForm(EMPTY); setEditing(true); }}>➕ مقال جديد</button>
          </div>

          {/* المحرر */}
          {editing && (
            <div className="card anim-bounce-in">
              <h3 className="font-black mb-3">{form.id ? "✏️ تعديل مقال" : "📰 مقال جديد"}</h3>

              <input className="input" placeholder="عنوان المقال *" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />

              <div className="grid md:grid-cols-2 gap-2 mb-2">
                <input className="input" placeholder="الرابط (اختياري — يُولّد من العنوان)" value={form.slug} dir="ltr"
                  onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                <input className="input" placeholder="التصنيف (مثال: نصائح للتجار)" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>

              <input className="input" placeholder="وسوم مفصولة بفواصل (مثال: تجارة إلكترونية، اليمن، تسويق)" value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })} />

              <textarea className="input" rows={2} maxLength={400} placeholder="مقتطف قصير يظهر في القائمة (اختياري — يُقتطع من المحتوى)"
                value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />

              <label className="text-xs font-extrabold text-gray-500 block mb-1">📝 محتوى المقال</label>
              <RichTextEditor value={form.content} onChange={(html) => setForm({ ...form, content: html })}
                placeholder="اكتب المقال هنا — عناوين فرعية، قوائم، روابط…" />

              <div className="grid md:grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-xs font-extrabold text-gray-500 block mb-1">🖼️ صورة الغلاف</label>
                  <ImageUpload endpoint="/admin/blog/upload" value={form.cover}
                    onChange={(url) => setForm({ ...form, cover: url })} label="📷 رفع صورة من الجهاز" hint="تُضغط تلقائياً WebP" />
                </div>
                <VideoInput endpoint="/admin/blog/upload-video" value={form.videoUrl}
                  onChange={(url) => setForm({ ...form, videoUrl: url })} />
              </div>

              {/* SEO */}
              <div className="mt-3 p-3 rounded-2xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <label className="text-xs font-extrabold text-gray-500 block mb-1">🔎 وصف الظهور في قوقل (SEO)</label>
                <textarea className="input !mb-0" rows={2} maxLength={160}
                  placeholder="وصف مختصر وجذاب يظهر تحت العنوان في نتائج البحث..."
                  value={form.metaDesc} onChange={(e) => setForm({ ...form, metaDesc: e.target.value })} />
                <div className="text-[10px] text-gray-400 text-left mt-0.5" dir="ltr">{(form.metaDesc || "").length}/160</div>
              </div>

              <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  className="w-5 h-5 accent-purple-600" />
                <span className="text-sm font-bold">📰 نشر فوري — يظهر للزوار فور الحفظ</span>
              </label>

              <div className="flex gap-2 mt-3">
                <button className="btn primary flex-1" onClick={save}>💾 حفظ المقال</button>
                <button className="btn danger" onClick={() => { setEditing(false); setForm(EMPTY); }}>إلغاء</button>
              </div>
            </div>
          )}

          {/* القائمة */}
          {posts.length === 0 && !editing && (
            <div className="card text-center py-12">
              <div className="text-4xl mb-2">📰</div>
              <b>لا مقالات بعد</b>
              <p className="text-sm text-gray-500 mt-1">ابدأ بمقال تعريفي عن المنصة — المقالات ترفع ظهورك في قوقل</p>
            </div>
          )}
          {posts.map((p) => (
            <div key={p.id} className="assign-row card mb-2">
              {p.cover
                ? <img src={imgUrl(p.cover)} alt="" className="w-14 h-14 rounded-xl object-cover border shrink-0" />
                : <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center text-xl shrink-0">📰</div>}
              <div className="flex-1 min-w-0">
                <b>{p.title}</b>
                <span className="badge mr-1" style={p.isPublished ? { background: "#d1fae5", color: "#065f46" } : { background: "#fef3c7", color: "#92400e" }}>
                  {p.isPublished ? "📰 منشور" : "📝 مسودة"}
                </span>
                {p.category && <span className="badge mr-1" style={{ background: "#eef2ff", color: "#3730a3" }}>🏷️ {p.category}</span>}
                {p.videoUrl && <span className="badge mr-1" style={{ background: "#fdf2f8", color: "#be185d" }}>🎬</span>}
                {p.views > 0 && <span className="badge mr-1" style={{ background: "#ecfeff", color: "#0e7490" }}>👁️ {p.views}</span>}
                <div className="text-xs text-gray-400 truncate">
                  /blog/{p.slug} · {stripHtml(p.excerpt || p.content).slice(0, 80)}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="btn small" onClick={() => { setForm({
                  id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt || "", content: p.content || "",
                  cover: p.cover || "", videoUrl: p.videoUrl || "", category: p.category || "",
                  tags: p.tags || "", metaDesc: p.metaDesc || "", isPublished: p.isPublished,
                }); setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>✏️</button>
                <button className="btn small" onClick={() => togglePublish(p)}>{p.isPublished ? "📥" : "📰"}</button>
                <button className="btn small danger" onClick={() => remove(p)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
