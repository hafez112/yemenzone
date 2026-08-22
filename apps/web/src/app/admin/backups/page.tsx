"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import OffsiteBackupPanel from "../../../components/admin/OffsiteBackupPanel";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "";

function fmtSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " ك.ب";
  return (bytes / 1024 / 1024).toFixed(1) + " م.ب";
}

export default function AdminBackupsPage() {
  const [data, setData] = useState<any>(null);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => api("/admin/backups").then(setData).catch((e) => toast(e.message, "error"));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    try {
      const r = await api("/admin/backups", { method: "POST", body: JSON.stringify({ note }) });
      toast(`✅ أُنشئت النسخة — ${Number(r.totalRows || 0).toLocaleString("en")} سجل`);
      setNote(""); load();
    } catch (e: any) { toast(e.message, "error"); }
    setCreating(false);
  };

  const download = async (b: any) => {
    try {
      const res = await fetch(API + "/api/admin/backups/download/" + b.filename, {
        headers: { Authorization: "Bearer " + localStorage.getItem("yz_token") },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "فشل التحميل");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = b.filename; a.click();
      URL.revokeObjectURL(url);
      toast("⬇️ حُمّلت النسخة — احفظها بمكان آمن خارج الخادم");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const remove = async (b: any) => {
    if (!confirm("حذف النسخة " + b.filename + " نهائياً؟")) return;
    try { await api("/admin/backups/" + b.id, { method: "DELETE" }); toast("🗑️ حُذفت النسخة"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  // ♻️ الاستعادة — بتأكيد مكتوب لخطورتها
  const [restoreTarget, setRestoreTarget] = useState<any>(null);
  const [restorePhrase, setRestorePhrase] = useState("");
  const [restoring, setRestoring] = useState(false);
  const restore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const d = await api(`/admin/backups/${restoreTarget.id}/restore`, { method: "POST", body: JSON.stringify({}) });
      toast(`♻️ تمت الاستعادة بنجاح — ${Number(d.restored || 0).toLocaleString("en")} سجل في ${d.tables} جدولاً`);
      setRestoreTarget(null); setRestorePhrase(""); load();
    } catch (e: any) { toast(e.message, "error"); }
    setRestoring(false);
  };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">💾 النسخ الاحتياطي</h1>
          <p className="text-sm text-gray-500 mb-4">
            تصدير كامل قاعدة البيانات ({data?.tableCount || 56} جدول — يشمل المدونة والتوثيق والإحالات والنقاط والإعلانات) بملف JSON واحد
          </p>

          {/* ملخص سريع */}
          {data && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="card !mb-0 !p-3 text-center">
                <div className="text-xl font-black">{data.backups.length}</div>
                <div className="text-[10px] text-gray-400 font-bold">نسخة محفوظة</div>
              </div>
              <div className="card !mb-0 !p-3 text-center">
                <div className="text-xl font-black">{fmtSize(data.totalSize)}</div>
                <div className="text-[10px] text-gray-400 font-bold">الحجم الإجمالي</div>
              </div>
              <div className="card !mb-0 !p-3 text-center">
                <div className="text-xl font-black" style={{ color: data.backups.some((b: any) => !b.exists) ? '#dc2626' : '#059669' }}>
                  {data.backups.filter((b: any) => b.exists).length === data.backups.length ? '✅' : '⚠️'}
                </div>
                <div className="text-[10px] text-gray-400 font-bold">سلامة الملفات</div>
              </div>
            </div>
          )}

          {data?.tips && (
            <div className="ai-card mb-4">
              <h3 className="font-black mb-2">🤖 صحّة النسخ</h3>
              {data.tips.map((t: string, i: number) => <div key={i} className="text-sm mb-1">• {t}</div>)}
            </div>
          )}

          {/* 🛡️ النسخ الخارجي التلقائي — الحماية من فقدان السيرفر */}
          <OffsiteBackupPanel />

          <div className="card mb-4">
            <h3 className="font-black mb-2">➕ نسخة جديدة الآن</h3>
            <div className="flex gap-2 flex-wrap">
              <input className="input flex-1" placeholder="ملاحظة (اختياري — مثال: قبل تحديث الخطة)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn" onClick={create} disabled={creating}>{creating ? "⏳ جارٍ التصدير…" : "💾 إنشاء نسخة"}</button>
            </div>
          </div>

          {(data?.backups || []).map((b: any) => (
            <div key={b.id} className="assign-row card mb-2">
              <div className="flex-1">
                <b style={{ fontFamily: "monospace", fontSize: 13 }}>{b.filename}</b>
                {!b.exists && <span className="badge mr-1" style={{ background: "#fee2e2", color: "#991b1b" }}>⚠️ الملف مفقود من القرص</span>}
                <div className="text-xs text-gray-500 mt-1">
                  📦 {fmtSize(b.size)} · 🗓️ {new Date(b.createdAt).toLocaleString("ar-YE")}
                  {b.note && <span> · 📝 {b.note}</span>}
                </div>
              </div>
              <button className="btn" style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}
                onClick={() => { setRestoreTarget(b); setRestorePhrase(""); }} disabled={!b.exists}>♻️ استعادة</button>
              <button className="btn" onClick={() => download(b)} disabled={!b.exists}>⬇️ تحميل</button>
              <button className="btn btn-danger" onClick={() => remove(b)}>🗑️</button>
            </div>
          ))}

          {/* ♻️ نافذة تأكيد الاستعادة */}
          {restoreTarget && (
            <div className="fixed inset-0 bg-black/70 z-[70] flex items-end sm:items-center justify-center p-3"
              onClick={() => setRestoreTarget(null)}>
              <div className="card w-full max-w-md anim-bounce-in" onClick={e => e.stopPropagation()}>
                <h2 className="font-extrabold mb-1" style={{ color: "#dc2626" }}>♻️ استعادة نسخة احتياطية</h2>
                <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: "monospace", direction: "ltr", textAlign: "right" }}>{restoreTarget.filename}</p>
                <p className="text-sm mb-3">
                  ستُستبدل <b>كل البيانات الحالية</b> بمحتوى هذه النسخة ({new Date(restoreTarget.createdAt).toLocaleString("ar-YE")}).
                  العملية آمنة: تتم داخل معاملة واحدة — إما تنجح كاملة أو لا يتغيّر شيء.
                </p>
                <p className="text-sm font-bold mb-2" style={{ color: "#b91c1c" }}>اكتب عبارة التأكيد: استعادة</p>
                <input className="input mb-3" value={restorePhrase} onChange={(e) => setRestorePhrase(e.target.value)} placeholder="استعادة" />
                <div className="flex gap-2">
                  <button className="btn btn-danger flex-1" style={{ justifyContent: "center" }}
                    disabled={restoring || restorePhrase.trim() !== "استعادة"} onClick={restore}>
                    {restoring ? "⏳ جاري الاستعادة..." : "♻️ تنفيذ الاستعادة نهائياً"}
                  </button>
                  <button className="btn" onClick={() => setRestoreTarget(null)}>إلغاء</button>
                </div>
              </div>
            </div>
          )}
          {data && data.backups.length === 0 && (
            <div className="card text-center py-8 text-gray-400">لا نسخ بعد — أنشئ أول نسخة احتياطية الآن 🚨</div>
          )}
        </main>
      </div>
    </div>
  );
}
