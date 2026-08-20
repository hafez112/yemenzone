"use client";
import { useEffect, useRef, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

// 🗂️ مدير ملفات المنصة — كل الملفات في قاعدة البيانات مع تنظيم بالمجلدات
const fmtSize = (b: number) => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
const isImage = (mime: string) => mime?.startsWith("image/");

export default function AdminFilesPage() {
  const [data, setData] = useState<any>(null);
  const [folder, setFolder] = useState("");
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = (f = folder, query = q) =>
    api(`/admin/files?folder=${encodeURIComponent(f)}${query ? "&q=" + encodeURIComponent(query) : ""}`)
      .then(setData)
      .catch((e) => toast(e.message, "error"));
  useEffect(() => { load("", ""); }, []);

  const goFolder = (f: string) => { setFolder(f); setQ(""); load(f, ""); };
  const search = () => load(folder, q);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    const token = localStorage.getItem("yz_token");
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        const res = await fetch(`${base}/api/admin/files/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.message || "فشل الرفع");
        ok++;
      } catch (e: any) { toast(`⚠️ ${file.name}: ${e.message}`, "error"); }
    }
    if (ok) toast(`✅ رُفع ${ok} ملف بنجاح`);
    setUploading(false);
    load();
  };

  const copyUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    navigator.clipboard?.writeText(`${base}${path}`).then(
      () => toast("📋 نُسخ رابط الملف"),
      () => toast(path),
    );
  };

  const doRename = async (id: string) => {
    if (!renameVal.trim()) return setRenaming(null);
    try { await api(`/admin/files/${id}/rename`, { method: "PATCH", body: JSON.stringify({ name: renameVal }) }); toast("✏️ تمت إعادة التسمية"); setRenaming(null); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const move = async (id: string, target: string) => {
    try { await api(`/admin/files/${id}/move`, { method: "PATCH", body: JSON.stringify({ folder: target }) }); toast(target ? `📁 نُقل إلى «${target}»` : "📁 نُقل للجذر"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`حذف «${name}» نهائياً من القرص وقاعدة البيانات؟`)) return;
    try { await api(`/admin/files/${id}`, { method: "DELETE" }); toast("🗑️ حُذف الملف"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const createFolder = () => {
    const f = newFolder.trim();
    if (!f) return;
    goFolder(f);
    setNewFolder("");
    toast(`📁 المجلد «${f}» جاهز — ارفع فيه أول ملف`);
  };

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>🗂️ مدير الملفات</h1>

          {data && (
            <div className="row" style={{ gap: ".5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "#ede9fe", color: "#6d28d9" }}>📦 {data.stats.count} ملف</span>
              <span className="badge" style={{ background: "#d1fae5", color: "#065f46" }}>💾 {fmtSize(data.stats.bytes)}</span>
              <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>📁 {data.folders.length} مجلد</span>
            </div>
          )}

          {/* التنقل والرفع */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <div className="row" style={{ flexWrap: "wrap", gap: ".5rem" }}>
              <button className={"btn small " + (!folder ? "primary" : "ghost")} onClick={() => goFolder("")}>🏠 الجذر</button>
              {(data?.folders || []).map((f: any) => (
                <button key={f.name} className={"btn small " + (folder === f.name ? "primary" : "ghost")} onClick={() => goFolder(f.name)}>
                  📁 {f.name} ({f.count})
                </button>
              ))}
            </div>
            <div className="row" style={{ marginTop: ".75rem", flexWrap: "wrap", gap: ".5rem" }}>
              <input placeholder="مجلد جديد..." value={newFolder} onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolder()} style={{ maxWidth: 160 }} />
              <button className="btn small ghost" onClick={createFolder}>＋ مجلد</button>
              <input placeholder="🔍 بحث بالاسم..." value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()} style={{ flex: 1, minWidth: 120 }} />
              <button className="btn small ghost" onClick={search}>بحث</button>
              <input ref={inputRef} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
              <button className="btn primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? "⏳ جاري الرفع..." : "⬆️ رفع ملفات"}
              </button>
            </div>
            {folder && <p className="muted small" style={{ marginTop: ".5rem" }}>📂 الموقع الحالي: /uploads/files/{folder}/</p>}
          </section>

          {/* الملفات */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: ".75rem" }}>
            {(data?.files || []).map((f: any) => (
              <div key={f.id} className="card" style={{ padding: ".6rem", marginBottom: 0 }}>
                {isImage(f.mime) ? (
                  <img src={(process.env.NEXT_PUBLIC_API_URL || "") + f.path} alt={f.name}
                    style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: ".6rem", marginBottom: ".4rem" }} />
                ) : (
                  <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", background: "#f3f4f6", borderRadius: ".6rem", marginBottom: ".4rem" }}>
                    {f.mime?.includes("pdf") ? "📕" : f.mime?.includes("video") ? "🎬" : f.mime?.includes("audio") ? "🎵" : "📄"}
                  </div>
                )}
                {renaming === f.id ? (
                  <div className="row" style={{ gap: ".25rem" }}>
                    <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && doRename(f.id)} style={{ fontSize: ".75rem", padding: ".3rem", flex: 1, minWidth: 0 }} />
                    <button className="btn small primary" onClick={() => doRename(f.id)}>✓</button>
                  </div>
                ) : (
                  <div title={f.name} style={{ fontSize: ".75rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                )}
                <div className="muted" style={{ fontSize: ".65rem" }}>{fmtSize(f.size)} · {new Date(f.createdAt).toLocaleDateString("ar-YE")}</div>
                <div className="row" style={{ gap: ".25rem", marginTop: ".4rem", flexWrap: "wrap" }}>
                  <button className="btn small ghost" title="نسخ الرابط" onClick={() => copyUrl(f.path)}>🔗</button>
                  <button className="btn small ghost" title="إعادة تسمية" onClick={() => { setRenaming(f.id); setRenameVal(f.name); }}>✏️</button>
                  <button className="btn small ghost" title="نقل للجذر/مجلد"
                    onClick={() => { const t = prompt("المجلد الهدف (فارغ = الجذر):", folder ? "" : ""); if (t !== null) move(f.id, t.trim()); }}>📁</button>
                  <button className="btn small danger" title="حذف" onClick={() => del(f.id, f.name)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
          {data && data.files.length === 0 && (
            <section className="card" style={{ textAlign: "center", padding: "2.5rem", color: "#9ca3af" }}>
              هذا المجلد فارغ — ارفع أول ملف بزر «⬆️ رفع ملفات»
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
