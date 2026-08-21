"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import ImageUpload from "../../../components/ImageUpload";
import { api, imgUrl } from "../../../lib/api";
import { toast } from "../../../components/Toast";

const STYLES = [
  { id: "neon-purple", name: "نيون بنفسجي", primary: "#6C3DF5", secondary: "#00E5C7", accent: "#FFB800" },
  { id: "ocean-blue", name: "أزرق محيط", primary: "#0EA5E9", secondary: "#22D3EE", accent: "#F59E0B" },
  { id: "emerald", name: "أخضر زمردي", primary: "#059669", secondary: "#34D399", accent: "#FBBF24" },
  { id: "royal-gold", name: "ذهبي ملكي", primary: "#B45309", secondary: "#F59E0B", accent: "#7C3AED" },
  { id: "rose-pink", name: "وردي عصري", primary: "#E11D48", secondary: "#FB7185", accent: "#8B5CF6" },
  { id: "desert-sand", name: "رملي صحراوي", primary: "#C2410C", secondary: "#FDBA74", accent: "#0D9488" },
  { id: "midnight", name: "ليلي سماوي", primary: "#4338CA", secondary: "#818CF8", accent: "#22D3EE" },
  { id: "coral-reef", name: "مرجاني حي", primary: "#F43F5E", secondary: "#FDA4AF", accent: "#10B981" },
];
const FONTS = [
  { id: "Cairo", name: "القاهرة", sample: "خط عصري واضح — الأشهر عربياً" },
  { id: "Tajawal", name: "تجوال", sample: "خط هندسي متوازن وأنيق" },
  { id: "Almarai", name: "المراعي", sample: "خط بسيط مريح للقراءة" },
  { id: "Changa", name: "تشانجا", sample: "خط عريض قوي للعناوين" },
  { id: "IBM Plex Sans Arabic", name: "IBM بلكس", sample: "خط تقني احترافي" },
];
const RADII = [
  { id: "0.5rem", name: "حاد", icon: "▪️" },
  { id: "1rem", name: "متوازن", icon: "🔲" },
  { id: "1.5rem", name: "ناعم", icon: "🔘" },
  { id: "2rem", name: "دائري كامل", icon: "⭕" },
];
// 📱 ثيمات التطبيق الجاهزة — تُطبق داخل تطبيق أندرويد فقط
const APP_THEMES = [
  { id: "original", name: "الزجاجي الفاتح", desc: "الوضع الحالي — فاتح أنيق", bg: "#f7f7fc", card: "#ffffff", ink: "#1f2937" },
  { id: "sand", name: "الرملي الدافئ", desc: "فاتح بلمسة ترابية هادئة", bg: "#faf6ef", card: "#fffdf8", ink: "#3d2f1d" },
  { id: "sky", name: "السماوي", desc: "فاتح أزرق منعش", bg: "#eef6ff", card: "#ffffff", ink: "#0b2545" },
  { id: "mint", name: "النعناعي", desc: "فاتح أخضر مريح", bg: "#edf9f3", card: "#ffffff", ink: "#053b2c" },
  { id: "rose", name: "الوردي", desc: "فاتح وردي ناعم", bg: "#fff3f6", card: "#ffffff", ink: "#4a0e20" },
  { id: "lavender", name: "اللافندر", desc: "فاتح بنفسجي هادئ", bg: "#f5f3ff", card: "#ffffff", ink: "#2b1a5e" },
  { id: "peach", name: "الخوخي", desc: "فاتح برتقالي دافئ", bg: "#fff6ee", card: "#ffffff", ink: "#4a1d05" },
  { id: "midnight", name: "الليلي البنفسجي", desc: "داكن فاخر يريح العين", bg: "#0d0d1a", card: "#161628", ink: "#e8e8f5" },
  { id: "amoled", name: "AMOLED الأسود", desc: "أسود خالص موفّر للطاقة", bg: "#000000", card: "#101010", ink: "#f2f2f2" },
  { id: "ocean", name: "الليلي المحيطي", desc: "أزرق ليلي عميق وهادئ", bg: "#071018", card: "#0d1b26", ink: "#e3f0f8" },
];
const SECTIONS: Record<string, string> = {
  hero: "قسم البطل (Hero)", slider: "السلايدر", flashSale: "عرض الفلاش", ads: "الإعلانات", trending: "يُباع الآن",
  rising: "متاجر صاعدة", features: "المميزات", newest: "وصل حديثاً",
  templates: "قوالب المتاجر", stores: "شريط المتاجر", services: "خدمات المنصة", blog: "المدونة", cta: "الدعوة الأخيرة",
};
// ترتيب الأقسام القابل للسحب — مفاتيح العرض في الواجهة
const ORDER_LABELS: Record<string, string> = {
  hero: "🎯 قسم البطل", slider: "🖼️ السلايدر", flashSale: "⚡ عرض الفلاش", ads_top: "📢 إعلانات أعلى الرئيسية",
  trending: "🔥 يُباع الآن", rising: "📈 متاجر صاعدة", features: "✨ المميزات", newest: "🆕 وصل حديثاً",
  templates: "🎨 قوالب المتاجر", ads_mid: "📢 إعلانات وسط الرئيسية", stores: "🏪 شريط المتاجر",
  services: "🧩 خدمات المنصة", blog: "📰 المدونة", cta: "🚀 الدعوة الأخيرة",
};
const DEFAULT_ORDER = Object.keys(ORDER_LABELS);

export default function AdminDesignPage() {
  const [tab, setTab] = useState<"identity" | "typography" | "slider" | "sections" | "app" | "code" | "backups">("identity");
  const [data, setData] = useState<any>(null);
  const [platform, setPlatform] = useState<any>({});
  const [colors, setColors] = useState<any>({});
  const [layout, setLayout] = useState<any>({});
  const [fonts, setFonts] = useState<any>({});
  const [customCode, setCustomCode] = useState<any>({ headScripts: "", bodyScripts: "", customCss: "" });
  // 📱 إعدادات استوديو التطبيق — تُطبق داخل تطبيق أندرويد فقط
  const [appCfg, setAppCfg] = useState<any>({ theme: "original", density: "compact", headerStyle: "glass", heroHeight: "compact", fontSize: "medium", navStyle: "capsule", textColor: "", floatingNav: true, showAnnouncement: true, showCurrency: true, showCta: true, pullToRefresh: true, haptics: true, primaryColor: "", radius: "", customCss: "" });
  const [slideForm, setSlideForm] = useState<any>({ title: "", subtitle: "", image: "", link: "", sort: 0 });
  const [editingSlide, setEditingSlide] = useState<string | null>(null);
  const [backupName, setBackupName] = useState("");

  const load = () => api("/admin/design").then((d) => {
    setData(d);
    setPlatform(d.settings.platform || {});
    setColors(d.settings.colors || {});
    setLayout(d.settings.layout || {});
    setFonts(d.settings.fonts || {});
    setCustomCode({ headScripts: "", bodyScripts: "", customCss: "", ...(d.settings.customCode || {}) });
    setAppCfg({ theme: "original", density: "compact", headerStyle: "glass", heroHeight: "compact", fontSize: "medium", navStyle: "capsule", textColor: "", floatingNav: true, showAnnouncement: true, showCurrency: true, showCta: true, pullToRefresh: true, haptics: true, primaryColor: "", radius: "", customCss: "", ...(d.settings.app || {}) });
  }).catch((e) => toast(e.message, "error"));
  useEffect(() => { load(); }, []);

  const save = async (entries: any[], msg: string) => {
    try { await api("/admin/design/settings", { method: "PUT", body: JSON.stringify({ entries }) }); toast(msg); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const saveSlide = async () => {
    if (!slideForm.image.trim()) return toast("⚠️ ارفع صورة الشريحة من جهازك أولاً", "error");
    try {
      await api("/admin/design/slides", { method: "POST", body: JSON.stringify(editingSlide ? { ...slideForm, id: editingSlide } : slideForm) });
      toast(editingSlide ? "✅ حُدّثت الشريحة" : "✅ أُضيفت الشريحة");
      setSlideForm({ title: "", subtitle: "", image: "", link: "", sort: 0 });
      setEditingSlide(null);
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const toggleSlide = async (s: any) => {
    try { await api("/admin/design/slides", { method: "POST", body: JSON.stringify({ id: s.id, isActive: !s.isActive }) }); toast(s.isActive ? "⏸️ أُخفيت الشريحة" : "▶️ ظهرت الشريحة"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const deleteSlide = async (id: string) => {
    if (!confirm("حذف الشريحة نهائياً؟")) return;
    try { await api("/admin/design/slides/" + id, { method: "DELETE" }); toast("🗑️ حُذفت الشريحة"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const makeBackup = async () => {
    if (!backupName.trim()) return toast("⚠️ اسم النسخة مطلوب", "error");
    try { await api("/admin/design/backups", { method: "POST", body: JSON.stringify({ name: backupName }) }); toast("💾 حُفظت النسخة"); setBackupName(""); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const restore = async (b: any) => {
    if (!confirm("استعادة نسخة \"" + b.name + "\"؟ سيُستبدل التصميم الحالي")) return;
    try { await api("/admin/design/backups/" + b.id + "/restore", { method: "POST", body: "{}" }); toast("♻️ تمت الاستعادة"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const sections = layout.sections || {};

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🎨 إدارة التصميم</h1>
          <p className="text-sm text-gray-500 mb-4">هوية المنصة · الألوان · السلايدر · الأقسام · النسخ الاحتياطية</p>

          {data?.tips && (
            <div className="ai-card mb-4">
              <h3 className="font-black mb-2">🤖 ملاحظات الذكاء المحلي</h3>
              <div className="grid md:grid-cols-2 gap-1">
                {data.tips.map((t: any, i: number) => (
                  <div key={i} className="text-sm">{t.icon} {t.text}</div>
                ))}
              </div>
            </div>
          )}

          <div className="tabs">
            {([["identity", "🎨 الهوية والألوان"], ["typography", "✍️ الخطوط والأشكال"], ["slider", "🖼️ السلايدر"], ["sections", "🧩 أقسام الرئيسية"], ["app", "📱 التطبيق"], ["code", "⚡ سكربتات مخصصة"], ["backups", "💾 النسخ"]] as const).map(([k, l]) => (
              <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k as any)}>{l}</button>
            ))}
          </div>

          {tab === "identity" && (
            <div>
              <div className="card mb-3">
                <h3 className="font-black mb-2">🏷️ هوية المنصة</h3>
                <div className="grid md:grid-cols-2 gap-2 mb-2">
                  <input className="input" placeholder="اسم المنصة" value={platform.name || ""} onChange={(e) => setPlatform({ ...platform, name: e.target.value })} />
                  <input className="input" placeholder="الشعار النصي (tagline)" value={platform.tagline || ""} onChange={(e) => setPlatform({ ...platform, tagline: e.target.value })} />
                  <input className="input" placeholder="واتساب المنصة" value={platform.whatsapp || ""} onChange={(e) => setPlatform({ ...platform, whatsapp: e.target.value })} />
                  <input className="input" placeholder="البريد الرسمي" value={platform.email || ""} onChange={(e) => setPlatform({ ...platform, email: e.target.value })} />
                </div>
                <div className="flex gap-2 items-center mb-2">
                  <input className="input flex-1" placeholder="📢 نص شريط الإعلان (يظهر أعلى كل الصفحات)" value={platform.announcement || ""} onChange={(e) => setPlatform({ ...platform, announcement: e.target.value })} />
                  <button className={"badge cursor-pointer " + (platform.announcementActive ? "" : "opacity-40")}
                    style={{ background: platform.announcementActive ? "#059669" : "#e5e7eb", color: platform.announcementActive ? "#fff" : "#374151" }}
                    onClick={() => setPlatform({ ...platform, announcementActive: !platform.announcementActive })}>
                    {platform.announcementActive ? "مفعّل" : "معطّل"}
                  </button>
                </div>
                <button className="btn w-full" onClick={() => save([{ key: "platform", value: platform, group: "general" }], "✅ حُفظت الهوية")}>💾 حفظ الهوية</button>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">🌈 أنماط جاهزة</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {STYLES.map((s) => (
                    <button key={s.id} className="badge cursor-pointer" style={{ background: "#f3f4f6", color: "#374151" }}
                      onClick={() => setColors({ ...colors, primary: s.primary, secondary: s.secondary, accent: s.accent })}>
                      <span className="inline-block w-3 h-3 rounded-full ml-1" style={{ background: s.primary }} />{s.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[["primary", "الأساسي"], ["secondary", "الثانوي"], ["accent", "المميّز"]].map(([k, l]) => (
                    <label key={k} className="text-center">
                      <input type="color" className="w-full h-12 rounded-xl cursor-pointer border-0" value={colors[k] || "#6C3DF5"} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} />
                      <span className="text-xs font-bold text-gray-500">{l}</span>
                    </label>
                  ))}
                </div>
                <div className="p-3 rounded-2xl mb-2 text-white text-center font-bold" style={{ background: colors.primary || "#6C3DF5" }}>
                  معاينة: هكذا تبدو الأزرار والعناوين 🎯
                </div>
                <button className="btn w-full" onClick={() => save([{ key: "colors", value: colors, group: "theme" }], "✅ حُفظت الألوان — تُطبق فوراً على المنصة")}>💾 حفظ الألوان</button>
              </div>

              {/* 👁️ معاينة حية للهوية البصرية */}
              <div className="card">
                <h3 className="font-black mb-2">👁️ معاينة حية — هكذا سيرى الزوار منصتك</h3>
                <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ fontFamily: `'${fonts.family || "Cairo"}', sans-serif` }}>
                  <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${colors.primary || "#6C3DF5"}, ${colors.secondary || "#00E5C7"})` }}>
                    <div className="font-black text-lg flex items-center gap-2">
                      <img src={platform.logoUrl || "/logo.png"} alt="" className="w-8 h-8 object-contain" />
                      {platform.name || "يمن زون"}
                    </div>
                    <div className="text-xs opacity-90">{platform.tagline || "أنشئ متجرك الإلكتروني في دقيقتين"}</div>
                  </div>
                  <div className="p-3 bg-gray-50 flex gap-2 items-center">
                    <div className="flex-1 bg-white rounded-xl p-2 shadow-sm text-xs font-bold text-center" style={{ color: colors.primary || "#6C3DF5", borderRadius: layout.radius || "1rem" }}>🛍️ منتج تجريبي</div>
                    <div className="px-4 py-2 text-white text-xs font-black shadow" style={{ background: colors.primary || "#6C3DF5", borderRadius: layout.radius || "1rem" }}>أنشئ متجرك</div>
                  </div>
                  <div className="px-3 pb-3 bg-gray-50">
                    <div className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block text-white" style={{ background: colors.accent || "#FFB800" }}>⭐ عرض خاص</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">المعاينة تتحدث لحظياً مع كل تغيير — لا تنسَ الحفظ 💾</p>
              </div>
            </div>
          )}

          {tab === "typography" && (
            <div>
              <div className="card mb-3">
                <h3 className="font-black mb-2">✍️ خط المنصة</h3>
                <p className="text-xs text-gray-400 mb-3">يُطبق على كل صفحات المنصة فوراً بعد الحفظ</p>
                <div className="grid md:grid-cols-2 gap-2 mb-3">
                  {FONTS.map((f) => {
                    const on = (fonts.family || "Cairo") === f.id;
                    return (
                      <button key={f.id} className={"p-3 rounded-2xl text-right border-2 transition-all " + (on ? "border-purple-400 bg-purple-50" : "border-gray-100 bg-white")}
                        onClick={() => setFonts({ ...fonts, family: f.id })}>
                        <div className="font-black" style={{ fontFamily: `'${f.id}', sans-serif` }}>{f.name} — منصة يمن زون</div>
                        <div className="text-xs text-gray-400">{f.sample}</div>
                      </button>
                    );
                  })}
                </div>
                <button className="btn w-full" onClick={() => save([{ key: "fonts", value: fonts, group: "theme" }], "✅ حُفظ الخط — يُطبق فوراً")}>💾 حفظ الخط</button>
              </div>

              <div className="card">
                <h3 className="font-black mb-2">🔲 انحناء الزوايا</h3>
                <p className="text-xs text-gray-400 mb-3">شخصية المنصة: حاد = رسمي صارم · دائري = ودود عصري</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {RADII.map((r) => {
                    const on = (layout.radius || "1.5rem") === r.id;
                    return (
                      <button key={r.id} className={"p-3 text-center border-2 transition-all bg-white " + (on ? "border-purple-400" : "border-gray-100")}
                        style={{ borderRadius: r.id }}
                        onClick={() => setLayout({ ...layout, radius: r.id })}>
                        <div className="text-xl">{r.icon}</div>
                        <div className="text-xs font-bold mt-1">{r.name}</div>
                      </button>
                    );
                  })}
                </div>
                {/* معاينة الانحناء */}
                <div className="flex gap-2 items-center mb-3">
                  <div className="px-4 py-2 text-white text-xs font-black" style={{ background: "var(--primary)", borderRadius: layout.radius || "1.5rem" }}>زر تجريبي</div>
                  <div className="px-4 py-2 bg-white border border-gray-200 text-xs font-bold shadow-sm" style={{ borderRadius: layout.radius || "1.5rem" }}>بطاقة تجريبية</div>
                </div>
                <button className="btn w-full" onClick={() => save([{ key: "layout", value: layout, group: "theme" }], "✅ حُفظت الانحناءات")}>💾 حفظ الانحناء</button>
              </div>
            </div>
          )}

          {tab === "slider" && data && (
            <div>
              <div className="card mb-3">
                <h3 className="font-black mb-2">{editingSlide ? "✏️ تعديل شريحة" : "➕ شريحة جديدة"}</h3>
                <div className="grid md:grid-cols-2 gap-2 mb-2">
                  <input className="input" placeholder="العنوان" value={slideForm.title} onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })} />
                  <input className="input" placeholder="العنوان الفرعي" value={slideForm.subtitle} onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })} />
                  <input className="input" placeholder="رابط عند النقر (اختياري)" value={slideForm.link} onChange={(e) => setSlideForm({ ...slideForm, link: e.target.value })} dir="ltr" />
                </div>
                {/* 📷 رفع صورة الشريحة من الجهاز */}
                <div className="mb-2">
                  <ImageUpload endpoint="/admin/design/upload" field="image" ratio="aspect-[16/6]"
                    value={slideForm.image} onChange={(url) => setSlideForm({ ...slideForm, image: url })}
                    label="📷 ارفع صورة الشريحة من جهازك *" hint="عريضة — حتى 5MB" />
                </div>
                <div className="flex gap-2">
                  <button className="btn flex-1" onClick={saveSlide}>{editingSlide ? "💾 حفظ التعديل" : "➕ إضافة"}</button>
                  {editingSlide && <button className="btn btn-danger" onClick={() => { setEditingSlide(null); setSlideForm({ title: "", subtitle: "", image: "", link: "", sort: 0 }); }}>إلغاء</button>}
                </div>
              </div>
              {data.slides.map((s: any) => (
                <div key={s.id} className="assign-row card mb-2">
                  <img src={imgUrl(s.image)} alt="" className="w-16 h-12 rounded-xl object-cover" />
                  <div className="flex-1">
                    <b>{s.title || "بدون عنوان"}</b>
                    <span className="badge mr-1" style={{ background: s.isActive ? "#d1fae5" : "#f3f4f6", color: s.isActive ? "#065f46" : "#6b7280" }}>{s.isActive ? "ظاهرة" : "مخفية"}</span>
                    <div className="text-xs text-gray-400">{s.subtitle}</div>
                  </div>
                  <button className="btn" onClick={() => { setEditingSlide(s.id); setSlideForm({ title: s.title || "", subtitle: s.subtitle || "", image: s.image, link: s.link || "", sort: s.sort }); }}>✏️</button>
                  <button className="btn" onClick={() => toggleSlide(s)}>{s.isActive ? "⏸️" : "▶️"}</button>
                  <button className="btn btn-danger" onClick={() => deleteSlide(s.id)}>🗑️</button>
                </div>
              ))}
              {data.slides.length === 0 && <div className="card text-center py-6 text-gray-400">لا شرائح — أضف أول شريحة للواجهة</div>}
            </div>
          )}

          {tab === "sections" && (
            <div>
              <div className="card mb-3">
                <h3 className="font-black mb-1">🧩 أقسام الصفحة الرئيسية</h3>
                <p className="text-xs text-gray-400 mb-3">أظهر/أخفِ أي قسم — التغيير فوري على الواجهة</p>
                {Object.entries(SECTIONS).map(([k, l]) => {
                  const on = sections[k] !== false;
                  return (
                    <div key={k} className="assign-row">
                      <span className="flex-1 font-bold text-sm">{l}</span>
                      <button className={"badge cursor-pointer " + (on ? "" : "opacity-40")}
                        style={{ background: on ? "#059669" : "#e5e7eb", color: on ? "#fff" : "#374151" }}
                        onClick={() => setLayout({ ...layout, sections: { ...sections, [k]: !on } })}>
                        {on ? "✅ ظاهر" : "🚫 مخفي"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="card">
                <h3 className="font-black mb-1">↕️ ترتيب الأقسام في الرئيسية</h3>
                <p className="text-xs text-gray-400 mb-3">حرّك أي قسم للأعلى أو الأسفل — يُطبق فوراً على واجهة الزوار</p>
                {(() => {
                  const saved: string[] = Array.isArray(layout.sectionOrder) ? layout.sectionOrder : [];
                  const order = [...saved.filter((k: string) => DEFAULT_ORDER.includes(k)), ...DEFAULT_ORDER.filter((k) => !saved.includes(k))];
                  const move = (i: number, dir: -1 | 1) => {
                    const next = [...order];
                    const j = i + dir;
                    if (j < 0 || j >= next.length) return;
                    [next[i], next[j]] = [next[j], next[i]];
                    setLayout({ ...layout, sectionOrder: next });
                  };
                  return order.map((k: string, i: number) => (
                    <div key={k} className="assign-row">
                      <span className="badge" style={{ background: "#f3f4f6", color: "#6b7280" }}>{i + 1}</span>
                      <span className="flex-1 font-bold text-sm">{ORDER_LABELS[k]}</span>
                      <button className="btn" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
                      <button className="btn" disabled={i === order.length - 1} onClick={() => move(i, 1)}>▼</button>
                    </div>
                  ));
                })()}
                <button className="btn w-full mt-3" onClick={() => save([{ key: "layout", value: layout, group: "theme" }], "✅ حُفظت الأقسام والترتيب — ظهرت فوراً في الرئيسية")}>💾 حفظ الأقسام والترتيب</button>
              </div>
            </div>
          )}

          {tab === "app" && (
            <div>
              <div className="card mb-3" style={{ border: "1px solid #ddd6fe", background: "#f5f3ff" }}>
                <b className="text-sm">📱 استوديو تصميم التطبيق</b>
                <p className="text-xs text-gray-500 mt-1">هذه الإعدادات تُطبَّق داخل تطبيق أندرويد فقط ولا تغيّر شيئاً في المتصفح. تظهر التغييرات فور الحفظ — داخل التطبيق اسحب الشاشة للأسفل للتحديث.</p>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-1">🌈 ثيمات التطبيق الجاهزة</h3>
                <p className="text-xs text-gray-400 mb-3">اختر شخصية التطبيق كاملة بلمسة واحدة — الخلفيات والبطاقات والترويسة والقائمة تتغير معاً</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {APP_THEMES.map((th) => (
                    <button key={th.id} onClick={() => setAppCfg({ ...appCfg, theme: th.id })}
                      className="rounded-2xl overflow-hidden text-right transition-transform active:scale-95"
                      style={{ border: appCfg.theme === th.id ? "3px solid #6C3DF5" : "1px solid #e5e7eb", boxShadow: appCfg.theme === th.id ? "0 8px 24px -8px rgba(108,61,245,.4)" : "none" }}>
                      {/* معاينة مصغرة بشكل جوال */}
                      <div className="p-2" style={{ background: th.bg }}>
                        <div className="h-2.5 rounded-full mb-1.5 mx-1" style={{ background: th.card, border: "1px solid rgba(128,128,128,.15)" }} />
                        <div className="rounded-lg p-1.5 mb-1.5" style={{ background: th.card }}>
                          <div className="h-1.5 rounded-full w-2/3 mb-1" style={{ background: th.ink, opacity: .8 }} />
                          <div className="h-1.5 rounded-full w-1/3" style={{ background: th.ink, opacity: .3 }} />
                        </div>
                        <div className="flex gap-1">
                          <div className="h-6 rounded-lg flex-1" style={{ background: th.card }} />
                          <div className="h-6 rounded-lg flex-1" style={{ background: th.card }} />
                        </div>
                      </div>
                      <div className="px-2 py-1.5 bg-white">
                        <div className="text-xs font-black">{appCfg.theme === th.id ? "✅ " : ""}{th.name}</div>
                        <div className="text-[10px] text-gray-400">{th.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">📐 كثافة الهوامش</h3>
                <div className="grid grid-cols-2 gap-2 mb-1">
                  {[["ultra", "⚡ فائقة الإدماج — أقصى محتوى"], ["compact", "✨ مضغوطة — أنيقة كالتطبيقات"], ["cozy", "🌐 متوازنة — مثل الموقع"], ["relaxed", "🍃 مريحة — مساحات واسعة"]].map(([k, l]) => (
                    <button key={k} className="badge cursor-pointer"
                      style={{ background: appCfg.density === k ? "#6C3DF5" : "#f3f4f6", color: appCfg.density === k ? "#fff" : "#374151", padding: "10px" }}
                      onClick={() => setAppCfg({ ...appCfg, density: k })}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">🔠 حجم الخط داخل التطبيق</h3>
                <div className="grid grid-cols-4 gap-2">
                  {[["small", "صغير", "13px"], ["medium", "وسط", "16px"], ["large", "كبير", "19px"], ["xlarge", "ضخم", "23px"]].map(([k, l, s]) => (
                    <button key={k} className="badge cursor-pointer flex flex-col items-center gap-0.5"
                      style={{ background: appCfg.fontSize === k ? "#6C3DF5" : "#f3f4f6", color: appCfg.fontSize === k ? "#fff" : "#374151", padding: "8px 4px" }}
                      onClick={() => setAppCfg({ ...appCfg, fontSize: k })}>
                      <span style={{ fontSize: s, fontWeight: 900, lineHeight: 1.2 }}>أ</span>
                      <span className="text-[10px]">{l}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">🖊️ لون الخط داخل التطبيق</h3>
                <p className="text-xs text-gray-400 mb-2">لون نصوص المحتوى (اتركه فارغاً ليتبع لون الثيم)</p>
                <div className="flex gap-2 items-center flex-wrap mb-2">
                  {["#111827", "#1e3a5f", "#3b2f2f", "#4a044e", "#052e16", "#7c2d12"].map((c) => (
                    <button key={c} className="w-9 h-9 rounded-full transition-transform active:scale-90"
                      style={{ background: c, border: appCfg.textColor === c ? "3px solid #6C3DF5" : "2px solid #e5e7eb" }}
                      onClick={() => setAppCfg({ ...appCfg, textColor: c })} />
                  ))}
                  <input type="color" className="w-9 h-9 rounded-full cursor-pointer border-2 border-dashed border-gray-300" value={appCfg.textColor || "#111827"} onChange={(e) => setAppCfg({ ...appCfg, textColor: e.target.value })} />
                </div>
                {appCfg.textColor && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: appCfg.textColor }}>نص تجريبي بلونك {appCfg.textColor}</span>
                    <button className="badge cursor-pointer" style={{ background: "#f3f4f6", color: "#374151" }} onClick={() => setAppCfg({ ...appCfg, textColor: "" })}>↩️ لون الثيم</button>
                  </div>
                )}
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">🎩 نمط الترويسة العلوية</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[["glass", "🫧 زجاجية"], ["solid", "⬜ بيضاء صلبة"], ["tinted", "🎨 مموّهة باللون"], ["gradient", "🌈 متدرجة باللون"], ["minimal", "▫️ شفافة بسيطة"]].map(([k, l]) => (
                    <button key={k} className="badge cursor-pointer"
                      style={{ background: appCfg.headerStyle === k ? "#6C3DF5" : "#f3f4f6", color: appCfg.headerStyle === k ? "#fff" : "#374151", padding: "10px" }}
                      onClick={() => setAppCfg({ ...appCfg, headerStyle: k })}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-1">🧭 شكل شريط التنقل السفلي</h3>
                <p className="text-xs text-gray-400 mb-3">اختر الشكل الذي يناسب شخصية تطبيقك</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ["bar", "شريط كلاسيكي", "ممتد بعرض الشاشة", { borderRadius: "6px 6px 0 0", margin: "0" }],
                    ["capsule", "كبسولة عائمة", "حبّة زجاجية عصرية", { borderRadius: "999px", margin: "0 10px 6px" }],
                    ["curved", "منحني الأعلى", "لوحة سفلية بانحناء", { borderRadius: "16px 16px 0 0", margin: "0" }],
                    ["minimal", "مصغّر أنيق", "كبسولة صغيرة منخفضة", { borderRadius: "999px", margin: "0 26px 6px", height: "14px" }],
                  ] as const).map(([k, l, dsc, st]) => (
                    <button key={k} onClick={() => setAppCfg({ ...appCfg, navStyle: k })}
                      className="rounded-2xl overflow-hidden text-right transition-transform active:scale-95 bg-white"
                      style={{ border: appCfg.navStyle === k ? "3px solid #6C3DF5" : "1px solid #e5e7eb", boxShadow: appCfg.navStyle === k ? "0 8px 24px -8px rgba(108,61,245,.4)" : "none" }}>
                      <div className="h-16 relative" style={{ background: "#f7f7fc" }}>
                        <div className="absolute bottom-0 inset-x-0 flex items-center justify-around" style={{ background: "#fff", height: "18px", boxShadow: "0 -2px 8px rgba(0,0,0,.08)", ...(st as any) }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: "#6C3DF5" }} />
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        </div>
                      </div>
                      <div className="px-2 py-1.5">
                        <div className="text-xs font-black">{appCfg.navStyle === k ? "✅ " : ""}{l}</div>
                        <div className="text-[10px] text-gray-400">{dsc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">🎯 قسم البطل (الرئيسية)</h3>
                <div className="flex gap-2">
                  {[["compact", "مضغوط — محتوى أكثر"], ["full", "كامل — كالموقع"]].map(([k, l]) => (
                    <button key={k} className="badge cursor-pointer flex-1"
                      style={{ background: appCfg.heroHeight === k ? "#6C3DF5" : "#f3f4f6", color: appCfg.heroHeight === k ? "#fff" : "#374151", padding: "10px" }}
                      onClick={() => setAppCfg({ ...appCfg, heroHeight: k })}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">🎨 هوية خاصة بالتطبيق</h3>
                <p className="text-xs text-gray-400 mb-2">لون مختلف للتطبيق عن لون المنصة (اتركه فارغاً ليتبع لون المنصة)</p>
                <div className="flex gap-2 items-center mb-3">
                  <input type="color" className="w-16 h-12 rounded-xl cursor-pointer border-0" value={appCfg.primaryColor || "#6C3DF5"} onChange={(e) => setAppCfg({ ...appCfg, primaryColor: e.target.value })} />
                  <button className="badge cursor-pointer" style={{ background: "#f3f4f6", color: "#374151" }} onClick={() => setAppCfg({ ...appCfg, primaryColor: "" })}>↩️ لون المنصة</button>
                  {appCfg.primaryColor && <span className="text-xs font-bold" style={{ color: appCfg.primaryColor }}>{appCfg.primaryColor}</span>}
                </div>
                <p className="text-xs text-gray-400 mb-2">انحناء البطاقات داخل التطبيق</p>
                <div className="flex gap-2 flex-wrap">
                  {[["", "كالمنصة"], ...RADII.map((r) => [r.id, r.name])].map(([k, l]) => (
                    <button key={k || "inherit"} className="badge cursor-pointer"
                      style={{ background: appCfg.radius === k ? "#6C3DF5" : "#f3f4f6", color: appCfg.radius === k ? "#fff" : "#374151" }}
                      onClick={() => setAppCfg({ ...appCfg, radius: k })}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">👁️ عناصر الترويسة داخل التطبيق</h3>
                <div className="flex gap-2 flex-wrap">
                  {([["showAnnouncement", "📢 شريط الإعلان"], ["showCurrency", "💱 مبدّل العملة"], ["showCta", "🚀 زر أنشئ متجرك"]] as const).map(([k, l]) => (
                    <button key={k} className="badge cursor-pointer"
                      style={{ background: appCfg[k] !== false ? "#059669" : "#e5e7eb", color: appCfg[k] !== false ? "#fff" : "#374151" }}
                      onClick={() => setAppCfg({ ...appCfg, [k]: appCfg[k] === false })}>
                      {appCfg[k] !== false ? "✅ " : "🚫 "}{l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">✨ لمسات التطبيق الحديثة</h3>
                <div className="flex gap-2 flex-wrap">
                  {([["floatingNav", "🫧 تنقل سفلي عائم"], ["pullToRefresh", "🔄 سحب للتحديث"], ["haptics", "📳 اهتزاز لمسي"]] as const).map(([k, l]) => (
                    <button key={k} className="badge cursor-pointer"
                      style={{ background: appCfg[k] !== false ? "#059669" : "#e5e7eb", color: appCfg[k] !== false ? "#fff" : "#374151" }}
                      onClick={() => setAppCfg({ ...appCfg, [k]: appCfg[k] === false })}>
                      {appCfg[k] !== false ? "✅ " : "🚫 "}{l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card mb-3">
                <h3 className="font-black mb-2">🖌️ CSS مخصص للتطبيق فقط</h3>
                <p className="text-xs text-gray-400 mb-2">يُحقن داخل التطبيق فقط — لا يمس المتصفح</p>
                <textarea dir="ltr" rows={4} className="input w-full font-mono text-xs" placeholder={".yz-bottomnav { background: #000; }"}
                  value={appCfg.customCss} onChange={(e) => setAppCfg({ ...appCfg, customCss: e.target.value })} />
              </div>

              <button className="btn w-full" onClick={() => save([{ key: "app", value: appCfg, group: "theme" }], "✅ حُفظت إعدادات التطبيق — اسحب للتحديث داخل التطبيق")}>💾 حفظ إعدادات التطبيق</button>
            </div>
          )}

          {tab === "code" && (
            <div>
              <div className="card mb-3" style={{ border: "1px solid #fde68a", background: "#fffbeb" }}>
                <b className="text-sm">⚠️ منطقة متقدمة</b>
                <p className="text-xs text-gray-500 mt-1">السكربتات وCSS المخصص تُحقن في كل صفحات الواجهة الأمامية فور الحفظ — أدخل كوداً موثوقاً فقط. مثالية لأكواد التتبع، أدوات الدردشة، وتخصيص التصميم الدقيق.</p>
              </div>
              <div className="card mb-3">
                <h3 className="font-black mb-2">🎨 CSS مخصص</h3>
                <p className="text-xs text-gray-400 mb-2">يُحقن داخل &lt;head&gt; — عدّل أي تنسيق في الواجهة</p>
                <textarea dir="ltr" rows={5} className="input w-full font-mono text-xs" placeholder={".card { border-radius: 20px; }"}
                  value={customCode.customCss} onChange={(e) => setCustomCode({ ...customCode, customCss: e.target.value })} />
              </div>
              <div className="card mb-3">
                <h3 className="font-black mb-2">📜 سكربتات الرأس (Head)</h3>
                <p className="text-xs text-gray-400 mb-2">تُحقن قبل نهاية &lt;head&gt; — أكواد التحليلات والتحقق</p>
                <textarea dir="ltr" rows={5} className="input w-full font-mono text-xs" placeholder={'<script src="https://..."></script>'}
                  value={customCode.headScripts} onChange={(e) => setCustomCode({ ...customCode, headScripts: e.target.value })} />
              </div>
              <div className="card mb-3">
                <h3 className="font-black mb-2">📜 سكربتات نهاية الصفحة (Body)</h3>
                <p className="text-xs text-gray-400 mb-2">تُحقن قبل نهاية &lt;body&gt; — أدوات الدردشة والودجت</p>
                <textarea dir="ltr" rows={5} className="input w-full font-mono text-xs" placeholder={'<script>...</script>'}
                  value={customCode.bodyScripts} onChange={(e) => setCustomCode({ ...customCode, bodyScripts: e.target.value })} />
              </div>
              <button className="btn w-full" onClick={() => save([{ key: "customCode", value: { headScripts: customCode.headScripts, bodyScripts: customCode.bodyScripts, customCss: customCode.customCss }, group: "theme" }], "✅ حُفظت الأكواد — تعمل الآن على كل الصفحات")}>💾 حفظ الأكواد المخصصة</button>
            </div>
          )}

          {tab === "backups" && data && (
            <div>
              <div className="card mb-3">
                <h3 className="font-black mb-2">💾 نسخة احتياطية من التصميم الحالي</h3>
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder="اسم النسخة (مثال: تصميم رمضان)" value={backupName} onChange={(e) => setBackupName(e.target.value)} />
                  <button className="btn" onClick={makeBackup}>حفظ نسخة</button>
                </div>
              </div>
              {data.backups.map((b: any) => (
                <div key={b.id} className="assign-row card mb-2">
                  <div className="flex-1">
                    <b>{b.name}</b>
                    <div className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleString("ar-YE")}</div>
                  </div>
                  <button className="btn" onClick={() => restore(b)}>♻️ استعادة</button>
                </div>
              ))}
              {data.backups.length === 0 && <div className="card text-center py-6 text-gray-400">لا نسخ بعد — احفظ نسخة قبل أي تعديل كبير</div>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
