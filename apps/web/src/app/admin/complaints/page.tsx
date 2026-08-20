"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  open: { label: "⏳ مفتوحة", bg: "#fef3c7", color: "#92400e" },
  replied: { label: "💬 مُرّد عليها", bg: "#d1fae5", color: "#065f46" },
  closed: { label: "🔒 مغلقة", bg: "#f3f4f6", color: "#6b7280" },
};

export default function AdminComplaintsPage() {
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [openReply, setOpenReply] = useState<string | null>(null);

  const load = () => api("/admin/complaints").then(setData).catch((e) => toast(e.message, "error"));
  useEffect(() => { load(); }, []);

  const sendReply = async (c: any) => {
    const reply = (replyText[c.id] || "").trim();
    if (!reply) return toast("⚠️ اكتب الرد أولاً", "error");
    try {
      await api("/admin/complaints/" + c.id + "/reply", { method: "POST", body: JSON.stringify({ reply }) });
      toast("💬 أُرسل الرد وأُغلقت الشكوى كمُرّد عليها");
      setOpenReply(null); load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const setStatus = async (c: any, status: string) => {
    try {
      await api("/admin/complaints/" + c.id + "/status", { method: "POST", body: JSON.stringify({ status }) });
      toast(status === "closed" ? "🔒 أُغلقت الشكوى" : "↩️ أُعيد فتحها");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const list = (data?.complaints || []).filter((c: any) => filter === "all" || c.status === filter);
  const counts = { open: 0, replied: 0, closed: 0 };
  (data?.complaints || []).forEach((c: any) => { counts[c.status as keyof typeof counts]++; });

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">📣 الشكاوى</h1>
          <p className="text-sm text-gray-500 mb-4">شكاوى العملاء والزوار مع تصنيف وردود مقترحة بالذكاء المحلي</p>

          {data?.insights && (
            <div className="ai-card mb-4">
              {data.insights.map((t: string, i: number) => <div key={i} className="text-sm mb-1">🤖 {t}</div>)}
            </div>
          )}

          <div className="tabs">
            {([["all", "الكل"], ["open", `مفتوحة (${counts.open})`], ["replied", `مُرّد عليها (${counts.replied})`], ["closed", `مغلقة (${counts.closed})`]] as const).map(([k, l]) => (
              <button key={k} className={"tab" + (filter === k ? " active" : "")} onClick={() => setFilter(k as any)}>{l}</button>
            ))}
          </div>

          {list.map((c: any) => {
            const st = STATUS[c.status];
            return (
              <div key={c.id} className="card mb-2">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <b>{c.subject}</b>
                      <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <span className="badge" style={{ background: "#eef2ff", color: "#3730a3" }}>{c.category}</span>
                      {c.priority === "high" && <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>🚨 عالية</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      <code style={{ fontFamily: "monospace" }}>{c.number}</code> · 👤 {c.name} · 📱 <a href={"tel:" + c.phone} className="underline">{c.phone}</a> · {new Date(c.createdAt).toLocaleString("ar-YE")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {c.status !== "closed" && (
                      <button className="btn" onClick={() => { setOpenReply(openReply === c.id ? null : c.id); setReplyText({ ...replyText, [c.id]: replyText[c.id] || c.suggestedReply }); }}>
                        💬 {c.reply ? "رد جديد" : "رد"}
                      </button>
                    )}
                    {c.status !== "closed"
                      ? <button className="btn btn-danger" onClick={() => setStatus(c, "closed")}>🔒</button>
                      : <button className="btn" onClick={() => setStatus(c, "open")}>↩️</button>}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 mt-2 text-sm">{c.message}</div>

                {c.reply && (
                  <div className="p-3 rounded-2xl mt-2 text-sm" style={{ background: "#f0fdfa", border: "1px solid #99f6e4" }}>
                    <b className="text-xs" style={{ color: "#0f766e" }}>💬 ردك السابق:</b> {c.reply}
                  </div>
                )}

                {openReply === c.id && (
                  <div className="mt-2">
                    <textarea className="input w-full mb-2" rows={3} value={replyText[c.id] || ""} onChange={(e) => setReplyText({ ...replyText, [c.id]: e.target.value })} />
                    <div className="flex gap-2">
                      <button className="btn flex-1" onClick={() => sendReply(c)}>📤 إرسال الرد</button>
                      <button className="btn" style={{ background: "#6b7280" }} onClick={() => setReplyText({ ...replyText, [c.id]: c.suggestedReply })}>🤖 الرد المقترح</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {list.length === 0 && <div className="card text-center py-8 text-gray-400">لا شكاوى هنا ✅</div>}
        </main>
      </div>
    </div>
  );
}
