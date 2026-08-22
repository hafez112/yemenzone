"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const CHANNEL_LABEL: Record<string, string> = { sms: "📱 SMS", whatsapp: "💬 واتساب", both: "📱💬 كلاهما" };
const STATUS_LABEL: Record<string, string> = { sent: "✅ أُرسلت", failed: "❌ فشلت", simulated: "🧪 محاكاة" };
const emptyProvider = { id: "", channel: "sms", name: "", apiUrl: "", method: "POST", apiKey: "", template: "", isActive: true };

export default function AdminMessagingPage() {
  const [tab, setTab] = useState<"templates" | "providers" | "logs">("templates");
  const [stats, setStats] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [presets, setPresets] = useState<any>({});
  const [providers, setProviders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [providerForm, setProviderForm] = useState<any>({ ...emptyProvider });
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  // 💬 إعداد واتساب السريع (WhatsApp Cloud API)
  const [waToken, setWaToken] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waBusy, setWaBusy] = useState(false);
  const [showWaGuide, setShowWaGuide] = useState(false);

  const waQuickSetup = async () => {
    if (!waToken.trim() || !waPhoneId.trim()) return toast("⚠️ أدخل رمز الوصول ومعرّف الرقم", "error");
    setWaBusy(true);
    try {
      const r = await api("/admin/messaging/whatsapp-quick-setup", { method: "POST", body: JSON.stringify({ token: waToken, phoneNumberId: waPhoneId }) });
      toast(r.message || "✅ فُعّل واتساب");
      setWaToken("");
      load();
    } catch (e: any) { toast(e.message, "error"); }
    setWaBusy(false);
  };

  const load = () => {
    api("/admin/messaging/stats").then(setStats).catch((e) => toast(e.message, "error"));
    api("/admin/messaging/templates").then((d) => { setTemplates(d.templates || []); setPresets(d.presets || {}); }).catch(() => {});
    api("/admin/messaging/providers").then(setProviders).catch(() => {});
    api("/admin/messaging/logs").then(setLogs).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const saveTemplate = async () => {
    try {
      await api("/admin/messaging/templates", { method: "POST", body: JSON.stringify(editing) });
      toast("✅ تم حفظ القالب");
      setEditing(null);
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const toggleTemplate = async (id: string) => {
    try { await api(`/admin/messaging/templates/${id}/toggle`, { method: "PATCH" }); toast("✅ تم تحديث القالب"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const testSend = async (event: string) => {
    if (!testPhone) return toast("⚠️ أدخل رقماً للتجربة أولاً", "error");
    try {
      const r = await api(`/admin/messaging/templates/${event}/test`, { method: "POST", body: JSON.stringify({ phone: testPhone }) });
      toast(r.sent ? `✅ أُرسلت عبر ${r.provider}` : r.simulated ? "🧪 تم التسجيل (محاكاة — لا يوجد مزود)" : `⚠️ ${r.reason}`);
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const saveProvider = async () => {
    if (!providerForm.name || !providerForm.apiUrl) return toast("⚠️ الاسم ورابط API مطلوبان", "error");
    try {
      const body = { ...providerForm };
      if (!body.id) delete body.id;
      await api("/admin/messaging/providers", { method: "POST", body: JSON.stringify(body) });
      toast("✅ تم حفظ المزود");
      setProviderForm({ ...emptyProvider });
      setShowProviderForm(false);
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const toggleProvider = async (id: string) => {
    try { await api(`/admin/messaging/providers/${id}/toggle`, { method: "PATCH" }); toast("✅ تم التحديث"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const delProvider = async (id: string) => {
    if (!confirm("حذف هذا المزود؟")) return;
    try { await api(`/admin/messaging/providers/${id}`, { method: "DELETE" }); toast("🗑️ تم الحذف"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>💬 مركز المراسلة</h1>

          {/* 💬 إعداد واتساب السريع — القناة الأولى في اليمن */}
          <section className="card" style={{ border: "1px solid #25D36655" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={{ margin: 0 }}>💬 واتساب للمنصة <small style={{ color: "#888", fontWeight: 400 }}>OTP + إشعارات الطلبات والحجوزات تصل عملاءك على واتساب</small></h2>
              <button className="btn" onClick={() => setShowWaGuide(!showWaGuide)}>{showWaGuide ? "إخفاء الدليل" : "📖 دليل الإعداد"}</button>
            </div>
            {showWaGuide && (
              <div style={{ background: "#0d1f14", borderRadius: 12, padding: "1rem", margin: "0.8rem 0", fontSize: "0.85rem", lineHeight: 1.9 }}>
                <b>خطوات الحصول على واتساب Cloud API (مجاني من ميتا):</b>
                <ol style={{ margin: "0.4rem 1.2rem 0" }}>
                  <li>ادخل <span dir="ltr">developers.facebook.com</span> وأنشئ تطبيقاً نوعه «Business»</li>
                  <li>من لوحة التطبيق أضف منتج <b>WhatsApp</b> ثم افتح <b>API Setup</b></li>
                  <li>انسخ <b>Temporary access token</b> (أو أنشئ رمزاً دائماً من System User) و <b>Phone number ID</b></li>
                  <li>ألصقهما هنا واضغط «تفعيل» — تُضبط القوالب تلقائياً ✅</li>
                  <li>أضف رقم جوالك الحقيقي وأكّده ليصبح الإرسال فعلياً 📲</li>
                </ol>
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
              <input type="password" value={waToken} onChange={(e) => setWaToken(e.target.value)} placeholder="🔑 رمز الوصول (Access Token)" dir="ltr" className="input" style={{ flex: 2, minWidth: 220 }} />
              <input value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} placeholder="🆔 معرّف رقم الهاتف (Phone Number ID)" dir="ltr" className="input" style={{ flex: 1, minWidth: 180 }} />
              <button className="btn primary" onClick={waQuickSetup} disabled={waBusy}>{waBusy ? "⏳..." : "⚡ تفعيل واتساب"}</button>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.5rem" }}>بعد التفعيل جرّب من تبويب القوالب: أدخل جوالك واضغط «تجربة» على قالب رمز التحقق 🔐</p>
          </section>

          {/* إحصائيات + نصائح ذكية */}
          {stats && (
            <>
              <div className="grid-cards" style={{ marginBottom: "1rem" }}>
                <div className="plan-card"><h3>📨 إجمالي</h3><p className="price">{stats.total}</p></div>
                <div className="plan-card"><h3>✅ أُرسلت</h3><p className="price ok">{stats.sent}</p></div>
                <div className="plan-card"><h3>🧪 محاكاة</h3><p className="price">{stats.simulated}</p></div>
                <div className="plan-card"><h3>❌ فشلت</h3><p className="price bad">{stats.failed}</p></div>
              </div>
              <section className="card ai-card">
                <h2>🤖 نصائح المراسلة الذكية</h2>
                {stats.tips.map((t: any, i: number) => <p key={i}>{t.icon} {t.text}</p>)}
              </section>
            </>
          )}

          <nav className="tabs">
            <button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>📝 القوالب</button>
            <button className={tab === "providers" ? "active" : ""} onClick={() => setTab("providers")}>🔌 المزودون</button>
            <button className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}>📜 السجل</button>
          </nav>

          {/* القوالب */}
          {tab === "templates" && (
            <>
              <div className="card row" style={{ alignItems: "center" }}>
                <input dir="ltr" placeholder="رقم للتجربة 77xxxxxxx" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} style={{ maxWidth: 220, marginBottom: 0 }} />
                <span className="muted small">أدخل رقماً ثم اضغط "تجربة" على أي قالب مفعّل</span>
              </div>
              {templates.map((t) => (
                <section key={t.id} className="card">
                  <div className="row between">
                    <h2>{t.preset?.icon || "📝"} {t.preset?.label || t.event} <span className="muted small">({t.event})</span></h2>
                    <div className="row">
                      <span className={`badge ${t.isActive ? "active" : "cancelled"}`}>{t.isActive ? "مفعّل" : "معطّل"}</span>
                      <span className="badge">{CHANNEL_LABEL[t.channel]}</span>
                    </div>
                  </div>
                  {editing?.event === t.event ? (
                    <>
                      <select value={editing.channel} onChange={(e) => setEditing({ ...editing, channel: e.target.value })}>
                        <option value="sms">📱 SMS</option>
                        <option value="whatsapp">💬 واتساب</option>
                      </select>
                      <textarea rows={3} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                        style={{ width: "100%", padding: ".7rem", borderRadius: ".8rem", border: "1px solid #e5e7eb", fontFamily: "inherit" }} />
                      {t.preset && <p className="muted small">المتغيرات: {t.preset.vars.map((v: string) => `{${v}}`).join(" ")}
                        {" — "}<a href="#" onClick={(e) => { e.preventDefault(); setEditing({ ...editing, body: t.preset.suggested }); }}>🤖 استخدم الاقتراح الذكي</a></p>}
                      <div className="row">
                        <button className="btn primary small" onClick={saveTemplate}>💾 حفظ</button>
                        <button className="btn ghost small" onClick={() => setEditing(null)}>إلغاء</button>
                      </div>
                    </>
                  ) : (
                    <p style={{ background: "#f9fafb", padding: ".7rem", borderRadius: ".8rem" }}>{t.body}</p>
                  )}
                  {t.analysis?.map((a: any, i: number) => (
                    <p key={i} className={a.level === "warn" ? "bad small" : a.level === "ok" ? "ok small" : "muted small"}>
                      {a.level === "warn" ? "⚠️" : a.level === "ok" ? "" : "💡"} {a.text}
                    </p>
                  ))}
                  <div className="row" style={{ marginTop: ".5rem" }}>
                    <button className="btn ghost small" onClick={() => setEditing({ ...t })}>✏️ تعديل</button>
                    <button className="btn ghost small" onClick={() => toggleTemplate(t.id)}>{t.isActive ? "⏸️ تعطيل" : "▶️ تفعيل"}</button>
                    {t.isActive && <button className="btn primary small" onClick={() => testSend(t.event)}>📤 تجربة</button>}
                  </div>
                </section>
              ))}
            </>
          )}

          {/* المزودون */}
          {tab === "providers" && (
            <>
              <button className="btn primary" style={{ marginBottom: "1rem" }} onClick={() => { setProviderForm({ ...emptyProvider }); setShowProviderForm(!showProviderForm); }}>＋ مزود جديد</button>
              {showProviderForm && (
                <section className="card">
                  <h2>{providerForm.id ? "✏️ تعديل مزود" : "＋ مزود رسائل جديد"}</h2>
                  <select value={providerForm.channel} onChange={(e) => setProviderForm({ ...providerForm, channel: e.target.value })}>
                    <option value="sms">📱 SMS</option>
                    <option value="whatsapp">💬 واتساب</option>
                    <option value="both">📱💬 كلاهما</option>
                  </select>
                  <input placeholder="اسم المزود (مثال: Yemen SMS)" value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} />
                  <input dir="ltr" placeholder="رابط API — يمكن تضمين {phone} و {message} و {apiKey}" value={providerForm.apiUrl} onChange={(e) => setProviderForm({ ...providerForm, apiUrl: e.target.value })} />
                  <select value={providerForm.method} onChange={(e) => setProviderForm({ ...providerForm, method: e.target.value })}>
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                  </select>
                  <input dir="ltr" placeholder="مفتاح API (اختياري)" value={providerForm.apiKey} onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })} />
                  <input dir="ltr" placeholder='قالب JSON للجسم (اختياري): {"to":"{phone}","msg":"{message}"}' value={providerForm.template} onChange={(e) => setProviderForm({ ...providerForm, template: e.target.value })} />
                  <div className="row">
                    <button className="btn primary" onClick={saveProvider}>💾 حفظ</button>
                    <button className="btn ghost" onClick={() => setShowProviderForm(false)}>إلغاء</button>
                  </div>
                </section>
              )}
              <section className="card">
                <h2>🔌 المزودون ({providers.length})</h2>
                {providers.length === 0 && <p className="muted">لا يوجد مزودون — الرسائل تعمل بوضع المحاكاة (تسجيل فقط)</p>}
                {providers.map((p) => (
                  <div key={p.id} className="assign-row">
                    <div>
                      <strong>{p.name}</strong> <span className="badge">{CHANNEL_LABEL[p.channel]}</span>
                      <span className={`badge ${p.isActive ? "active" : "cancelled"}`}>{p.isActive ? "نشط" : "موقوف"}</span>
                      <p className="muted small" dir="ltr">{p.method} {p.apiUrl.slice(0, 60)}...</p>
                    </div>
                    <div className="row">
                      <button className="btn small ghost" onClick={() => { setProviderForm({ ...p, apiKey: "", template: p.template || "" }); setShowProviderForm(true); toast("🔐 المفتاح مخفي عمداً — اتركه فارغاً للإبقاء عليه"); }}>✏️</button>
                      <button className="btn small ghost" onClick={() => toggleProvider(p.id)}>{p.isActive ? "⏸️" : "▶️"}</button>
                      <button className="btn small danger" onClick={() => delProvider(p.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}

          {/* السجل */}
          {tab === "logs" && (
            <section className="card">
              <h2>📜 سجل الرسائل ({logs.length})</h2>
              {logs.length === 0 ? <p className="muted">لا توجد رسائل بعد — فعّل قالباً ونفّذ حدثاً (كإنشاء طلب)</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>الوقت</th><th>الحدث</th><th>القناة</th><th>الرقم</th><th>النص</th><th>الحالة</th></tr></thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id}>
                          <td className="small">{new Date(l.createdAt).toLocaleString("ar-YE")}</td>
                          <td><span className="badge">{presets[l.event]?.icon} {l.event}</span></td>
                          <td>{CHANNEL_LABEL[l.channel] || l.channel}</td>
                          <td dir="ltr">{l.phone}</td>
                          <td className="small" style={{ maxWidth: 260 }}>{l.body.slice(0, 80)}{l.body.length > 80 ? "…" : ""}{l.error && <span className="bad"> ({l.error})</span>}</td>
                          <td>{STATUS_LABEL[l.status]}{l.provider && <span className="muted small"> عبر {l.provider}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
