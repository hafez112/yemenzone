"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const PERMS: Record<string, string> = {
  stores: "المتاجر والتجار", customers: "العملاء", reviews: "التقييمات",
  supervision: "الإشراف", plans: "الخطط", drivers: "التوصيل", messaging: "المراسلة",
  payments: "المدفوعات", cards: "البطاقات", finance: "المالية", security: "الأمن", design: "التصميم",
  files: "مدير الملفات", system: "النظام",
};
const LEVEL: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "🚨 تهديد مرتفع", color: "#dc2626", bg: "#fef2f2" },
  medium: { label: "⚠️ تهديد متوسط", color: "#d97706", bg: "#fffbeb" },
  low: { label: "✅ آمن", color: "#059669", bg: "#ecfdf5" },
};
const EVENT_AR: Record<string, string> = {
  "login_fail": "فشل دخول", "admin_login_fail": "فشل دخول إدارة", "login_success": "دخول ناجح", "admin_login_success": "دخول إدارة",
  "otp_sent": "إرسال OTP", "register_success": "تسجيل جديد", "driver_login": "دخول سائق", "driver_order_status": "تحديث طلب سائق",
  "driver.login_failed": "فشل دخول سائق", "admin.ip_banned": "حظر IP", "admin.ip_unbanned": "رفع حظر",
  "admin.created": "إضافة مدير", "admin.updated": "تعديل مدير", "admin.deleted": "حذف مدير",
  "admin.self_updated": "مدير حدّث حسابه",
  "file_upload": "🗂️ رفع ملف", "file_delete": "🗑️ حذف ملف", "admin_delivery_link": "🔗 ربط توصيل بمتجر",
  "commission_charged": "🤝 خصم عمولة", "commission_store_set": "🎯 عمولة مخصصة لمتجر",
  "settlement_issued": "📋 إصدار كشف تسوية", "settlement_paid": "✅ تسوية كشف",
  "cart_reminded": "🛒 تذكير بسلة مهجورة",
  "card.redeem_failed": "فشل شحن بطاقة", "admin.device_approved": "اعتماد جهاز", "admin.device_blocked": "حظر جهاز",
  "security.auto_ban": "🤖 حظر تلقائي (حماية)", "admin.session_revoked": "إنهاء جلسة عن بُعد",
  "security.captcha_fail": "🤖 فشل تحقق لست روبوت", "security.waf_block": "🧱 صد هجوم (WAF)",
  "security.bad_ua": "🤖 طلب آلي مشبوه", "security.shield_update": "🛡️ تحديث إعدادات الدرع",
};

export default function AdminSecurityPage() {
  const [tab, setTab] = useState<"overview" | "logs" | "bans" | "devices" | "admins" | "sessions" | "shield">("overview");
  const [shield, setShield] = useState<any>(null);
  const [shieldForm, setShieldForm] = useState<any>(null);
  const [savingShield, setSavingShield] = useState(false);
  const [ov, setOv] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState({ event: "", ip: "", userType: "" });
  const [bans, setBans] = useState<any[]>([]);
  const [banForm, setBanForm] = useState({ ip: "", reason: "", days: "" });
  const [devices, setDevices] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "", permissions: [] as string[] });
  const [showNew, setShowNew] = useState(false);
  const [editPerms, setEditPerms] = useState<Record<number, string[]>>({});
  const [editPass, setEditPass] = useState<Record<number, string>>({});
  const [editName, setEditName] = useState<Record<string, string>>({});

  const loadOverview = () => api("/admin/security/overview").then(setOv).catch((e) => toast(e.message, "error"));
  const loadLogs = () => {
    const q = new URLSearchParams(Object.entries(logFilter).filter(([, v]) => v) as any).toString();
    api("/admin/security/logs" + (q ? "?" + q : "")).then(setLogs).catch((e) => toast(e.message, "error"));
  };
  const loadBans = () => api("/admin/security/bans").then(setBans).catch((e) => toast(e.message, "error"));
  const loadDevices = () => api("/admin/security/devices").then(setDevices).catch((e) => toast(e.message, "error"));
  const loadAdmins = () => api("/admin/admins").then(setAdmins).catch((e) => toast(e.message, "error"));
  const loadSessions = () => api("/admin/security/sessions").then(setSessions).catch((e) => toast(e.message, "error"));
  const loadShield = () => api("/admin/security/shield").then((r) => { setShield(r); setShieldForm({ ...r.config, mirrors: (r.config.mirrors || []).join("\n") }); }).catch((e) => toast(e.message, "error"));

  useEffect(() => { loadOverview(); api("/admin/me").then(setMe).catch(() => {}); }, []);
  useEffect(() => {
    if (tab === "logs") loadLogs();
    if (tab === "bans") loadBans();
    if (tab === "devices") loadDevices();
    if (tab === "admins") loadAdmins();
    if (tab === "sessions") loadSessions();
    if (tab === "shield") loadShield();
  }, [tab]);

  const saveShield = async () => {
    setSavingShield(true);
    try {
      await api("/admin/security/shield", {
        method: "POST",
        body: JSON.stringify({
          ...shieldForm,
          rateGlobalPerMin: +shieldForm.rateGlobalPerMin,
          rateAuthPerMin: +shieldForm.rateAuthPerMin,
          mirrors: shieldForm.mirrors.split("\n").map((m: string) => m.trim()).filter(Boolean),
        }),
      });
      toast("✅ حُفظت إعدادات الدرع — سارية فوراً على كل الطلبات");
      loadShield();
    } catch (e: any) { toast(e.message, "error"); }
    setSavingShield(false);
  };

  // 📥 تصدير سجل الأحداث كملف CSV
  const exportCsv = async () => {
    try {
      const q = new URLSearchParams(Object.entries(logFilter).filter(([, v]) => v) as any).toString();
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "") + "/api/admin/security/logs-export" + (q ? "?" + q : ""), {
        headers: { Authorization: "Bearer " + (localStorage.getItem("yz_token") || "") },
      });
      if (!res.ok) throw new Error("فشل التصدير");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "security-logs.csv"; link.click();
      URL.revokeObjectURL(url);
      toast("✅ تم تصدير السجل");
    } catch (e: any) { toast(e.message, "error"); }
  };

  // 🔑 إنهاء جلسة عن بُعد
  const revokeSession = async (id: string) => {
    if (!confirm("إنهاء هذه الجلسة؟ سيُطلب من المستخدم تسجيل الدخول مجدداً")) return;
    try {
      await api("/admin/security/sessions/" + id + "/revoke", { method: "POST" });
      toast("✅ أُنهيت الجلسة");
      loadSessions(); loadOverview();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const banIp = async () => {
    if (!banForm.ip.trim()) return toast("⚠️ أدخل عنوان IP", "error");
    try {
      await api("/admin/security/bans", { method: "POST", body: JSON.stringify({ ip: banForm.ip.trim(), reason: banForm.reason, days: banForm.days ? +banForm.days : undefined }) });
      toast("✅ تم حظر " + banForm.ip);
      setBanForm({ ip: "", reason: "", days: "" });
      loadBans(); loadOverview();
    } catch (e: any) { toast(e.message, "error"); }
  };
  const unban = async (ip: string) => {
    try { await api("/admin/security/bans/" + encodeURIComponent(ip), { method: "DELETE" }); toast("✅ رُفع الحظر عن " + ip); loadBans(); loadOverview(); }
    catch (e: any) { toast(e.message, "error"); }
  };
  const setDevice = async (id: number, status: string) => {
    try {
      await api("/admin/security/devices/" + id + "/status", { method: "POST", body: JSON.stringify({ status }) });
      toast(status === "approved" ? "✅ تم اعتماد الجهاز" : "🚫 تم حظر الجهاز");
      loadDevices(); loadOverview();
    } catch (e: any) { toast(e.message, "error"); }
  };
  const createAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) return toast("⚠️ أكمل جميع الحقول", "error");
    try {
      await api("/admin/admins", { method: "POST", body: JSON.stringify(newAdmin) });
      toast("✅ أُضيف المدير " + newAdmin.email);
      setNewAdmin({ name: "", email: "", password: "", permissions: [] });
      setShowNew(false); loadAdmins();
    } catch (e: any) { toast(e.message, "error"); }
  };
  const savePerms = async (id: number) => {
    try {
      await api("/admin/admins/" + id, { method: "POST", body: JSON.stringify({ permissions: editPerms[id] || [] }) });
      toast("✅ حُدّثت الصلاحيات"); loadAdmins();
    } catch (e: any) { toast(e.message, "error"); }
  };
  const savePass = async (id: number) => {
    const password = editPass[id] || "";
    if (password.length < 8) return toast("⚠️ كلمة المرور 8 أحرف على الأقل", "error");
    try {
      await api("/admin/admins/" + id, { method: "POST", body: JSON.stringify({ password }) });
      toast("✅ حُدّثت كلمة المرور");
      setEditPass({ ...editPass, [id]: "" });
    } catch (e: any) { toast(e.message, "error"); }
  };
  const saveName = async (id: string) => {
    const name = (editName[id] || "").trim();
    if (name.length < 2) return toast("⚠️ الاسم قصير جداً", "error");
    try {
      await api("/admin/admins/" + id, { method: "POST", body: JSON.stringify({ name }) });
      toast("✅ حُدّث اسم المدير");
      loadAdmins();
    } catch (e: any) { toast(e.message, "error"); }
  };
  const toggleStatus = async (a: any) => {
    const status = a.status === "active" ? "suspended" : "active";
    try {
      await api("/admin/admins/" + a.id, { method: "POST", body: JSON.stringify({ status }) });
      toast(status === "active" ? "✅ فُعّل الحساب" : "⏸️ عُلّق الحساب");
      loadAdmins();
    } catch (e: any) { toast(e.message, "error"); }
  };
  const deleteAdmin = async (a: any) => {
    if (!confirm("حذف المدير " + a.email + "؟")) return;
    try { await api("/admin/admins/" + a.id, { method: "DELETE" }); toast("🗑️ حُذف المدير"); loadAdmins(); }
    catch (e: any) { toast(e.message, "error"); }
  };
  const togglePerm = (list: string[], p: string) => list.includes(p) ? list.filter((x) => x !== p) : [...list, p];

  const a = ov?.analysis;
  const lvl = LEVEL[a?.level || "low"];

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🛡️ مركز الأمن</h1>
          <p className="text-sm text-gray-500 mb-4">مراقبة التهديدات · حظر IP · الأجهزة · المديرون والصلاحيات</p>

          <div className="tabs">
            {([["overview", "📊 نظرة عامة"], ["shield", "🛡️ درع الحماية"], ["sessions", "🔑 الجلسات"], ["logs", "📜 السجل"], ["bans", "🚫 الحظر"], ["devices", "📱 الأجهزة"], ["admins", "👮 المديرون"]] as const).map(([k, l]) => (
              <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k as any)}>{l}</button>
            ))}
          </div>

          {tab === "overview" && ov && (
            <div>
              <div className="card mb-4" style={{ background: lvl.bg, border: "2px solid " + lvl.color }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xl font-black" style={{ color: lvl.color }}>{lvl.label}</div>
                    <div className="text-sm text-gray-600 mt-1">درجة التهديد: <b>{a.threat}/100</b> خلال آخر 24 ساعة</div>
                  </div>
                  <div className="w-full md:w-64">
                    <div className="score-bar"><div style={{ width: a.threat + "%", background: lvl.color }} /></div>
                  </div>
                </div>
                {(a.oddHours || []).length > 0 && <div className="badge mt-3" style={{ background: "#fef3c7", color: "#92400e" }}>🌙 نشاط مشبوه في ساعات متأخرة ({(a.oddHours || []).join("، ")})</div>}
              </div>

              <div className="grid-cards mb-4">
                <div className="card text-center"><div className="text-2xl font-black">{ov.logs24h}</div><div className="text-xs text-gray-500">حدث (24 ساعة)</div></div>
                <div className="card text-center"><div className="text-2xl font-black">{ov.totalLogs}</div><div className="text-xs text-gray-500">إجمالي السجل</div></div>
                <div className="card text-center"><div className="text-2xl font-black text-red-600">{ov.bannedCount}</div><div className="text-xs text-gray-500">IP محظور</div></div>
                <div className="card text-center"><div className="text-2xl font-black text-amber-600">{ov.pendingDevices}</div><div className="text-xs text-gray-500">جهاز بانتظار الاعتماد</div></div>
                <div className="card text-center"><div className="text-2xl font-black text-teal-600">{ov.adminsCount}</div><div className="text-xs text-gray-500">مدير</div></div>
                <div className="card text-center cursor-pointer" onClick={() => setTab("sessions")}><div className="text-2xl font-black text-indigo-600">{ov.activeSessions ?? 0}</div><div className="text-xs text-gray-500">🔑 جلسة نشطة</div></div>
              </div>

              {/* 🛡️ تقييم الوضع الأمني */}
              {ov.posture && (
                <div className="card mb-4" style={{ border: "2px solid " + (ov.posture.score >= 80 ? "#059669" : ov.posture.score >= 50 ? "#d97706" : "#dc2626") }}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
                      <div className="rounded-full" style={{
                        width: 96, height: 96,
                        background: `conic-gradient(${ov.posture.score >= 80 ? "#059669" : ov.posture.score >= 50 ? "#d97706" : "#dc2626"} ${ov.posture.score * 3.6}deg, #e5e7eb 0deg)`,
                      }} />
                      <div className="absolute rounded-full bg-white flex items-center justify-center font-black text-xl" style={{ inset: 10 }}>
                        {ov.posture.score}%
                      </div>
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <h3 className="font-black mb-2">🛡️ تقييم الوضع الأمني للمنصة</h3>
                      {(ov.posture.checks || []).map((c: any, i: number) => (
                        <div key={i} className="text-sm mb-1 flex items-start gap-1">
                          <span>{c.ok ? "✅" : "⚠️"}</span>
                          <span>{c.label}{!c.ok && c.tip && <span className="block text-xs text-gray-500">💡 {c.tip}</span>}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 📈 النشاط الأمني — 14 يوماً */}
              {(ov.timeline || []).length > 0 && (
                <div className="card mb-4">
                  <h3 className="font-black mb-1">📈 النشاط الأمني — آخر 14 يوماً</h3>
                  <div className="flex gap-3 text-xs text-gray-500 mb-3">
                    <span>🟢 دخول ناجح</span><span>🔴 محاولات فاشلة</span><span>🟠 عمليات حظر</span>
                  </div>
                  <div className="flex items-end gap-1" style={{ height: 120 }}>
                    {ov.timeline.map((d: any) => {
                      const max = Math.max(...ov.timeline.map((x: any) => x.fails + x.bans + x.logins), 1);
                      return (
                        <div key={d.date} className="flex-1 flex flex-col justify-end items-center gap-0.5" title={`${d.date} — دخول ${d.logins} · فشل ${d.fails} · حظر ${d.bans}`}>
                          <div className="w-full rounded-t bg-emerald-400" style={{ height: Math.max((d.logins / max) * 90, d.logins ? 4 : 0) }} />
                          <div className="w-full bg-red-400" style={{ height: Math.max((d.fails / max) * 90, d.fails ? 4 : 0) }} />
                          <div className="w-full rounded-b bg-amber-400" style={{ height: Math.max((d.bans / max) * 90, d.bans ? 4 : 0) }} />
                          <div className="text-[9px] text-gray-400 -rotate-45 origin-center mt-1">{d.date.slice(5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 🎯 كبار المهاجمين — 7 أيام */}
              {(ov.topAttackers || []).length > 0 && (
                <div className="card mb-4">
                  <h3 className="font-black mb-2">🎯 أكثر العناوين محاولةً للاختراق (7 أيام)</h3>
                  {ov.topAttackers.map((t: any) => (
                    <div key={t.ip} className="assign-row">
                      <div className="flex-1">
                        <b style={{ fontFamily: "monospace" }}>{t.ip}</b>
                        <span className="badge mr-2" style={{ background: t.banned ? "#fee2e2" : "#fef3c7", color: t.banned ? "#991b1b" : "#92400e" }}>
                          {t.attempts} محاولة فاشلة{t.banned ? " · 🚫 محظور حالياً" : ""}
                        </span>
                      </div>
                      {!t.banned && (
                        <button className="btn btn-danger" onClick={() => { setBanForm({ ip: t.ip, reason: "حظر من قائمة المهاجمين", days: "1" }); setTab("bans"); }}>🚫 حظر فوري</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(a.suspects || []).length > 0 && (
                <div className="card mb-4">
                  <h3 className="font-black mb-2">🎯 عناوين مشبوهة (تحليل محلي)</h3>
                  {(a.suspects || []).map((s: any) => (
                    <div key={s.ip} className="assign-row">
                      <div className="flex-1">
                        <b style={{ fontFamily: "monospace" }}>{s.ip}</b>
                        <span className="badge mr-2" style={{ background: s.severity === "high" ? "#fee2e2" : "#fef3c7", color: s.severity === "high" ? "#991b1b" : "#92400e" }}>
                          {s.severity === "high" ? "خطير" : "متوسط"} · {s.fails} محاولة فاشلة من {s.total} حدث
                        </span>
                      </div>
                      <button className="btn btn-danger" onClick={() => { setBanForm({ ip: s.ip, reason: "حظر تلقائي: نشاط مشبوه", days: "7" }); setTab("bans"); }}>🚫 حظر</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="ai-card mb-4">
                <h3 className="font-black mb-2">🤖 توصيات الذكاء المحلي</h3>
                {(a.recommendations || []).map((r: any, i: number) => <div key={i} className="text-sm mb-1">{r.icon} {r.text}</div>)}
              </div>

              <div className="card">
                <h3 className="font-black mb-2">📈 أكثر الأحداث تكراراً (24 ساعة)</h3>
                {(ov.topEvents || []).length === 0 && <div className="text-sm text-gray-400">لا أحداث بعد</div>}
                {(ov.topEvents || []).map((t: any) => (
                  <div key={t.event} className="flex justify-between items-center py-1 border-b border-gray-100 text-sm">
                    <span>{EVENT_AR[t.event] || t.event} <code className="text-xs text-gray-400">{t.event}</code></span>
                    <b>{t.count}</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🛡️ درع الحماية الشامل — كابتشا + معدلات + مرايا + VPN + فحص ذاتي */}
          {tab === "shield" && shield && shieldForm && (
            <div className="space-y-4">
              {/* درجة الأمان */}
              <div className="card flex items-center gap-4 flex-wrap">
                <div className="relative w-20 h-20 shrink-0">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-lg"
                    style={{ background: `conic-gradient(${shield.check.score >= 70 ? "#059669" : shield.check.score >= 40 ? "#d97706" : "#dc2626"} ${shield.check.score * 3.6}deg, #e5e7eb 0deg)` }}>
                    <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-sm font-black" style={{ color: "#111827" }}>{shield.check.score}%</span>
                  </div>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <h2 className="font-black text-lg">درجة أمان المنصة</h2>
                  <p className="text-xs text-gray-500">فحص ذاتي حي: {shield.check.checks.filter((c: any) => c.ok).length}/{shield.check.checks.length} ضابط مفعّل — {shield.check.stats.bannedIps} IP محظور، {shield.check.stats.weekEvents} حدث أمني هذا الأسبوع</p>
                </div>
              </div>

              {/* الفحص الذاتي */}
              <div className="card">
                <h3 className="font-black mb-3">🩺 الفحص الذاتي للحماية</h3>
                <div className="space-y-2">
                  {shield.check.checks.map((c: any) => (
                    <div key={c.key} className="flex items-start gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <span className="shrink-0">{c.ok ? "✅" : "⚠️"}</span>
                      <div>
                        <b className={c.ok ? "" : "text-amber-700"}>{c.label}</b>
                        {!c.ok && c.hint && <p className="text-xs text-gray-400">{c.hint}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* كابتشا لست روبوت */}
              <div className="card">
                <h3 className="font-black mb-1">🤖 تحقق «لست روبوت» (كابتشا محلية 100%)</h3>
                <p className="text-xs text-gray-400 mb-3">عملية حسابية مشوّشة تولّد داخل الخادم — بلا خدمات خارجية، صالحة 5 دقائق وتُستخدم مرة واحدة</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {([
                    ["captchaLogin", "🔑 تسجيل الدخول (بائع/عميل/إدارة)"],
                    ["captchaRegister", "📝 إنشاء الحسابات"],
                    ["captchaOtp", "📩 طلب رمز OTP"],
                    ["captchaComplaint", "📣 تقديم الشكاوى العامة"],
                    ["captchaReturn", "↩️ طلبات الاسترجاع"],
                  ] as const).map(([k, l]) => (
                    <button key={k} type="button"
                      onClick={() => setShieldForm({ ...shieldForm, [k]: !shieldForm[k] })}
                      className="flex items-center gap-2 p-3 rounded-xl border text-sm font-bold text-right transition-all"
                      style={{ borderColor: shieldForm[k] ? "#10b981" : "#e5e7eb", background: shieldForm[k] ? "#ecfdf5" : "#f9fafb" }}>
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs shrink-0"
                        style={{ background: shieldForm[k] ? "#10b981" : "#d1d5db" }}>{shieldForm[k] ? "✓" : ""}</span>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* معدلات الطلبات */}
              <div className="card">
                <h3 className="font-black mb-1">🚦 حدود معدل الطلبات (لكل IP)</h3>
                <p className="text-xs text-gray-400 mb-3">يحمي من القصف الآلي وهجمات الحرمان — الزائد يُحظر تلقائياً بعد التكرار</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold">عام (طلب/دقيقة)
                    <input type="number" min={30} max={2000} className="input mt-1" dir="ltr"
                      value={shieldForm.rateGlobalPerMin}
                      onChange={(e) => setShieldForm({ ...shieldForm, rateGlobalPerMin: e.target.value })} />
                  </label>
                  <label className="text-xs font-bold">منطقة المصادقة (طلب/دقيقة)
                    <input type="number" min={5} max={300} className="input mt-1" dir="ltr"
                      value={shieldForm.rateAuthPerMin}
                      onChange={(e) => setShieldForm({ ...shieldForm, rateAuthPerMin: e.target.value })} />
                  </label>
                </div>
              </div>

              {/* مقاومة الحجب */}
              <div className="card">
                <h3 className="font-black mb-1">🌐 دومينات بديلة (مرايا) — اعتماد وتشغيل صامت بالكامل</h3>
                <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                  دومين واحد في كل سطر (بدون https). وجّه DNS الخاص به لعنوان الخادم فقط — <b>لا شيء آخر مطلوب</b>:
                  Caddy يطلب الشهادة تلقائياً بعد اعتماد داخلي صامت من هذه القائمة، والمنصة تعمل عليه فوراً بكامل محتواها.
                  لا يظهر أي أثر لهذه الآلية في الواجهة الأمامية.
                </p>
                <textarea className="input w-full" rows={3} dir="ltr" placeholder={"mirror1.com\nmirror2.net"}
                  value={shieldForm.mirrors}
                  onChange={(e) => setShieldForm({ ...shieldForm, mirrors: e.target.value })} />
              </div>

              {/* VPN الخادم */}
              <div className="card">
                <h3 className="font-black mb-1">🔒 VPN للخادم (اختياري — مقاومة حجب مستوى الشبكة)</h3>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                  حاوية WireGuard جاهزة في <code>docker-compose.prod.yml</code> (ملف <code>vpn</code>) — تمرّر ترافيك الخادم الصادر عبر نفق مشفّر
                  وتُفيد إن حجب مزود الاستضافة الوصول لليمن أو خدمات خارجية. <b>ملاحظة تقنية صريحة:</b> حجب مزود الإنترنت اليمني للمستخدمين
                  لا يعالجه VPN الخادم — بل المرآة أعلاه + بروتوكول HTTPS + صفحة /access.
                </p>
                <div className="rounded-xl p-3 text-xs font-mono bg-gray-900 text-emerald-300 overflow-x-auto" dir="ltr">
                  <div># توليد المفاتيح وتشغيل النفق:</div>
                  <div>docker compose -f docker-compose.prod.yml --profile vpn up -d wireguard</div>
                  <div># ثم وجّه ترافيك الحاويات عبر النفق حسب الحاجة</div>
                </div>
              </div>

              <button className="btn btn-primary w-full" onClick={saveShield} disabled={savingShield}>
                {savingShield ? "⏳ جاري الحفظ..." : "💾 حفظ إعدادات الدرع"}
              </button>

              <div className="card text-xs text-gray-500" style={{ background: "#f8fafc" }}>
                <b className="block mb-1">🧱 حمايات تعمل تلقائياً دائماً (لا تحتاج تفعيلاً):</b>
                جدار WAF يصد مسارات الاختراق (.env/wp-admin/ملفات PHP) وأنماط حقن SQL/XSS بصمت 404 • حظر تلقائي للـ IP بعد 12 محاولة فاشلة خلال 10 دقائق لمدة 24 ساعة •
                رفض الطلبات الآلية بلا متصفح حقيقي • رؤوس أمان Helmet (CSP/HSTS/X-Frame) • كلمات مرور argon2 • أسرار البوابات مشفرة AES-256-GCM •
                سياسة كلمات مرور قوية للحسابات الجديدة • تنبيه فوري للمستخدم عند أي دخول جديد لحسابه.
              </div>
            </div>
          )}

          {tab === "sessions" && (
            <div>
              <div className="card mb-3 text-sm" style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3" }}>
                🔑 <b>الجلسات النشطة</b> — كل تسجيل دخول بائع أو عميل ينشئ جلسة مراقَبة. عند إنهاء جلسة يُبطل رمزها فوراً ويُطلب من صاحبها تسجيل الدخول مجدداً (حماية من الأجهزة المفقودة أو المسروقة).
              </div>
              <div className="card">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-black">🔑 الجلسات النشطة ({sessions.length})</h3>
                  <button className="btn" onClick={loadSessions}>🔄 تحديث</button>
                </div>
                {sessions.length === 0 && <div className="text-sm text-gray-400 text-center py-4">لا جلسات نشطة حالياً</div>}
                {sessions.map((s) => (
                  <div key={s.id} className="assign-row">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b>{s.userType === "seller" ? "🏪" : "👤"} {s.user?.name || "مستخدم"}</b>
                        {s.user?.phone && <span className="text-xs text-gray-400" style={{ fontFamily: "monospace" }}>{s.user.phone}</span>}
                        <span className="badge" style={{ background: s.userType === "seller" ? "#dbeafe" : "#f3e8ff", color: s.userType === "seller" ? "#1e40af" : "#6b21a8" }}>
                          {s.userType === "seller" ? "بائع" : "عميل"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {s.ip && <span style={{ fontFamily: "monospace" }}>🌐 {s.ip} · </span>}
                        دخل {new Date(s.createdAt).toLocaleString("ar-YE")} · تنتهي {new Date(s.expiresAt).toLocaleDateString("ar-YE")}
                      </div>
                    </div>
                    <button className="btn btn-danger" onClick={() => revokeSession(s.id)}>⛔ إنهاء</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "logs" && (
            <div>
              <div className="card mb-3 flex flex-wrap gap-2 items-end">
                <input className="input" placeholder="🔍 نوع الحدث..." value={logFilter.event} onChange={(e) => setLogFilter({ ...logFilter, event: e.target.value })} />
                <input className="input" placeholder="🌐 IP..." value={logFilter.ip} onChange={(e) => setLogFilter({ ...logFilter, ip: e.target.value })} />
                <select className="input" value={logFilter.userType} onChange={(e) => setLogFilter({ ...logFilter, userType: e.target.value })}>
                  <option value="">كل الأنواع</option>
                  <option value="admin">إدارة</option><option value="seller">تاجر</option>
                  <option value="customer">عميل</option><option value="driver">سائق</option>
                </select>
                <button className="btn" onClick={loadLogs}>تطبيق</button>
                <button className="btn" onClick={exportCsv} style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}>📥 تصدير CSV</button>
              </div>
              <div className="card">
                {logs.length === 0 && <div className="text-sm text-gray-400 text-center py-4">لا نتائج</div>}
                {logs.map((l) => (
                  <div key={l.id} className="py-2 border-b border-gray-100 text-sm">
                    <div className="flex justify-between flex-wrap gap-1">
                      <b>{EVENT_AR[l.event] || l.event}</b>
                      <span className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString("ar-YE")}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {l.ip && <span style={{ fontFamily: "monospace" }}>🌐 {l.ip} · </span>}
                      {l.userType && <span>👤 {l.userType}#{l.userId} · </span>}
                      {l.details && <code>{JSON.stringify(l.details)}</code>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "bans" && (
            <div>
              <div className="card mb-3">
                <h3 className="font-black mb-2">🚫 حظر عنوان IP</h3>
                <div className="flex flex-wrap gap-2">
                  <input className="input" placeholder="مثال: 102.45.8.12" value={banForm.ip} onChange={(e) => setBanForm({ ...banForm, ip: e.target.value })} style={{ fontFamily: "monospace" }} />
                  <input className="input" placeholder="السبب (اختياري)" value={banForm.reason} onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })} />
                  <input className="input" type="number" placeholder="الأيام (فارغ = دائم)" value={banForm.days} onChange={(e) => setBanForm({ ...banForm, days: e.target.value })} style={{ maxWidth: 140 }} />
                  <button className="btn btn-danger" onClick={banIp}>حظر</button>
                </div>
              </div>
              <div className="card">
                {bans.length === 0 && <div className="text-sm text-gray-400 text-center py-4">لا عناوين محظورة ✅</div>}
                {bans.map((b) => (
                  <div key={b.id} className="assign-row">
                    <div className="flex-1">
                      <b style={{ fontFamily: "monospace" }}>{b.ip}</b>
                      <div className="text-xs text-gray-500">{b.reason} · {b.expiresAt ? "ينتهي " + new Date(b.expiresAt).toLocaleDateString("ar-YE") : "دائم"}</div>
                    </div>
                    <button className="btn" onClick={() => unban(b.ip)}>رفع الحظر</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "devices" && (
            <div className="card">
              <h3 className="font-black mb-2">📱 الأجهزة الموثوقة للإدارة</h3>
              {devices.length === 0 && <div className="text-sm text-gray-400 text-center py-4">لا أجهزة مسجلة</div>}
              {devices.map((d) => (
                <div key={d.id} className="assign-row">
                  <div className="flex-1">
                    <b>{d.deviceName || "جهاز غير مسمى"}</b> <span className="text-xs text-gray-400">({d.admin?.name})</span>
                    <div className="text-xs text-gray-500" style={{ fontFamily: "monospace" }}>{String(d.fingerprint).slice(0, 24)}…</div>
                    <span className="badge" style={{ background: d.status === "approved" ? "#d1fae5" : d.status === "blocked" ? "#fee2e2" : "#fef3c7", color: d.status === "approved" ? "#065f46" : d.status === "blocked" ? "#991b1b" : "#92400e" }}>
                      {d.status === "approved" ? "✅ معتمد" : d.status === "blocked" ? "🚫 محظور" : "⏳ بانتظار"}
                    </span>
                  </div>
                  {d.status !== "approved" && <button className="btn" onClick={() => setDevice(d.id, "approved")}>اعتماد</button>}
                  {d.status !== "blocked" && <button className="btn btn-danger" onClick={() => setDevice(d.id, "blocked")}>حظر</button>}
                </div>
              ))}
            </div>
          )}

          {tab === "admins" && (
            <div>
              {me && !me.isSuper && (
                <div className="card mb-3 text-sm text-amber-700" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                  👑 إضافة وتعديل وحذف حسابات المديرين حصراً للمشرف العام — صاحب القرار الأول. يمكنك الاطلاع على الفريق فقط.
                </div>
              )}
              <div className="card mb-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-black">👮 فريق الإدارة</h3>
                  {me?.isSuper && <button className="btn" onClick={() => setShowNew(!showNew)}>{showNew ? "إلغاء" : "➕ مدير جديد"}</button>}
                </div>
                {showNew && (
                  <div className="p-3 rounded-2xl bg-gray-50">
                    <div className="grid md:grid-cols-3 gap-2 mb-2">
                      <input className="input" placeholder="الاسم" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} />
                      <input className="input" type="email" placeholder="البريد الإلكتروني" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
                      <input className="input" type="password" placeholder="كلمة المرور (8+)" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {Object.entries(PERMS).map(([k, l]) => (
                        <button key={k} className={"badge cursor-pointer" + (newAdmin.permissions.includes(k) ? "" : " opacity-40")}
                          style={{ background: newAdmin.permissions.includes(k) ? "var(--primary)" : "#e5e7eb", color: newAdmin.permissions.includes(k) ? "#fff" : "#374151" }}
                          onClick={() => setNewAdmin({ ...newAdmin, permissions: togglePerm(newAdmin.permissions, k) })}>{l}</button>
                      ))}
                    </div>
                    <button className="btn w-full" onClick={createAdmin}>✅ إضافة المدير</button>
                  </div>
                )}
              </div>
              {admins.map((adm) => (
                <div key={adm.id} className="card mb-3">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <b>{adm.name}</b> <span className="text-xs text-gray-400">{adm.email}</span>
                      {adm.isSuper && <span className="badge mr-1" style={{ background: "#fef3c7", color: "#92400e" }}>👑 مشرف عام</span>}
                      <span className="badge mr-1" style={{ background: adm.status === "active" ? "#d1fae5" : "#fee2e2", color: adm.status === "active" ? "#065f46" : "#991b1b" }}>
                        {adm.status === "active" ? "نشط" : "معلّق"}
                      </span>
                    </div>
                    {me?.isSuper && !adm.isSuper && (
                      <div className="flex gap-2">
                        <button className="btn" onClick={() => toggleStatus(adm)}>{adm.status === "active" ? "⏸️ تعليق" : "▶️ تفعيل"}</button>
                        <button className="btn btn-danger" onClick={() => deleteAdmin(adm)}>🗑️</button>
                      </div>
                    )}
                  </div>
                  {me?.isSuper && adm.isSuper && (
                    <div className="mt-2 p-3 rounded-2xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                      <div className="text-xs font-bold text-amber-700 mb-2">👑 حساب المشرف العام — تعديل الاسم وكلمة المرور متاح (لا يمكن تعليقه أو حذفه حمايةً للمنصة)</div>
                      <div className="flex flex-wrap gap-2">
                        <input className="input" placeholder="الاسم" value={editName[adm.id] ?? adm.name} onChange={(e) => setEditName({ ...editName, [adm.id]: e.target.value })} style={{ maxWidth: 220 }} />
                        <button className="btn" onClick={() => saveName(adm.id)}>💾 حفظ الاسم</button>
                        <input className="input" type="password" placeholder="كلمة مرور جديدة (اختياري)" value={editPass[adm.id] || ""} onChange={(e) => setEditPass({ ...editPass, [adm.id]: e.target.value })} style={{ maxWidth: 220 }} />
                        <button className="btn" onClick={() => savePass(adm.id)}>🔑 تغيير كلمة المرور</button>
                      </div>
                    </div>
                  )}
                  {me?.isSuper && !adm.isSuper && (
                    <div className="mt-2">
                      <div className="text-xs font-bold text-gray-500 mb-1">الصلاحيات:</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {Object.entries(PERMS).map(([k, l]) => {
                          const cur = editPerms[adm.id] ?? adm.permissions;
                          const on = cur.includes(k);
                          return (
                            <button key={k} className="badge cursor-pointer"
                              style={{ background: on ? "var(--primary)" : "#e5e7eb", color: on ? "#fff" : "#374151", opacity: on ? 1 : 0.5 }}
                              onClick={() => setEditPerms({ ...editPerms, [adm.id]: togglePerm(cur, k) })}>{l}</button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn" onClick={() => savePerms(adm.id)}>💾 حفظ الصلاحيات</button>
                        <input className="input" type="password" placeholder="كلمة مرور جديدة (اختياري)" value={editPass[adm.id] || ""} onChange={(e) => setEditPass({ ...editPass, [adm.id]: e.target.value })} style={{ maxWidth: 220 }} />
                        <button className="btn" onClick={() => savePass(adm.id)}>🔑 تغيير</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
