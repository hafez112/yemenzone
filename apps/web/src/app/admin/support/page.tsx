"use client";
import { useEffect, useRef, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

// 🎧 إدارة الدعم الفني — تذاكر العملاء والبائعين + رد ذكي + لوحة الاقتراحات + الرد الآلي

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  open: { label: "⏳ مفتوحة", bg: "#fef3c7", color: "#92400e" },
  answered: { label: "💬 مُرّد عليها", bg: "#d1fae5", color: "#065f46" },
  closed: { label: "🔒 مغلقة", bg: "#f3f4f6", color: "#6b7280" },
};

const CATS: Record<string, { icon: string; label: string }> = {
  support: { icon: "🛠️", label: "دعم فني" },
  inquiry: { icon: "❓", label: "استفسار" },
  suggestion: { icon: "💡", label: "اقتراح" },
  complaint: { icon: "⚖️", label: "بلاغ" },
};

const IDEA_FLOW = [
  { id: "new", icon: "📥", label: "جديد" },
  { id: "studying", icon: "🔬", label: "قيد الدراسة" },
  { id: "planned", icon: "🗓️", label: "مخطط" },
  { id: "done", icon: "🎉", label: "تم التنفيذ" },
  { id: "declined", icon: "🙏", label: "مؤجل" },
];

const hourLabel = (h: number) => {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h < 12 ? "صباحاً" : "مساءً"}`;
};

const timeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return new Date(iso).toLocaleDateString("ar-YE", { day: "numeric", month: "short" });
};

export default function AdminSupportPage() {
  const [tab, setTab] = useState<"tickets" | "ideas" | "settings">("tickets");
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState({ status: "all", userType: "all", category: "all" });
  const [open, setOpen] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [draftSrc, setDraftSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ideas, setIdeas] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const load = () =>
    api(`/admin/support?status=${filter.status}&userType=${filter.userType}&category=${filter.category}`)
      .then(setData).catch((e) => toast(e.message, "error"));
  const loadIdeas = () => api("/admin/support/ideas").then(setIdeas).catch((e) => toast(e.message, "error"));
  const loadSettings = () => api("/admin/support/settings").then(setSettings).catch((e) => toast(e.message, "error"));

  useEffect(() => { load(); }, [filter]);
  useEffect(() => { if (tab === "ideas") loadIdeas(); if (tab === "settings") loadSettings(); }, [tab]);
  useEffect(() => { threadRef.current?.scrollTo({ top: 99999 }); }, [open?.messages?.length]);

  const sendReply = async () => {
    if (!reply.trim()) return toast("⚠️ اكتب الرد أولاً", "error");
    setBusy(true);
    try {
      const r = await api(`/admin/support/${open.id}/reply`, { method: "POST", body: JSON.stringify({ message: reply.trim() }) });
      toast("💬 أُرسل الرد ووصل تنبيه للمستخدم");
      setReply(""); setDraftSrc(null); setOpen(r.ticket); load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const makeDraft = async () => {
    setBusy(true);
    try {
      const r = await api(`/admin/support/${open.id}/ai-draft`, { method: "POST", body: "{}" });
      setReply(r.draft);
      setDraftSrc(r.source);
      toast(r.source === "external" ? "🌐 وُلّد الرد بالذكاء الخارجي وخُزّن" : `🤖 وُلّد الرد بالذكاء المحلي${r.topic ? ` (${r.topic})` : ""} وخُزّن — راجعه ثم أرسله`);
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await api(`/admin/support/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      toast(status === "closed" ? "🔒 أُغلقت التذكرة" : "↩️ أُعيد فتحها");
      if (open?.id === id) setOpen({ ...open, status });
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const setIdea = async (id: string, ideaStatus: string) => {
    try {
      await api(`/admin/support/${id}/idea-status`, { method: "POST", body: JSON.stringify({ ideaStatus }) });
      const lbl = IDEA_FLOW.find((s) => s.id === ideaStatus)?.label;
      toast(ideaStatus === "done" ? "🎉 نُفّذ الاقتراح ووصلت بشارة لصاحبه" : `💡 الاقتراح أصبح: ${lbl}`);
      loadIdeas(); load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      await api("/admin/support/settings", { method: "POST", body: JSON.stringify(settings) });
      toast("✅ حُفظت إعدادات الدعم");
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const tickets = data?.tickets || [];
  const counts = data?.counts || { open: 0, answered: 0, ideas: 0 };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🎧 الدعم الفني</h1>
          <p className="text-sm text-gray-500 mb-4">رسائل العملاء والبائعين — ردود يدوية أو ذكية، ورد آلي خارج الدوام، وأفكارهم تطوّر المنصة</p>

          {data?.insights && tab === "tickets" && (
            <div className="ai-card mb-4">
              {data.insights.map((t: string, i: number) => <div key={i} className="text-sm mb-1">🤖 {t}</div>)}
            </div>
          )}

          <div className="tabs">
            <button className={"tab" + (tab === "tickets" ? " active" : "")} onClick={() => setTab("tickets")}>🎫 التذاكر ({counts.open + counts.answered})</button>
            <button className={"tab" + (tab === "ideas" ? " active" : "")} onClick={() => setTab("ideas")}>💡 الاقتراحات ({counts.ideas})</button>
            <button className={"tab" + (tab === "settings" ? " active" : "")} onClick={() => setTab("settings")}>⚙️ الإعدادات</button>
          </div>

          {/* ════ التذاكر ════ */}
          {tab === "tickets" && !open && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="input !w-auto text-sm">
                  <option value="all">كل الحالات</option>
                  <option value="open">⏳ مفتوحة</option>
                  <option value="answered">💬 مُرّد عليها</option>
                  <option value="closed">🔒 مغلقة</option>
                </select>
                <select value={filter.userType} onChange={(e) => setFilter({ ...filter, userType: e.target.value })} className="input !w-auto text-sm">
                  <option value="all">👥 عملاء + بائعون</option>
                  <option value="customer">👤 العملاء</option>
                  <option value="seller">🏪 البائعون</option>
                </select>
                <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} className="input !w-auto text-sm">
                  <option value="all">كل الأنواع</option>
                  {Object.entries(CATS).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}
                </select>
              </div>

              {tickets.length === 0 ? (
                <div className="card p-8 text-center text-gray-400 font-bold">✨ لا تذاكر مطابقة — كل شيء تحت السيطرة</div>
              ) : (
                <div className="space-y-2">
                  {tickets.map((t: any) => {
                    const st = STATUS[t.status] || STATUS.open;
                    const cat = CATS[t.category] || CATS.support;
                    const last = (t.messages || [])[t.messages.length - 1];
                    return (
                      <button key={t.id} onClick={() => { setOpen(t); setReply(t.aiDraft || ""); setDraftSrc(t.aiDraft ? t.aiDraftSrc : null); }}
                        className="w-full card p-4 text-right hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${t.priority === "high" ? "bg-red-500 animate-pulse" : "bg-gray-300"}`} />
                          <span className="text-sm">{cat.icon}</span>
                          <span className="font-black text-sm flex-1 truncate">{t.subject}</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold text-gray-500">
                          <span className={`px-1.5 py-0.5 rounded-md ${t.userType === "seller" ? "bg-purple-50 text-purple-600" : "bg-teal-50 text-teal-600"}`}>
                            {t.userType === "seller" ? "🏪" : "👤"} {t.userName || "مستخدم"}
                          </span>
                          <span dir="ltr">{t.userPhone}</span>
                          <span className="mr-auto">{timeAgo(t.updatedAt)}</span>
                          {t.autoReplied && <span className="text-emerald-500">🤖 رُدّ آلياً</span>}
                        </div>
                        {last && <p className="text-xs text-gray-400 font-bold truncate mt-1.5">{last.from === "user" ? "👤 " : last.from === "ai" ? "🤖 " : "🛡️ "}{last.text}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ════ محادثة واحدة ════ */}
          {tab === "tickets" && open && (
            <div className="card overflow-hidden !p-0">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-start gap-3">
                  <button onClick={() => { setOpen(null); setReply(""); setDraftSrc(null); load(); }} className="w-9 h-9 rounded-xl bg-white border border-gray-200 font-black text-gray-500 shrink-0">→</button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {open.priority === "high" && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">🔴 عاجلة</span>}
                      <span>{(CATS[open.category] || CATS.support).icon}</span>
                      <h2 className="font-black">{open.subject}</h2>
                    </div>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      {open.userType === "seller" ? "🏪 بائع" : "👤 عميل"}: {open.userName} — <span dir="ltr">{open.userPhone}</span> • {timeAgo(open.createdAt)}
                    </p>
                  </div>
                  <button onClick={() => setStatus(open.id, open.status === "closed" ? "open" : "closed")}
                    className={`text-xs font-extrabold px-3 py-2 rounded-xl shrink-0 ${open.status === "closed" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                    {open.status === "closed" ? "↩️ إعادة فتح" : "🔒 إغلاق"}
                  </button>
                </div>

                {/* 💡 مسار الاقتراح */}
                {open.category === "suggestion" && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-200">
                    <span className="text-[10px] font-extrabold text-violet-500 self-center">💡 مسار الاقتراح:</span>
                    {IDEA_FLOW.map((s) => (
                      <button key={s.id} onClick={() => setIdea(open.id, s.id)}
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full transition-all ${(open.ideaStatus || "new") === s.id ? "bg-violet-500 text-white shadow" : "bg-white border border-gray-200 text-gray-500 hover:border-violet-300"}`}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div ref={threadRef} className="p-4 space-y-3 max-h-[40vh] overflow-y-auto">
                {(open.messages || []).map((m: any, i: number) => (
                  <div key={i} className={`flex ${m.from === "user" ? "justify-start" : "justify-start flex-row-reverse"}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-line ${
                      m.from === "user"
                        ? "bg-white border border-gray-200 text-gray-700 rounded-tr-md"
                        : m.from === "ai"
                          ? "bg-emerald-50 border border-emerald-200 text-gray-700 rounded-tl-md"
                          : "bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-tl-md"
                    }`}>
                      <p className={`text-[9px] font-extrabold mb-1 ${m.from === "user" ? "text-teal-600" : m.from === "ai" ? "text-emerald-600" : "text-white/70"}`}>
                        {m.from === "user" ? `${open.userType === "seller" ? "🏪" : "👤"} ${open.userName}` : m.from === "ai" ? "🤖 رد آلي" : "🛡️ الإدارة"} • {timeAgo(m.at)}
                      </p>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {open.status !== "closed" && (
                <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex gap-2">
                    <button onClick={makeDraft} disabled={busy}
                      className="text-xs font-extrabold px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white disabled:opacity-50 shrink-0">
                      {busy ? "⏳" : "🤖 رد ذكي"}
                    </button>
                    {draftSrc && (
                      <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full self-center ${draftSrc === "external" ? "bg-sky-100 text-sky-600" : "bg-emerald-100 text-emerald-600"}`}>
                        {draftSrc === "external" ? "🌐 ذكاء خارجي" : "🤖 ذكاء محلي"} — مخزّن
                      </span>
                    )}
                  </div>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
                    placeholder="اكتب رد الإدارة... أو ولّد رداً ذكياً ثم عدّله"
                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-violet-400 resize-none" />
                  <button onClick={sendReply} disabled={busy}
                    className="w-full py-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-black text-sm disabled:opacity-50">
                    {busy ? "⏳ جارٍ الإرسال..." : "📨 إرسال الرد مع تنبيه المستخدم"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════ لوحة الاقتراحات ════ */}
          {tab === "ideas" && ideas && (
            <>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {IDEA_FLOW.map((s) => (
                  <div key={s.id} className="card p-3 text-center">
                    <div className="text-lg">{s.icon}</div>
                    <div className="text-xl font-black">{ideas.funnel?.[s.id] || 0}</div>
                    <div className="text-[9px] font-extrabold text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-gray-500 mb-3 bg-violet-50 border border-violet-100 rounded-2xl p-3">
                💡 هذه أفكار عملائك وبائعيك لتطوير المنصة — حرّك كل اقتراح في مساره، وعند «تم التنفيذ» تصل صاحبه بشارة شكر تلقائية 🎉
              </p>
              {ideas.ideas.length === 0 ? (
                <div className="card p-8 text-center text-gray-400 font-bold">💡 لا اقتراحات بعد — ستظهر هنا أفكار المستخدمين فور وصولها</div>
              ) : (
                <div className="space-y-2">
                  {ideas.ideas.map((t: any) => {
                    const first = (t.messages || [])[0];
                    return (
                      <div key={t.id} className="card p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span>💡</span>
                          <span className="font-black text-sm flex-1">{t.subject}</span>
                          <span className="text-[10px] font-bold text-gray-400">{timeAgo(t.updatedAt)}</span>
                        </div>
                        {first && <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line mb-2 bg-gray-50 rounded-xl p-2.5">{first.text}</p>}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${t.userType === "seller" ? "bg-purple-50 text-purple-600" : "bg-teal-50 text-teal-600"}`}>
                            {t.userType === "seller" ? "🏪" : "👤"} {t.userName}
                          </span>
                          {IDEA_FLOW.map((s) => (
                            <button key={s.id} onClick={() => setIdea(t.id, s.id)}
                              className={`text-[10px] font-extrabold px-2 py-1 rounded-full transition-all ${(t.ideaStatus || "new") === s.id ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-violet-100"}`}>
                              {s.icon} {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ════ الإعدادات ════ */}
          {tab === "settings" && settings && (
            <div className="card p-5 space-y-4 max-w-lg">
              <h2 className="font-black">🤖 الرد الآلي الذكي</h2>
              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-2xl p-3">
                <input type="checkbox" checked={!!settings.autoReplyEnabled}
                  onChange={(e) => setSettings({ ...settings, autoReplyEnabled: e.target.checked })}
                  className="w-5 h-5 accent-violet-600" />
                <div>
                  <div className="font-extrabold text-sm">تفعيل الرد الآلي خارج الدوام</div>
                  <div className="text-[11px] text-gray-400 font-bold">الذكاء المحلي يرد فوراً على المستخدم في الأوقات المحددة — وتبقى التذكرة مفتوحة للإدارة</div>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-gray-500 block mb-1">يبدأ الرد الآلي من</label>
                  <select value={settings.autoFrom} onChange={(e) => setSettings({ ...settings, autoFrom: Number(e.target.value) })} className="input">
                    {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-gray-500 block mb-1">يتوقف الرد الآلي عند</label>
                  <select value={settings.autoTo} onChange={(e) => setSettings({ ...settings, autoTo: Number(e.target.value) })} className="input">
                    {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-[11px] font-bold text-gray-500 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                ⏰ الوضع الحالي: الدوام {hourLabel(settings.autoTo)} — {hourLabel(settings.autoFrom)}، والرد الآلي يعمل من {hourLabel(settings.autoFrom)} حتى {hourLabel(settings.autoTo)}
              </p>

              <div>
                <label className="text-xs font-extrabold text-gray-500 block mb-1">عبارة ساعات الدوام (تظهر للمستخدمين)</label>
                <input value={settings.workNote} onChange={(e) => setSettings({ ...settings, workNote: e.target.value })}
                  className="input" maxLength={120} />
              </div>

              <div className="text-[11px] font-bold text-gray-500 bg-sky-50 border border-sky-100 rounded-xl p-2.5 leading-relaxed">
                🧠 <strong>مصدر الردود الذكية:</strong> الافتراضي الذكاء المحلي (قاعدة معرفة يمن زون — مجاني وفوري).
                عند تفعيل الذكاء الخارجي من <a href="/admin/ai" className="text-sky-600 underline">مركز الذكاء الاصطناعي</a> تُستخدم مسودات الرد الخارجية تلقائياً.
              </div>

              <button onClick={saveSettings} disabled={busy}
                className="w-full py-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-black disabled:opacity-50">
                {busy ? "⏳..." : "💾 حفظ الإعدادات"}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
