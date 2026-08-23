"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import { useCurrency } from "../../../lib/currency";

// مفاتيح ميزات الخطة — تطابق نظام الميزات المركزي في الخادم
const FEATURE_KEYS: Record<string, string> = {
  analytics: "📊 الإحصائيات المتقدمة",
  coupons: "🎟️ الكوبونات",
  api: "🔑 API للمطورين",
  customDesign: "🎨 تخصيص التصميم",
  customDomain: "🌐 النطاق الخاص",
  campaigns: "📣 حملات الزبائن",
  storeAds: "🖼️ بنرات المتجر الإعلانية",
  finance: "💹 التقرير المالي المتقدم",
  inventory: "📦 إدارة المخزون الذكية",
  crm: "👥 إدارة العملاء",
};
// 🧬 أنواع الأنشطة — الخطة العامة (بدون نوع) تظهر للجميع، وخطة النوع تظهر لمتاجره فقط
const KIND_KEYS: Record<string, string> = {
  products: "🛍️ متاجر المنتجات",
  rentals: "🏠 الإيجارات",
  hotel: "🛎️ الفنادق",
  services: "🛠️ الخدمات",
  restaurants: "🍽️ المطاعم",
  malls: "🏬 المولات التجارية",
};
const emptyFeats = { maxProducts: 100, maxImages: 6, maxUnits: "", maxRooms: "", maxServices: "", analytics: false, coupons: false, api: false, customDesign: false, customDomain: false, campaigns: false, storeAds: false, finance: false, inventory: false, crm: false };
const empty = { id: "", name: "", slug: "", kind: "", priceMonthly: 0, priceYearly: "", currency: "", priceBefore: "", offerEndsAt: "", offerBadge: "", sort: 0, isActive: true, feats: { ...emptyFeats } };

export default function AdminPlansPage() {
  const { list: CURS, def: defCur } = useCurrency();
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ ...empty });
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    api("/admin/plans").then(setPlans).catch((e) => toast(e.message, "error"));
    api("/admin/subscriptions").then(setSubs).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast("⚠️ اسم الخطة مطلوب", "error");
    try {
      const body: any = {
        name: form.name,
        slug: form.slug || undefined,
        priceMonthly: Number(form.priceMonthly),
        priceYearly: form.priceYearly ? Number(form.priceYearly) : null,
        currency: form.currency || undefined,
        kind: form.kind || null,
        // 🎉 حقول العرض المحدود — فارغة = بلا عرض
        priceBefore: form.priceBefore ? Number(form.priceBefore) : null,
        offerEndsAt: form.offerEndsAt || null,
        offerBadge: form.offerBadge || null,
        // كل مفاتيح الميزات — لا يُمسح أي مفتاح عند التعديل
        features: {
          maxProducts: Number(form.feats.maxProducts),
          maxImages: Number(form.feats.maxImages),
          // حدود الأنشطة — فارغ/فارغة = بلا حد، -1 = غير محدود صراحة
          ...(form.feats.maxUnits !== "" && form.feats.maxUnits !== undefined ? { maxUnits: Number(form.feats.maxUnits) } : {}),
          ...(form.feats.maxRooms !== "" && form.feats.maxRooms !== undefined ? { maxRooms: Number(form.feats.maxRooms) } : {}),
          ...(form.feats.maxServices !== "" && form.feats.maxServices !== undefined ? { maxServices: Number(form.feats.maxServices) } : {}),
          analytics: !!form.feats.analytics,
          coupons: !!form.feats.coupons,
          api: !!form.feats.api,
          customDesign: !!form.feats.customDesign,
          customDomain: !!form.feats.customDomain,
          campaigns: !!form.feats.campaigns,
          storeAds: !!form.feats.storeAds,
          finance: !!form.feats.finance,
          inventory: !!form.feats.inventory,
          crm: !!form.feats.crm,
        },
        sort: Number(form.sort || 0),
        isActive: form.isActive,
      };
      if (form.id) await api(`/admin/plans/${form.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/admin/plans", { method: "POST", body: JSON.stringify(body) });
      toast("✅ تم حفظ الخطة");
      setForm({ ...empty });
      setShowForm(false);
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <div className="page">
      <div className="layout">
        <AdminSidebar />
        <main className="content">
          <h1>💎 إدارة الخطط والاشتراكات</h1>

          <button className="btn primary" style={{ marginBottom: "1rem" }} onClick={() => { setForm({ ...empty }); setShowForm(!showForm); }}>＋ خطة جديدة</button>

          {showForm && (
            <section className="card">
              <h2>{form.id ? "✏️ تعديل خطة" : "＋ خطة جديدة"}</h2>
              <input placeholder="اسم الخطة (الأساسية...)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input dir="ltr" placeholder="المعرّف slug (اختياري: basic)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              {/* 🧬 نوع النشاط المستهدف — فارغ = خطة عامة تظهر لكل المتاجر */}
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="">🌐 خطة عامة — تظهر لكل أنواع المتاجر</option>
                {Object.entries(KIND_KEYS).map(([k, label]) => (
                  <option key={k} value={k}>{label} — تظهر لمتاجر هذا النشاط فقط</option>
                ))}
              </select>
              {form.kind && form.kind !== "products" && (
                <div className="row">
                  {form.kind === "rentals" && <input type="number" placeholder="أقصى وحدات إيجار (فارغ = ∞)" value={form.feats.maxUnits} onChange={(e) => setForm({ ...form, feats: { ...form.feats, maxUnits: e.target.value } })} />}
                  {form.kind === "hotel" && <input type="number" placeholder="أقصى غرف (فارغ = ∞)" value={form.feats.maxRooms} onChange={(e) => setForm({ ...form, feats: { ...form.feats, maxRooms: e.target.value } })} />}
                  {form.kind === "services" && <input type="number" placeholder="أقصى خدمات (فارغ = ∞)" value={form.feats.maxServices} onChange={(e) => setForm({ ...form, feats: { ...form.feats, maxServices: e.target.value } })} />}
                </div>
              )}
              <input type="number" placeholder="السعر الشهري (0 = مجاني)" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} />
              <input type="number" placeholder="السعر السنوي (اختياري)" value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: e.target.value })} />
              {/* 💱 عملة سعر الخطة — من عملات المنصة المعتمدة */}
              <select value={form.currency || defCur?.code || ""} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURS.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code}) — {c.symbol}</option>)}
              </select>
              {/* 🎉 عرض محدود (اختياري): سعر ما قبل العرض + نهاية العرض + شارة تظهر في صفحات الباقات */}
              <div className="row">
                <input type="number" placeholder="🎉 السعر قبل العرض (يُعرض مشطوباً)" value={form.priceBefore} onChange={(e) => setForm({ ...form, priceBefore: e.target.value })} />
                <input type="date" title="تاريخ انتهاء العرض — عداد تنازلي" value={form.offerEndsAt} onChange={(e) => setForm({ ...form, offerEndsAt: e.target.value })} />
              </div>
              <input placeholder="شارة العرض (مثال: 🎉 عرض الافتتاح — لفترة محدودة)" value={form.offerBadge} onChange={(e) => setForm({ ...form, offerBadge: e.target.value })} />
              <div className="row">
                <input type="number" placeholder="أقصى منتجات (-1 = ∞)" value={form.feats.maxProducts} onChange={(e) => setForm({ ...form, feats: { ...form.feats, maxProducts: e.target.value } })} />
                <input type="number" placeholder="أقصى صور/منتج" value={form.feats.maxImages} onChange={(e) => setForm({ ...form, feats: { ...form.feats, maxImages: e.target.value } })} />
              </div>
              <input type="number" placeholder="الترتيب" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} />
              {/* ميزات الخطة — ما يُفتح للبائع بعد موافقتك على اشتراكه */}
              <div className="card" style={{ background: "var(--bg, #f8f7ff)", padding: "0.7rem" }}>
                <b className="small">🔐 ميزات هذه الخطة (تُفتح للبائع بموافقتك على الاشتراك):</b>
                {Object.entries(FEATURE_KEYS).map(([k, label]) => (
                  <label key={k} className="row small" style={{ cursor: "pointer" }}>
                    <input type="checkbox" style={{ width: "auto", marginBottom: 0 }}
                      checked={!!(form.feats as any)[k]}
                      onChange={(e) => setForm({ ...form, feats: { ...form.feats, [k]: e.target.checked } })} />
                    {label}
                  </label>
                ))}
              </div>
              <label className="row small"><input type="checkbox" style={{ width: "auto", marginBottom: 0 }} checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> خطة مفعّلة</label>
              <div className="row">
                <button className="btn primary" onClick={save}>💾 حفظ</button>
                <button className="btn ghost" onClick={() => setShowForm(false)}>إلغاء</button>
              </div>
            </section>
          )}

          <section className="card">
            <h2>📦 الخطط ({plans.length})</h2>
            <div className="grid-cards">
              {plans.map((p) => (
                <div key={p.id} className="plan-card">
                  <h3>{p.name}</h3>
                  <p className="small muted">{p.kind ? (KIND_KEYS[p.kind] || p.kind) : "🌐 خطة عامة"}</p>
                  <p className="price">{Number(p.priceMonthly) === 0 ? "مجاني" : `${Number(p.priceMonthly).toLocaleString()} ${p.currency}/شهر`}</p>
                  <p className="small">📦 {(p.features as any)?.maxProducts === -1 ? "∞" : (p.features as any)?.maxProducts ?? "∞"} منتج · 👥 {p._count?.subscriptions ?? 0} مشترك</p>
                  {p.kind && p.kind !== "products" && (
                    <p className="small">
                      {p.kind === "rentals" && `🏠 وحدات: ${(p.features as any)?.maxUnits === -1 || (p.features as any)?.maxUnits === undefined ? "∞" : (p.features as any).maxUnits}`}
                      {p.kind === "hotel" && `🛎️ غرف: ${(p.features as any)?.maxRooms === -1 || (p.features as any)?.maxRooms === undefined ? "∞" : (p.features as any).maxRooms}`}
                      {p.kind === "services" && `🛠️ خدمات: ${(p.features as any)?.maxServices === -1 || (p.features as any)?.maxServices === undefined ? "∞" : (p.features as any).maxServices}`}
                    </p>
                  )}
                  <p className="small muted">
                    {Object.keys(FEATURE_KEYS).filter((k) => (p.features as any)?.[k]).map((k) => FEATURE_KEYS[k].split(" ")[0]).join(" ") || "—"}
                  </p>
                  {p.priceYearly && <p className="small muted">سنوي: {Number(p.priceYearly).toLocaleString()}</p>}
                  {p.offerBadge && <p className="small" style={{ color: "#b45309" }}>{p.offerBadge}{p.offerEndsAt ? ` — حتى ${new Date(p.offerEndsAt).toLocaleDateString("ar-YE")}` : ""}</p>}
                  <p className={p.isActive ? "ok small" : "bad small"}>{p.isActive ? "✅ مفعّلة" : "⛔ معطّلة"}</p>
                  <button className="btn ghost small" onClick={() => {
                    const f = (p.features as any) || {};
                    setForm({
                      id: p.id, name: p.name, slug: p.slug, kind: p.kind || "", priceMonthly: Number(p.priceMonthly),
                      priceYearly: p.priceYearly ? Number(p.priceYearly) : "", currency: p.currency || "",
                      priceBefore: p.priceBefore ? Number(p.priceBefore) : "",
                      offerEndsAt: p.offerEndsAt ? new Date(p.offerEndsAt).toISOString().slice(0, 10) : "",
                      offerBadge: p.offerBadge || "", sort: p.sort, isActive: p.isActive,
                      feats: {
                        ...emptyFeats, ...f,
                        maxUnits: f.maxUnits ?? "", maxRooms: f.maxRooms ?? "", maxServices: f.maxServices ?? "",
                      },
                    });
                    setShowForm(true);
                  }}>✏️ تعديل</button>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>🏪 اشتراكات المتاجر ({subs.length})</h2>
            <p className="muted small">💡 طلبات الدفع المعلّقة تُراجع من <a href="/admin/payments">مركز المدفوعات 💳</a></p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>المتجر</th><th>الخطة</th><th>الحالة</th><th>تنتهي في</th></tr></thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id}>
                      <td>{s.store?.name || "—"} <span className="muted small">/{s.store?.slug}</span></td>
                      <td>{s.plan?.name || "—"}</td>
                      <td><span className={`badge ${s.isActive ? "active" : "cancelled"}`}>{s.isActive ? "نشط" : "منتهي"}</span></td>
                      <td>{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString("ar-YE") : "∞"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
