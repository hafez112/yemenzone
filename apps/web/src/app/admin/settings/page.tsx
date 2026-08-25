"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api, apiUpload, getUser, imgUrl } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import { useRouter } from "next/navigation";

// ⚙️ مركز الإعدادات الشامل — عام · جوجل والأرشفة · البائعون · العملاء · حساب المدير
const TABS = [
  { id: "general", icon: "🏷️", label: "عام" },
  { id: "seo", icon: "🔎", label: "جوجل والأرشفة" },
  { id: "sellers", icon: "🏪", label: "البائعون" },
  { id: "customers", icon: "👥", label: "العملاء" },
  { id: "account", icon: "👤", label: "حساب المدير" },
  { id: "database", icon: "🗄️", label: "قاعدة البيانات" },
  { id: "reset", icon: "🧹", label: "استعادة الضبط" },
];

const DB_LABELS: Record<string, string> = {
  stores: "🏪 المتاجر", sellers: "🧑‍💼 البائعون", customers: "👥 العملاء", drivers: "🛵 السائقون",
  products: "📦 المنتجات", orders: "🛒 الطلبات", payments: "💳 المدفوعات", reviews: "⭐ التقييمات",
  notifications: "🔔 الإشعارات", sessions: "🎫 الجلسات", logs: "🛡️ السجل الأمني",
};

// 🏷️ أسماء عربية ودية للجداول الأكثر شيوعاً — ما ليس هنا يظهر باسمه التقني
const TABLE_LABELS: Record<string, string> = {
  stores: "🏪 المتاجر", sellers: "🧑‍💼 البائعون", customers: "👥 العملاء", drivers: "🛵 السائقون",
  products: "📦 المنتجات", categories: "🗂️ الأصناف", orders: "🛒 الطلبات", order_items: "🧾 عناصر الطلبات",
  payments: "💳 المدفوعات", wallets: "👛 المحافظ", wallet_transactions: "💸 حركات المحافظ",
  reviews: "⭐ التقييمات", notifications: "🔔 الإشعارات", sessions: "🎫 الجلسات", security_logs: "🛡️ السجل الأمني",
  message_logs: "✉️ سجل الرسائل", broadcasts: "📣 البث الجماعي", search_queries: "🔎 سجل البحث",
  ads: "📢 الإعلانات", coupons: "🎟️ الكوبونات", subscriptions: "📋 الاشتراكات", complaints: "🚨 الشكاوى",
  rental_bookings: "🏠 حجوزات الإيجارات", rental_units: "🏘️ وحدات الإيجار", room_bookings: "🛏️ حجوزات الغرف",
  hotel_rooms: "🏨 غرف الفنادق", service_requests: "🛠️ طلبات الخدمات", service_items: "🧰 عناصر الخدمات",
  blog_posts: "📰 مقالات المدونة", custom_pages: "📄 الصفحات المخصصة", slides: "🖼️ الشرائح",
  otp_codes: "🔑 رموز التحقق", banned_ips: "⛔ العناوين المحظورة", trusted_devices: "📱 الأجهزة الموثوقة",
  referrals: "🤝 الإحالات", points_transactions: "🎯 حركات النقاط", expenses: "🧾 المصروفات",
  store_likes: "❤️ إعجابات المتاجر", verification_requests: "✅ طلبات التوثيق", backup_records: "💾 سجل النسخ",
  share_offers: "📈 عروض الأسهم", share_holdings: "📊 ملكيات الأسهم", carts: "🛒 سلال التسوق",
};

// ⚡ مجموعات تحديد سريع حسب طبيعة البيانات
const TABLE_GROUPS: { label: string; tables: string[] }[] = [
  { label: "🛡️ السجلات والجلسات", tables: ["security_logs", "message_logs", "search_queries", "sessions", "otp_codes", "api_usage", "api_keys", "trusted_devices", "banned_ips", "pwa_requests"] },
  { label: "🔔 الإشعارات والبث", tables: ["notifications", "broadcasts"] },
  { label: "🛒 الطلبات والمدفوعات", tables: ["order_items", "orders", "payments", "wallet_transactions", "withdrawal_requests", "card_topups", "customer_cards", "payment_cards", "card_batches", "wallets"] },
  { label: "🏪 المتاجر والمنتجات", tables: ["products", "categories", "store_likes", "reviews", "stores", "subscriptions", "verification_requests", "store_payment_methods", "store_delivery_methods"] },
  { label: "👥 المستخدمون", tables: ["customers", "sellers", "drivers", "delivery_companies", "store_delivery_companies"] },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [platform, setPlatform] = useState<any>({ name: "", tagline: "", whatsapp: "", email: "", announcement: "", announcementActive: false, logoUrl: "", faviconUrl: "", appIconUrl: "" });
  const [brandBusy, setBrandBusy] = useState("");

  // 🖼️ رفع أصول الهوية (شعار/أيقونات) إلى مجلد brand ثم حفظ المسار في الإعداد
  const uploadBrand = async (key: "logoUrl" | "faviconUrl" | "appIconUrl", file: File | null) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("⚠️ اختر ملف صورة (PNG/JPG/SVG)", "error"); return; }
    setBrandBusy(key);
    try {
      const row = await apiUpload("/admin/files/upload", "file", file, true, { folder: "brand" });
      setPlatform((p: any) => ({ ...p, [key]: row.path }));
      toast("✅ رُفعت الصورة — لا تنسَ حفظ الإعدادات");
    } catch (e: any) { toast(e.message, "error"); }
    setBrandBusy("");
  };
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [seo, setSeo] = useState<any>({ metaTitle: "", metaDesc: "", keywords: "", ogImage: "", googleVerification: "", gaId: "", indexing: true });
  const [sellers, setSellers] = useState<any>({ registrationOpen: true });
  const [customers, setCustomers] = useState<any>({ registrationOpen: true });

  // حساب المدير
  const [me, setMe] = useState<any>(null);
  const [meForm, setMeForm] = useState<any>({ name: "", email: "", currentPassword: "", newPassword: "" });

  // 🔐 المصادقة الثنائية
  const [tfa, setTfa] = useState<{ secret: string; url: string } | null>(null);
  const [tfaCode, setTfaCode] = useState("");
  const [tfaBusy, setTfaBusy] = useState(false);

  const tfaSetup = async () => {
    setTfaBusy(true);
    try {
      const d = await api("/admin/2fa/setup", { method: "POST" });
      setTfa(d);
      toast("🔐 امسح الرابط في تطبيق المصادقة ثم أدخل الرمز");
    } catch (e: any) { toast(e.message, "error"); }
    setTfaBusy(false);
  };
  const tfaEnable = async () => {
    setTfaBusy(true);
    try {
      await api("/admin/2fa/enable", { method: "POST", body: JSON.stringify({ code: tfaCode }) });
      toast("✅ فُعّلت المصادقة الثنائية — حسابك أصبح أحصن 🛡️");
      setTfa(null); setTfaCode("");
      setMe((m: any) => ({ ...m, totpEnabled: true }));
    } catch (e: any) { toast(e.message, "error"); }
    setTfaBusy(false);
  };
  const tfaDisable = async () => {
    setTfaBusy(true);
    try {
      await api("/admin/2fa/disable", { method: "POST", body: JSON.stringify({ code: tfaCode }) });
      toast("⏸️ عُطّلت المصادقة الثنائية");
      setTfaCode("");
      setMe((m: any) => ({ ...m, totpEnabled: false }));
    } catch (e: any) { toast(e.message, "error"); }
    setTfaBusy(false);
  };

  // 🗄️ صيانة قاعدة البيانات
  const [db, setDb] = useState<any>(null);
  const [repairing, setRepairing] = useState(false);
  const [report, setReport] = useState<any[] | null>(null);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetAck, setResetAck] = useState(false);

  const loadDbStats = () => api("/admin/system/db-stats").then(setDb).catch((e) => toast(e.message, "error"));

  const runRepair = async () => {
    setRepairing(true); setReport(null);
    try {
      const d = await api("/admin/system/db-repair", { method: "POST" });
      setReport(d.tasks);
      toast("✅ اكتمل فحص وإصلاح قاعدة البيانات");
      loadDbStats();
    } catch (e: any) { toast(e.message, "error"); }
    setRepairing(false);
  };

  const runReset = async () => {
    setResetting(true);
    try {
      const d = await api("/admin/system/db-reset", { method: "POST", body: JSON.stringify({ confirm: resetPhrase }) });
      toast(`♻️ أُعيد ضبط قاعدة البيانات — فُرّغت ${d.wipedTables} جدولاً`);
      setResetPhrase(""); setResetAck(false);
      loadDbStats();
    } catch (e: any) { toast(e.message, "error"); }
    setResetting(false);
  };

  // 🧹 استعادة الضبط الانتقائية — تحديد الجداول + تصغير البيانات
  const [tables, setTables] = useState<any[] | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selTables, setSelTables] = useState<string[]>([]);
  const [shrinkDays, setShrinkDays] = useState(30);
  const [shrinkAck, setShrinkAck] = useState(false);
  const [shrinkPhrase, setShrinkPhrase] = useState("");
  const [shrinking, setShrinking] = useState(false);
  const [wipeAck, setWipeAck] = useState(false);
  const [wipePhrase, setWipePhrase] = useState("");
  const [wiping, setWiping] = useState(false);
  const [opResult, setOpResult] = useState<any>(null);

  const loadTables = async () => {
    setTablesLoading(true);
    try { const d = await api("/admin/system/db-tables"); setTables(d.tables); }
    catch (e: any) { toast(e.message, "error"); }
    setTablesLoading(false);
  };

  const toggleTable = (name: string) =>
    setSelTables((s) => (s.includes(name) ? s.filter((t) => t !== name) : [...s, name]));

  const selectableNames = () => (tables || []).filter((t) => !t.protected).map((t) => t.name);

  const selectAll = () => setSelTables(selectableNames());

  const selectGroup = (names: string[]) => {
    const real = new Set(selectableNames());
    setSelTables((s) => [...new Set([...s, ...names.filter((n) => real.has(n))])]);
  };

  const runShrink = async () => {
    setShrinking(true); setOpResult(null);
    try {
      const d = await api("/admin/system/db-shrink", { method: "POST", body: JSON.stringify({ tables: selTables, days: shrinkDays, confirm: shrinkPhrase }) });
      const total = (d.results || []).reduce((s: number, r: any) => s + (r.deleted || 0), 0);
      toast(`🗜️ اكتمل التصغير — حُذف ${Number(total).toLocaleString("en")} سجل أقدم من ${d.days} يوماً`);
      setOpResult({ type: "shrink", ...d });
      setShrinkAck(false); setShrinkPhrase("");
      loadTables(); loadDbStats();
    } catch (e: any) { toast(e.message, "error"); }
    setShrinking(false);
  };

  const runWipeSelected = async () => {
    setWiping(true); setOpResult(null);
    try {
      const d = await api("/admin/system/db-reset-tables", { method: "POST", body: JSON.stringify({ tables: selTables, confirm: wipePhrase }) });
      toast(`♻️ فُرّغت ${d.wipedTables} جدولاً بالكامل`);
      setOpResult({ type: "reset", ...d });
      setWipeAck(false); setWipePhrase(""); setSelTables([]);
      loadTables(); loadDbStats();
    } catch (e: any) { toast(e.message, "error"); }
    setWiping(false);
  };

  // 💾 النسخ الاحتياطي والاستعادة
  const [backups, setBackups] = useState<any>(null);
  const [creatingBk, setCreatingBk] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<any>(null);
  const [restorePhrase, setRestorePhrase] = useState("");
  const [restoring, setRestoring] = useState(false);

  const loadBackups = () => api("/admin/backups").then(setBackups).catch(() => {});

  const createBackup = async () => {
    setCreatingBk(true);
    try {
      const r = await api("/admin/backups", { method: "POST", body: JSON.stringify({}) });
      toast(`✅ أُنشئت النسخة الاحتياطية — ${Number(r.totalRows || 0).toLocaleString("en")} سجل`);
      loadBackups();
    } catch (e: any) { toast(e.message, "error"); }
    setCreatingBk(false);
  };

  const runRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const d = await api(`/admin/backups/${restoreTarget.id}/restore`, { method: "POST", body: JSON.stringify({}) });
      toast(`♻️ تمت الاستعادة بنجاح — ${Number(d.restored || 0).toLocaleString("en")} سجل في ${d.tables} جدولاً`);
      setRestoreTarget(null); setRestorePhrase("");
      loadDbStats(); loadBackups();
    } catch (e: any) { toast(e.message, "error"); }
    setRestoring(false);
  };

  const downloadBackup = async (b: any) => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "") + "/api/admin/backups/download/" + b.filename, {
        headers: { Authorization: "Bearer " + localStorage.getItem("yz_token") },
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || "فشل التحميل"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = b.filename; a.click();
      URL.revokeObjectURL(url);
      toast("⬇️ حُمّلت النسخة — احفظها بمكان آمن خارج الخادم");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const removeBackup = async (b: any) => {
    if (!confirm("حذف النسخة " + b.filename + " نهائياً؟")) return;
    try { await api("/admin/backups/" + b.id, { method: "DELETE" }); toast("🗑️ حُذفت النسخة"); loadBackups(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " ك.ب";
    return (bytes / 1024 / 1024).toFixed(1) + " م.ب";
  };

  useEffect(() => {
    if (!getUser()) { router.push("/auth/admin-login"); return; }
    Promise.all([
      api("/admin/settings"),
      api("/admin/me").catch(() => null),
    ]).then(([d, meData]) => {
      if (d.settings?.platform) setPlatform((p: any) => ({ ...p, ...d.settings.platform }));
      if (d.settings?.seo) setSeo((s: any) => ({ ...s, ...d.settings.seo }));
      if (d.settings?.sellers) setSellers((s: any) => ({ ...s, ...d.settings.sellers }));
      if (d.settings?.customers) setCustomers((c: any) => ({ ...c, ...d.settings.customers }));
      setOtpEnabled(!!d.otpEnabled);
      if (meData) { setMe(meData); setMeForm((f: any) => ({ ...f, name: meData.name, email: meData.email })); }
      setLoading(false);
    }).catch((e) => { toast(e.message, "error"); setLoading(false); });
    loadDbStats();
    loadBackups();
  }, []);

  // 🧹 تحميل قائمة الجداول كسولاً عند فتح تبويب استعادة الضبط
  useEffect(() => { if (tab === "reset" && tables === null && !tablesLoading) loadTables(); }, [tab]);

  async function saveSettings() {
    setSaving(true);
    try {
      await api("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ settings: { platform, seo, sellers, customers }, otpEnabled }),
      });
      toast("✅ تم حفظ الإعدادات");
    } catch (e: any) { toast(e.message, "error"); }
    setSaving(false);
  }

  async function saveMe() {
    setSaving(true);
    try {
      const body: any = { name: meForm.name, email: meForm.email };
      if (meForm.newPassword) { body.newPassword = meForm.newPassword; body.currentPassword = meForm.currentPassword; }
      await api("/admin/me", { method: "PATCH", body: JSON.stringify(body) });
      toast("✅ تم تحديث حسابك");
      setMeForm((f: any) => ({ ...f, currentPassword: "", newPassword: "" }));
    } catch (e: any) { toast(e.message, "error"); }
    setSaving(false);
  }

  async function uploadOg(file?: File | null) {
    if (!file) return;
    try {
      const d = await apiUpload("/admin/blog/upload", "image", file);
      setSeo((s: any) => ({ ...s, ogImage: d.path || d.url || "" }));
      toast("✅ تم رفع صورة المشاركة");
    } catch (e: any) { toast(e.message, "error"); }
  }

  const Toggle = ({ value, onChange, on, off }: { value: boolean; onChange: (v: boolean) => void; on: string; off: string }) => (
    <button onClick={() => onChange(!value)} className={"btn " + (value ? "success" : "ghost")}>
      {value ? on : off}
    </button>
  );

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">⚙️ مركز الإعدادات الشامل</h1>
          <p className="text-sm text-gray-500 mb-4">كل مفاتيح المنصة في مكان واحد — الإدارة صاحبة القرار الأول</p>

          {/* التبويبات */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={"btn whitespace-nowrap " + (tab === t.id ? "primary" : "ghost")}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {loading ? <div className="skeleton h-64 rounded-3xl" /> : (
            <>
              {/* ═══ عام ═══ */}
              {tab === "general" && (
                <>
                  <section className="card">
                    <h2>🏷️ هوية المنصة</h2>
                    <label className="muted small">اسم المنصة</label>
                    <input value={platform.name} onChange={(e) => setPlatform({ ...platform, name: e.target.value })} placeholder="يمن زون" />
                    <label className="muted small">الشعار التسويقي</label>
                    <input value={platform.tagline} onChange={(e) => setPlatform({ ...platform, tagline: e.target.value })} placeholder="أنشئ متجرك الإلكتروني في دقيقتين" />
                  </section>
                  <section className="card">
                    <h2>🖼️ الشعار والأيقونات</h2>
                    <p className="muted small" style={{ marginBottom: ".7rem" }}>
                      ارفع صورة أو الصق رابطاً — الشعار يظهر في الشريط العلوي، والأيقونة المفضلة في تبويب المتصفح، وأيقونة التطبيق عند التثبيت على الجوال. اترك الحقل فارغاً لاستخدام الافتراضي.
                    </p>
                    {([
                      { key: "logoUrl", label: "شعار المنصة (يفضّل PNG شفاف مربع)", def: "/logo.png" },
                      { key: "faviconUrl", label: "الأيقونة المفضلة Favicon (صغيرة مربعة)", def: "/favicon.png" },
                      { key: "appIconUrl", label: "أيقونة التطبيق للجوال (مربعة 512×512)", def: "/apple-touch-icon.png" },
                    ] as const).map((it) => (
                      <div key={it.key} className="row" style={{ gap: ".6rem", alignItems: "center", marginBottom: ".7rem", flexWrap: "wrap" }}>
                        <img src={imgUrl(platform[it.key] || it.def)} alt="" className="w-12 h-12 rounded-xl object-contain border bg-gray-50 p-1" />
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <label className="muted small">{it.label}</label>
                          <input value={platform[it.key] || ""} dir="ltr" placeholder="/uploads/files/brand/…"
                            onChange={(e) => setPlatform({ ...platform, [it.key]: e.target.value })} style={{ marginBottom: 0 }} />
                        </div>
                        <label className="btn" style={{ cursor: "pointer", whiteSpace: "nowrap", opacity: brandBusy === it.key ? .6 : 1 }}>
                          {brandBusy === it.key ? "⏳ جارٍ الرفع…" : "⬆️ رفع"}
                          <input type="file" accept="image/*" hidden disabled={!!brandBusy}
                            onChange={(e) => { uploadBrand(it.key, e.target.files?.[0] || null); e.target.value = ""; }} />
                        </label>
                      </div>
                    ))}
                  </section>
                  <section className="card">
                    <h2>📞 التواصل</h2>
                    <label className="muted small">واتساب الدعم (بالصيغة الدولية)</label>
                    <input value={platform.whatsapp} onChange={(e) => setPlatform({ ...platform, whatsapp: e.target.value })} placeholder="9677XXXXXXXX" dir="ltr" />
                    <label className="muted small">بريد الدعم</label>
                    <input value={platform.email} onChange={(e) => setPlatform({ ...platform, email: e.target.value })} placeholder="support@yemenzone1.com" dir="ltr" />
                  </section>
                  <section className="card">
                    <h2>📢 شريط الإعلان (أعلى الصفحة الرئيسية)</h2>
                    <textarea rows={2} value={platform.announcement} onChange={(e) => setPlatform({ ...platform, announcement: e.target.value })}
                      placeholder="مثال: عرض الإطلاق — أنشئ متجرك مجاناً حتى نهاية الشهر! 🎉"
                      style={{ width: "100%", padding: ".7rem", borderRadius: ".8rem", border: "1px solid #e5e7eb", fontFamily: "inherit", marginBottom: ".5rem" }} />
                    <label className="row small" style={{ gap: ".4rem" }}>
                      <input type="checkbox" style={{ width: "auto", marginBottom: 0 }} checked={!!platform.announcementActive}
                        onChange={(e) => setPlatform({ ...platform, announcementActive: e.target.checked })} />
                      إظهار شريط الإعلان للزوار
                    </label>
                  </section>
                  <section className="card">
                    <h2>🔐 التحقق برمز OTP</h2>
                    <p className="muted small" style={{ marginBottom: ".5rem" }}>
                      عند التفعيل: تسجيل الدخول وإنشاء الحساب برمز تحقق يُرسل للجوال. عند التعطيل: كلمة المرور مباشرة.
                    </p>
                    <Toggle value={otpEnabled} onChange={setOtpEnabled} on="✅ OTP مفعّل" off="⏸️ OTP معطّل" />
                  </section>
                </>
              )}

              {/* ═══ جوجل والأرشفة ═══ */}
              {tab === "seo" && (
                <>
                  <section className="card">
                    <h2>🔎 الظهور في نتائج البحث</h2>
                    <label className="muted small">عنوان الموقع (Meta Title) — حتى 60 حرفاً</label>
                    <input maxLength={60} value={seo.metaTitle} onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })}
                      placeholder="يمن زون — منصة التجارة اليمنية" />
                    <label className="muted small">الوصف (Meta Description) — حتى 160 حرفاً</label>
                    <textarea rows={2} maxLength={160} value={seo.metaDesc} onChange={(e) => setSeo({ ...seo, metaDesc: e.target.value })}
                      placeholder="تسوّق من متاجر يمنية موثوقة..."
                      style={{ width: "100%", padding: ".7rem", borderRadius: ".8rem", border: "1px solid #e5e7eb", fontFamily: "inherit" }} />
                    <label className="muted small">كلمات مفتاحية (افصل بفاصلة)</label>
                    <input value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} placeholder="تسوق يمني, متاجر إلكترونية, يمن زون" />
                  </section>
                  <section className="card">
                    <h2>🖼️ صورة المشاركة (Open Graph)</h2>
                    <p className="muted small" style={{ marginBottom: ".5rem" }}>تظهر عند مشاركة رابط المنصة في واتساب وتويتر وفيسبوك — يفضّل 1200×630</p>
                    {seo.ogImage && <img src={imgUrl(seo.ogImage)} alt="OG" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: ".8rem", marginBottom: ".5rem" }} />}
                    <div className="row" style={{ gap: ".5rem", flexWrap: "wrap" }}>
                      <input value={seo.ogImage} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} placeholder="/uploads/... أو رابط خارجي" dir="ltr" style={{ flex: 1, minWidth: 180 }} />
                      <label className="btn ghost" style={{ cursor: "pointer" }}>
                        📤 رفع
                        <input type="file" accept="image/*" hidden onChange={(e) => uploadOg(e.target.files?.[0])} />
                      </label>
                    </div>
                  </section>
                  <section className="card">
                    <h2>🌐 أدوات جوجل</h2>
                    <label className="muted small">رمز التحقق من Search Console (content فقط)</label>
                    <input value={seo.googleVerification} onChange={(e) => setSeo({ ...seo, googleVerification: e.target.value })}
                      placeholder="google-site-verification=XXXX" dir="ltr" />
                    <label className="muted small">معرّف Google Analytics (اختياري)</label>
                    <input value={seo.gaId} onChange={(e) => setSeo({ ...seo, gaId: e.target.value })} placeholder="G-XXXXXXXXXX" dir="ltr" />
                  </section>
                  <section className="card">
                    <h2>🤖 السماح بالأرشفة</h2>
                    <p className="muted small" style={{ marginBottom: ".5rem" }}>
                      عند الإيقاف يُطلب من محركات البحث عدم أرشفة الموقع (robots: noindex) — مفيد أثناء الصيانة الكبرى.
                    </p>
                    <Toggle value={seo.indexing !== false} onChange={(v) => setSeo({ ...seo, indexing: v })}
                      on="✅ الأرشفة مسموحة — الموقع يظهر في جوجل" off="🚫 الأرشفة موقوفة مؤقتاً" />
                  </section>
                </>
              )}

              {/* ═══ البائعون ═══ */}
              {tab === "sellers" && (
                <section className="card">
                  <h2>🏪 إعدادات البائعين</h2>
                  <p className="muted small" style={{ marginBottom: ".7rem" }}>
                    تحكم كامل ببوابة انضمام البائعين. الإغلاق لا يؤثر على الحسابات القائمة — فقط التسجيلات الجديدة.
                  </p>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
                    <div>
                      <strong className="small">تسجيل بائعين جدد</strong>
                      <p className="muted small" style={{ margin: 0 }}>{sellers.registrationOpen !== false ? "الباب مفتوح — أي شخص يمكنه إنشاء حساب بائع" : "مغلق — تظهر رسالة اعتذار للزوار"}</p>
                    </div>
                    <Toggle value={sellers.registrationOpen !== false} onChange={(v) => setSellers({ ...sellers, registrationOpen: v })}
                      on="✅ مفتوح" off="⛔ مغلق" />
                  </div>
                </section>
              )}

              {/* ═══ العملاء ═══ */}
              {tab === "customers" && (
                <section className="card">
                  <h2>👥 إعدادات العملاء</h2>
                  <p className="muted small" style={{ marginBottom: ".7rem" }}>
                    بوابة تسجيل العملاء الجدد. مفيدة عند إيقاف المنصة مؤقتاً أو الاكتفاء بالقاعدة الحالية.
                  </p>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
                    <div>
                      <strong className="small">تسجيل عملاء جدد</strong>
                      <p className="muted small" style={{ margin: 0 }}>{customers.registrationOpen !== false ? "الباب مفتوح — التسجيل متاح للجميع" : "مغلق — تظهر رسالة اعتذار للزوار"}</p>
                    </div>
                    <Toggle value={customers.registrationOpen !== false} onChange={(v) => setCustomers({ ...customers, registrationOpen: v })}
                      on="✅ مفتوح" off="⛔ مغلق" />
                  </div>
                </section>
              )}

              {/* ═══ حساب المدير ═══ */}
              {tab === "account" && me && (
                <>
                  <section className="card">
                    <h2>👤 حسابك {me.isSuper && <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>👑 المشرف العام — صاحب القرار الأول</span>}</h2>
                    <p className="muted small" style={{ marginBottom: ".5rem" }}>
                      الصلاحيات: {me.isSuper ? "كل الصلاحيات" : ((me.permissions || []).join("، ") || "—")}
                      {me.lastLoginAt && <> · آخر دخول: {new Date(me.lastLoginAt).toLocaleString("ar-YE")}</>}
                    </p>
                    <label className="muted small">الاسم</label>
                    <input value={meForm.name} onChange={(e) => setMeForm({ ...meForm, name: e.target.value })} />
                    <label className="muted small">البريد الإلكتروني</label>
                    <input value={meForm.email} onChange={(e) => setMeForm({ ...meForm, email: e.target.value })} dir="ltr" />
                  </section>
                  {/* 🔐 المصادقة الثنائية */}
                  <section className="card" style={{ border: "1.5px solid rgba(5,150,105,.3)" }}>
                    <h2>🔐 المصادقة الثنائية (2FA)
                      {me.totpEnabled
                        ? <span className="badge active">🛡️ مفعّلة — حسابك محصّن</span>
                        : <span className="badge pending">⚠️ غير مفعّلة</span>}
                    </h2>
                    <p className="muted small" style={{ marginBottom: ".7rem" }}>
                      بعد كلمة المرور يُطلب رمز متغيّر كل 30 ثانية من تطبيق المصادقة (Google Authenticator / Authy) —
                      حتى لو سُرقت كلمة مرورك لن يدخل أحد.
                    </p>

                    {me.totpEnabled ? (
                      <div>
                        <label className="muted small">أدخل الرمز الحالي من تطبيقك لتأكيد التعطيل</label>
                        <input value={tfaCode} onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000" dir="ltr" inputMode="numeric" style={{ textAlign: "center", letterSpacing: ".4em", fontWeight: 900 }} />
                        <button className="btn danger" style={{ width: "100%", justifyContent: "center" }} disabled={tfaBusy || tfaCode.length !== 6} onClick={tfaDisable}>
                          {tfaBusy ? "⏳…" : "⏸️ تعطيل المصادقة الثنائية"}
                        </button>
                      </div>
                    ) : !tfa ? (
                      <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} disabled={tfaBusy} onClick={tfaSetup}>
                        {tfaBusy ? "⏳ جاري التوليد..." : "🚀 بدء الإعداد"}
                      </button>
                    ) : (
                      <div className="anim-bounce-in">
                        <div className="p-3 rounded-2xl mb-2" style={{ background: "rgba(108,61,245,.08)", border: "1px dashed rgba(108,61,245,.35)" }}>
                          <p className="small" style={{ fontWeight: 800, marginBottom: ".4rem" }}>1️⃣ في تطبيق المصادقة اختر «إدخال مفتاح يدوياً»:</p>
                          <code className="block text-center font-black text-lg select-all" dir="ltr"
                            style={{ letterSpacing: ".12em", wordBreak: "break-all" }}>{tfa.secret}</code>
                          <p className="muted small mt-2" dir="ltr" style={{ fontSize: ".65rem", wordBreak: "break-all", opacity: .7 }}>{tfa.url}</p>
                        </div>
                        <p className="small" style={{ fontWeight: 800, marginBottom: ".3rem" }}>2️⃣ أدخل الرمز الظاهر في التطبيق:</p>
                        <input value={tfaCode} onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000" dir="ltr" inputMode="numeric" style={{ textAlign: "center", letterSpacing: ".4em", fontWeight: 900 }} />
                        <div className="flex gap-2">
                          <button className="btn success flex-1" style={{ justifyContent: "center" }} disabled={tfaBusy || tfaCode.length !== 6} onClick={tfaEnable}>
                            {tfaBusy ? "⏳…" : "✅ تأكيد التفعيل"}
                          </button>
                          <button className="btn ghost" onClick={() => { setTfa(null); setTfaCode(""); }}>إلغاء</button>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="card">
                    <h2>🔑 تغيير كلمة المرور</h2>
                    <p className="muted small" style={{ marginBottom: ".5rem" }}>اترك الحقلين فارغين إن كنت لا تريد تغييرها</p>
                    <label className="muted small">كلمة المرور الحالية</label>
                    <input type="password" value={meForm.currentPassword} onChange={(e) => setMeForm({ ...meForm, currentPassword: e.target.value })} dir="ltr" />
                    <label className="muted small">كلمة المرور الجديدة (8 أحرف فأكثر)</label>
                    <input type="password" value={meForm.newPassword} onChange={(e) => setMeForm({ ...meForm, newPassword: e.target.value })} dir="ltr" />
                  </section>
                  <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} disabled={saving} onClick={saveMe}>
                    {saving ? "⏳ جاري الحفظ..." : "💾 حفظ حسابي"}
                  </button>
                </>
              )}

              {/* ═══ 🗄️ قاعدة البيانات ═══ */}
              {tab === "database" && (
                <>
                  <section className="card">
                    <div className="row between" style={{ marginBottom: ".6rem" }}>
                      <h2 style={{ marginBottom: 0 }}>📊 حالة قاعدة البيانات</h2>
                      {db && <span className="badge" style={{ background: "#ede9fe", color: "#5b21b6" }}>الحجم الكلي: {db.size}</span>}
                    </div>
                    {!db ? <div className="skeleton h-24 rounded-2xl" /> : (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {Object.entries(db.counts).map(([k, v]: any) => (
                          <div key={k} className="text-center p-2 rounded-xl" style={{ background: "rgba(127,127,127,.06)" }}>
                            <div className="text-lg font-black">{Number(v).toLocaleString()}</div>
                            <div className="text-[11px] muted">{DB_LABELS[k] || k}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="card">
                    <h2>🩺 إصلاح قاعدة البيانات</h2>
                    <p className="muted small" style={{ marginBottom: ".7rem" }}>
                      فحص ذاتي آمن لا يحذف أي بيانات جوهرية: يصحح المخزون والأسعار السالبة، يزامن أرصدة المحافظ مع حركاتها،
                      وينظف رموز التحقق والجلسات المنتهية والإشعارات الأقدم من 90 يوماً والحظر المنتهي.
                    </p>
                    <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} disabled={repairing} onClick={runRepair}>
                      {repairing ? "⏳ جاري الفحص والإصلاح..." : "🩺 تشغيل الفحص والإصلاح الآن"}
                    </button>
                    {report && (
                      <div className="mt-3 anim-bounce-in">
                        {report.map((t, i) => (
                          <p key={i} className="row between small" style={{ padding: ".35rem 0", borderBottom: i < report.length - 1 ? "1px dashed rgba(127,127,127,.2)" : "none" }}>
                            <span>{t.icon} {t.label}</span><strong>{t.detail}</strong>
                          </p>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* 💾 النسخ الاحتياطي والاستعادة */}
                  <section className="card" style={{ border: "1.5px solid rgba(5,150,105,.3)" }}>
                    <div className="row between" style={{ marginBottom: ".5rem" }}>
                      <h2 style={{ marginBottom: 0 }}>💾 النسخ الاحتياطي والاستعادة</h2>
                      <a href="/admin/backups" className="btn ghost small" style={{ textDecoration: "none" }}>المدير الكامل ←</a>
                    </div>
                    <p className="muted small" style={{ marginBottom: ".7rem" }}>
                      نسخة كاملة لكل جداول قاعدة البيانات بملف واحد محفوظ على الخادم. الاستعادة تستبدل كل البيانات الحالية بمحتوى النسخة — بأمان تام: إما تنجح كاملة أو لا يتغير شيء.
                    </p>
                    <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} disabled={creatingBk} onClick={createBackup}>
                      {creatingBk ? "⏳ جاري إنشاء النسخة..." : "💾 إنشاء نسخة احتياطية الآن"}
                    </button>

                    {!backups ? <div className="skeleton h-16 rounded-2xl mt-3" /> : (
                      <div className="mt-3">
                        {backups.backups.length === 0 && (
                          <p className="small muted text-center" style={{ padding: ".8rem 0" }}>لا نسخ محفوظة بعد — أنشئ أول نسخة الآن 🚨</p>
                        )}
                        {backups.backups.slice(0, 5).map((b: any) => (
                          <div key={b.id} className="p-2 rounded-xl mb-2" style={{ background: "rgba(127,127,127,.06)" }}>
                            <div className="row between" style={{ flexWrap: "wrap", gap: ".4rem" }}>
                              <div>
                                <b style={{ fontFamily: "monospace", fontSize: 12 }}>{b.filename}</b>
                                {!b.exists && <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>⚠️ الملف مفقود</span>}
                                <div className="text-[11px] muted">
                                  📦 {fmtSize(b.size)} · 🗓️ {new Date(b.createdAt).toLocaleString("ar-YE")}{b.note ? ` · 📝 ${b.note}` : ""}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button className="btn ghost small" disabled={!b.exists} onClick={() => { setRestoreTarget(b); setRestorePhrase(""); }}>♻️ استعادة</button>
                                <button className="btn ghost small" disabled={!b.exists} onClick={() => downloadBackup(b)}>⬇️</button>
                                <button className="btn danger small" onClick={() => removeBackup(b)}>🗑️</button>
                              </div>
                            </div>
                            {restoreTarget?.id === b.id && (
                              <div className="anim-bounce-in mt-2 p-2 rounded-xl" style={{ background: "rgba(220,38,38,.06)", border: "1px dashed rgba(220,38,38,.4)" }}>
                                <p className="small" style={{ color: "#b91c1c", fontWeight: 700, marginBottom: ".4rem" }}>
                                  ⚠️ ستُستبدل كل البيانات الحالية بمحتوى هذه النسخة — اكتب <strong>استعادة</strong> للتأكيد
                                </p>
                                <div className="flex gap-2">
                                  <input className="flex-1" value={restorePhrase} onChange={(e) => setRestorePhrase(e.target.value)} placeholder="استعادة" style={{ marginBottom: 0 }} />
                                  <button className="btn danger" style={{ background: "#dc2626", color: "#fff" }}
                                    disabled={restoring || restorePhrase.trim() !== "استعادة"} onClick={runRestore}>
                                    {restoring ? "⏳ جاري الاستعادة..." : "♻️ تنفيذ"}
                                  </button>
                                  <button className="btn ghost" onClick={() => setRestoreTarget(null)}>إلغاء</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {backups.backups.length > 5 && (
                          <a href="/admin/backups" className="small" style={{ color: "var(--primary, #6C3DF5)", fontWeight: 700 }}>
                            عرض كل النسخ ({backups.backups.length}) ←
                          </a>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="card" style={{ border: "1.5px solid rgba(220,38,38,.35)", background: "rgba(220,38,38,.04)" }}>
                    <h2 style={{ color: "#dc2626" }}>⚠️ إعادة ضبط قاعدة البيانات</h2>
                    <p className="muted small" style={{ marginBottom: ".5rem" }}>
                      إجراء نهائي لا يمكن التراجع عنه — يُفرّغ <strong>كل البيانات التشغيلية</strong>: المتاجر والبائعين والعملاء والطلبات
                      والمدفوعات والمحافظ والمنتجات والإعلانات. يُبقي فقط: حسابات الإدارة، الخطط، الإعدادات، العملات، المحافظات، بوابات الدفع.
                    </p>
                    <p className="small" style={{ color: "#b91c1c", fontWeight: 700, marginBottom: ".6rem" }}>
                      💾 يُنصح بشدة بأخذ نسخة احتياطية من صفحة النسخ الاحتياطي قبل المتابعة
                    </p>
                    {!resetAck ? (
                      <button className="btn danger" style={{ width: "100%", justifyContent: "center" }} onClick={() => setResetAck(true)}>
                        🔓 فتح منطقة الخطر — أفهم العواقب
                      </button>
                    ) : (
                      <div className="anim-bounce-in">
                        <label className="row small" style={{ gap: ".4rem", marginBottom: ".5rem" }}>
                          <input type="checkbox" style={{ width: "auto", marginBottom: 0 }} checked={resetAck} readOnly />
                          أُدرك أن جميع بيانات التشغيل ستُحذف نهائياً
                        </label>
                        <label className="muted small">اكتب عبارة التأكيد: <strong style={{ color: "#dc2626" }}>إعادة ضبط</strong></label>
                        <input value={resetPhrase} onChange={(e) => setResetPhrase(e.target.value)} placeholder="إعادة ضبط"
                          style={{ borderColor: "rgba(220,38,38,.4)" }} />
                        <div className="flex gap-2">
                          <button className="btn danger flex-1" style={{ justifyContent: "center", background: "#dc2626", color: "#fff" }}
                            disabled={resetting || resetPhrase.trim() !== "إعادة ضبط"} onClick={runReset}>
                            {resetting ? "⏳ جاري إعادة الضبط..." : "♻️ تنفيذ إعادة الضبط نهائياً"}
                          </button>
                          <button className="btn ghost" onClick={() => { setResetAck(false); setResetPhrase(""); }}>تراجع</button>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}

              {tab === "reset" && (
                <>
                  <section className="card">
                    <div className="row between" style={{ marginBottom: ".5rem", flexWrap: "wrap", gap: ".4rem" }}>
                      <h2 style={{ marginBottom: 0 }}>🧹 تحديد جداول قاعدة البيانات</h2>
                      <div className="flex gap-1">
                        <button className="btn ghost small" onClick={selectAll} disabled={!tables}>تحديد الكل</button>
                        <button className="btn ghost small" onClick={() => setSelTables([])}>إلغاء التحديد</button>
                        <button className="btn ghost small" onClick={loadTables} disabled={tablesLoading}>{tablesLoading ? "⏳" : "🔄"}</button>
                      </div>
                    </div>
                    <p className="muted small" style={{ marginBottom: ".5rem" }}>
                      حدّد الجداول المستهدفة ثم اختر الإجراء بالأسفل: <strong>تصغير البيانات</strong> يحذف السجلات القديمة ويبقي الأحدث،
                      و<strong>استعادة الضبط</strong> تُفرّغ الجدول بالكامل. الجداول المرجعية (الإدارة، الإعدادات، الخطط، العملات، بوابات الدفع) محمية ولا يمكن تحديدها.
                    </p>
                    <div className="flex gap-1" style={{ flexWrap: "wrap", marginBottom: ".6rem" }}>
                      {TABLE_GROUPS.map((g) => (
                        <button key={g.label} className="btn ghost small" onClick={() => selectGroup(g.tables)} disabled={!tables}>{g.label}</button>
                      ))}
                    </div>
                    {selTables.length > 0 && (
                      <p className="small" style={{ color: "var(--primary, #6C3DF5)", fontWeight: 800, marginBottom: ".5rem" }}>
                        ✅ حدّدت {selTables.length} جدولاً
                      </p>
                    )}
                    {!tables ? (
                      <div className="skeleton h-24 rounded-2xl" />
                    ) : (
                      <div style={{ maxHeight: 340, overflowY: "auto", display: "grid", gap: ".35rem" }}>
                        {tables.map((t) => {
                          const sel = selTables.includes(t.name);
                          return (
                            <label key={t.name} className="row between small"
                              style={{ padding: ".45rem .6rem", borderRadius: 12, gap: ".5rem",
                                background: sel ? "rgba(108,61,245,.09)" : "rgba(127,127,127,.06)",
                                border: sel ? "1px solid rgba(108,61,245,.35)" : "1px solid transparent",
                                opacity: t.protected ? .55 : 1, cursor: t.protected ? "not-allowed" : "pointer" }}>
                              <span className="row" style={{ gap: ".45rem", minWidth: 0, flexWrap: "wrap" }}>
                                <input type="checkbox" disabled={t.protected} checked={sel} onChange={() => toggleTable(t.name)} style={{ width: "auto", marginBottom: 0 }} />
                                <b style={{ fontFamily: "monospace", fontSize: 12 }}>{t.name}</b>
                                {TABLE_LABELS[t.name] && <span className="muted">{TABLE_LABELS[t.name]}</span>}
                                {t.protected && <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>🔒 محمي</span>}
                                {!t.hasCreatedAt && !t.protected && <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>⏱️ بلا تاريخ</span>}
                              </span>
                              <span className="muted" style={{ whiteSpace: "nowrap" }}>{Number(t.rows).toLocaleString("en")} سجل · {t.size}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* 🗜️ تصغير بيانات الجداول المحددة */}
                  <section className="card" style={{ border: "1.5px solid rgba(217,119,6,.35)", background: "rgba(217,119,6,.04)" }}>
                    <h2 style={{ color: "#b45309" }}>🗜️ تصغير بيانات الجداول المحددة</h2>
                    <p className="muted small" style={{ marginBottom: ".5rem" }}>
                      يحذف السجلات <strong>الأقدم</strong> من المدة التي تحددها ويبقي الأحدث — مثالي لتخفيف السجلات والإشعارات والجلسات دون فقدان البيانات الحديثة. الجداول بلا عمود تاريخ تُتخطّى تلقائياً.
                    </p>
                    <div className="row" style={{ gap: ".5rem", marginBottom: ".6rem", flexWrap: "wrap" }}>
                      <span className="small muted">الاحتفاظ بآخر</span>
                      <input type="number" min={1} max={3650} value={shrinkDays} onChange={(e) => setShrinkDays(Math.max(1, Number(e.target.value) || 30))} style={{ width: 90, marginBottom: 0 }} />
                      <span className="small muted">يوماً — يُحذف ما هو أقدم من ذلك</span>
                    </div>
                    {!shrinkAck ? (
                      <button className="btn primary" style={{ width: "100%", justifyContent: "center", background: "#d97706" }}
                        disabled={!selTables.length} onClick={() => setShrinkAck(true)}>
                        🔓 المتابعة للتصغير — {selTables.length ? `حدّدت ${selTables.length} جدولاً` : "حدّد الجداول أولاً من الأعلى"}
                      </button>
                    ) : (
                      <div className="anim-bounce-in">
                        <label className="muted small">اكتب عبارة التأكيد: <strong style={{ color: "#b45309" }}>تصغير</strong></label>
                        <input value={shrinkPhrase} onChange={(e) => setShrinkPhrase(e.target.value)} placeholder="تصغير" style={{ borderColor: "rgba(217,119,6,.4)" }} />
                        <div className="flex gap-2">
                          <button className="btn primary flex-1" style={{ justifyContent: "center", background: "#d97706" }}
                            disabled={shrinking || shrinkPhrase.trim() !== "تصغير" || !selTables.length} onClick={runShrink}>
                            {shrinking ? "⏳ جاري التصغير..." : "🗜️ تنفيذ التصغير الآن"}
                          </button>
                          <button className="btn ghost" onClick={() => { setShrinkAck(false); setShrinkPhrase(""); }}>تراجع</button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* ♻️ استعادة ضبط الجداول المحددة */}
                  <section className="card" style={{ border: "1.5px solid rgba(220,38,38,.35)", background: "rgba(220,38,38,.04)" }}>
                    <h2 style={{ color: "#dc2626" }}>⚠️ استعادة ضبط الجداول المحددة</h2>
                    <p className="muted small" style={{ marginBottom: ".5rem" }}>
                      إجراء نهائي لا يمكن التراجع عنه — يُفرّغ <strong>كل جدول حدّدته</strong> بالكامل مع إعادة ترقيمه. لا تُمس الجداول غير المحددة ولا المحمية.
                    </p>
                    <p className="small" style={{ color: "#b91c1c", fontWeight: 700, marginBottom: ".6rem" }}>
                      💾 يُنصح بشدة بأخذ نسخة احتياطية من تبويب قاعدة البيانات قبل المتابعة
                    </p>
                    {!wipeAck ? (
                      <button className="btn danger" style={{ width: "100%", justifyContent: "center" }}
                        disabled={!selTables.length} onClick={() => setWipeAck(true)}>
                        🔓 فتح منطقة الخطر — {selTables.length ? `حدّدت ${selTables.length} جدولاً` : "حدّد الجداول أولاً من الأعلى"}
                      </button>
                    ) : (
                      <div className="anim-bounce-in">
                        <label className="muted small">اكتب عبارة التأكيد: <strong style={{ color: "#dc2626" }}>إعادة ضبط</strong></label>
                        <input value={wipePhrase} onChange={(e) => setWipePhrase(e.target.value)} placeholder="إعادة ضبط" style={{ borderColor: "rgba(220,38,38,.4)" }} />
                        <div className="flex gap-2">
                          <button className="btn danger flex-1" style={{ justifyContent: "center", background: "#dc2626", color: "#fff" }}
                            disabled={wiping || wipePhrase.trim() !== "إعادة ضبط" || !selTables.length} onClick={runWipeSelected}>
                            {wiping ? "⏳ جاري التفريغ..." : "♻️ تفريغ الجداول المحددة نهائياً"}
                          </button>
                          <button className="btn ghost" onClick={() => { setWipeAck(false); setWipePhrase(""); }}>تراجع</button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* 📋 نتيجة آخر عملية */}
                  {opResult && (
                    <section className="card anim-bounce-in">
                      <h2>{opResult.type === "shrink" ? "🗜️ نتيجة التصغير" : "♻️ نتيجة استعادة الضبط"}</h2>
                      {opResult.type === "shrink" ? (
                        <div>
                          {(opResult.results || []).map((r: any, i: number) => (
                            <p key={i} className="row between small" style={{ padding: ".35rem 0", borderBottom: i < opResult.results.length - 1 ? "1px dashed rgba(127,127,127,.2)" : "none" }}>
                              <span style={{ fontFamily: "monospace" }}>{TABLE_LABELS[r.table] || "🗃️"} {r.table}</span>
                              <strong>{r.skipped ? "⏭️ تُخطّي — بلا عمود تاريخ" : `🗑️ حُذف ${Number(r.deleted).toLocaleString("en")}`}</strong>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="small muted">فُرّغت الجداول: <b style={{ fontFamily: "monospace" }}>{(opResult.tables || []).join("، ")}</b></p>
                      )}
                    </section>
                  )}
                </>
              )}

              {tab !== "account" && tab !== "database" && tab !== "reset" && (
                <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} disabled={saving} onClick={saveSettings}>
                  {saving ? "⏳ جاري الحفظ..." : "💾 حفظ جميع الإعدادات"}
                </button>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
