"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api, getUser } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import { useCurrency } from '../../../lib/currency';
import { useRouter } from "next/navigation";

// 🎟️ كوبونات المنصة + عروض الفلاش — حملات مركزية مجدولة بقياس أداء
const couponStatus = (c: any) => {
  const now = Date.now();
  if (!c.isActive) return { t: "موقوفة", cls: "cancelled" };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { t: "⏰ مجدولة", cls: "shipped" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return { t: "منتهية", cls: "cancelled" };
  if (c.maxUses && c.usedCount >= c.maxUses) return { t: "نفدت", cls: "cancelled" };
  return { t: "نشطة", cls: "active" };
};

export default function AdminCouponsPage() {
  const { list: CURS, def: defCur } = useCurrency();
  const dsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent", value: "", minTotal: "", maxUses: "", startsAt: "", expiresAt: "" });
  const [flash, setFlash] = useState({ active: false, title: "", endsAt: "", link: "/offers", couponCode: "" });

  const load = () => api("/admin/coupons").then((d) => { setList(d); setLoading(false); }).catch((e) => { toast(e.message, "error"); setLoading(false); });

  useEffect(() => {
    if (!getUser()) { router.push("/auth/admin-login"); return; }
    load();
    api("/admin/settings").then((d) => {
      if (d.settings?.flashSale) setFlash((f) => ({ ...f, ...d.settings.flashSale, endsAt: d.settings.flashSale.endsAt ? String(d.settings.flashSale.endsAt).slice(0, 16) : "" }));
    }).catch(() => {});
  }, []);

  const add = async () => {
    if (!form.code.trim()) return toast("⚠️ أدخل كود الكوبون", "error");
    if (!Number(form.value)) return toast("⚠️ أدخل قيمة الخصم", "error");
    setSaving(true);
    try {
      await api("/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: form.code, type: form.type, value: Number(form.value),
          minTotal: form.minTotal ? Number(form.minTotal) : 0,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          startsAt: form.startsAt || null, expiresAt: form.expiresAt || null,
        }),
      });
      toast("✅ أُنشئت الحملة — تعمل في كل متاجر المنصة");
      setForm({ code: "", type: "percent", value: "", minTotal: "", maxUses: "", startsAt: "", expiresAt: "" });
      load();
    } catch (e: any) { toast(e.message, "error"); }
    setSaving(false);
  };

  const toggle = async (c: any) => {
    try {
      await api(`/admin/coupons/${c.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !c.isActive }) });
      toast(c.isActive ? "⏸️ أُوقفت الحملة" : "▶️ فُعّلت الحملة");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const remove = async (c: any) => {
    if (!confirm(`حذف كوبون «${c.code}» نهائياً؟`)) return;
    try {
      await api(`/admin/coupons/${c.id}`, { method: "DELETE" });
      toast("🗑️ حُذف الكوبون");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const saveFlash = async () => {
    if (flash.active && (!flash.title.trim() || !flash.endsAt)) return toast("⚠️ أكمل العنوان وتاريخ النهاية", "error");
    setSaving(true);
    try {
      await api("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ settings: { flashSale: { ...flash, endsAt: flash.endsAt ? new Date(flash.endsAt).toISOString() : null } } }),
      });
      toast(flash.active ? "⚡ عرض الفلاش يظهر الآن في الرئيسية بعدّاد تنازلي" : "⏸️ أُوقف عرض الفلاش");
    } catch (e: any) { toast(e.message, "error"); }
    setSaving(false);
  };

  const totals = list.reduce((s, c) => ({ uses: s.uses + c.stats.orders, disc: s.disc + c.stats.discountGiven, rev: s.rev + c.stats.revenue }), { uses: 0, disc: 0, rev: 0 });

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🎟️ كوبونات المنصة والحملات</h1>
          <p className="text-sm text-gray-500 mb-4">كوبونات مركزية تعمل في كل المتاجر — الخصم من ميزانية المنصة لا من البائع</p>

          {/* ملخص الأداء */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { l: "استخدامات", v: totals.uses, i: "🎫" },
              { l: "خصومات ممنوحة", v: totals.disc.toLocaleString(), i: "💸" },
              { l: "مبيعات محققة", v: totals.rev.toLocaleString(), i: "📈" },
            ].map((k) => (
              <div key={k.l} className="card text-center !mb-0 !p-3">
                <div className="text-lg">{k.i}</div>
                <div className="text-xl font-black">{k.v}</div>
                <div className="text-[11px] muted">{k.l}</div>
              </div>
            ))}
          </div>

          {/* إنشاء */}
          <section className="card">
            <h2>➕ حملة كوبون جديدة</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="الكود — EID2026" dir="ltr" maxLength={20} />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="percent">٪ نسبة</option>
                <option value="fixed">💵 مبلغ ثابت</option>
              </select>
              <input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === "percent" ? "النسبة %" : `المبلغ ${dsym()}`} dir="ltr" />
              <input type="number" min={0} value={form.minTotal} onChange={(e) => setForm({ ...form, minTotal: e.target.value })} placeholder="أدنى إجمالي (0=بلا)" dir="ltr" />
              <input type="number" min={1} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="أقصى استخدامات (∞)" dir="ltr" />
              <label className="text-[10px] muted">🗓️ يبدأ<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} style={{ marginBottom: 0 }} /></label>
              <label className="text-[10px] muted">⏳ ينتهي<input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} style={{ marginBottom: 0 }} /></label>
            </div>
            <button className="btn primary" disabled={saving} onClick={add}>{saving ? "⏳…" : "💾 إطلاق الحملة"}</button>
          </section>

          {/* ⚡ عرض الفلاش */}
          <section className="card" style={{ border: "1.5px solid rgba(220,38,38,.25)", background: "rgba(220,38,38,.03)" }}>
            <h2>⚡ عرض الفلاش الخاطف — الرئيسية</h2>
            <p className="muted small" style={{ marginBottom: ".5rem" }}>بانر ناري بعدّاد تنازلي حي في أعلى الصفحة الرئيسية — يختفي تلقائياً عند انتهائه</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input value={flash.title} onChange={(e) => setFlash({ ...flash, title: e.target.value })} placeholder="⚡ عرض العيد — خصم يصل 30%!" maxLength={80} />
              <label className="text-[10px] muted">⏳ ينتهي في<input type="datetime-local" value={flash.endsAt} onChange={(e) => setFlash({ ...flash, endsAt: e.target.value })} style={{ marginBottom: 0 }} /></label>
              <input value={flash.link} onChange={(e) => setFlash({ ...flash, link: e.target.value })} placeholder="الرابط — /offers" dir="ltr" />
              <input value={flash.couponCode} onChange={(e) => setFlash({ ...flash, couponCode: e.target.value.toUpperCase() })} placeholder="كود كوبون يظهر في البانر (اختياري)" dir="ltr" />
            </div>
            <div className="row between" style={{ flexWrap: "wrap", gap: ".5rem" }}>
              <label className="row small" style={{ gap: ".4rem" }}>
                <input type="checkbox" style={{ width: "auto", marginBottom: 0 }} checked={flash.active} onChange={(e) => setFlash({ ...flash, active: e.target.checked })} />
                تفعيل البانر الآن
              </label>
              <button className="btn primary small" disabled={saving} onClick={saveFlash}>💾 حفظ عرض الفلاش</button>
            </div>
          </section>

          {/* القائمة */}
          {loading ? <div className="skeleton h-64 rounded-3xl" /> : (
            <section className="card !p-2">
              {list.map((c) => {
                const st = couponStatus(c);
                return (
                  <div key={c.id} className="p-3 rounded-2xl mb-2" style={{ background: "rgba(127,127,127,.05)" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-black text-base px-3 py-1 rounded-xl" style={{ background: "rgba(108,61,245,.1)", color: "#6C3DF5" }} dir="ltr">{c.code}</code>
                      <span className="font-black text-sm">
                        {c.type === "percent" ? `${c.value}%` : `${c.value.toLocaleString()} ${dsym()}`}
                      </span>
                      <span className={`badge ${st.cls}`}>{st.t}</span>
                      <span className="mr-auto flex gap-1.5">
                        <button className={"btn small " + (c.isActive ? "ghost" : "success")} onClick={() => toggle(c)}>{c.isActive ? "⏸️" : "▶️"}</button>
                        <button className="btn small danger" onClick={() => remove(c)}>🗑️</button>
                      </span>
                    </div>
                    <div className="flex gap-4 mt-2 text-[11px] muted flex-wrap">
                      <span>🎫 {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""} استخدام</span>
                      {c.minTotal > 0 && <span>🛒 حد أدنى {c.minTotal.toLocaleString()}</span>}
                      {c.startsAt && <span>🗓️ {new Date(c.startsAt).toLocaleDateString("ar-YE")}</span>}
                      {c.expiresAt && <span>⏳ حتى {new Date(c.expiresAt).toLocaleDateString("ar-YE")}</span>}
                    </div>
                    {/* 📊 قياس الأداء */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2 text-center">
                      <div className="rounded-xl p-1.5" style={{ background: "rgba(5,150,105,.08)" }}>
                        <div className="text-sm font-black" style={{ color: "#059669" }}>{c.stats.orders}</div>
                        <div className="text-[9px] muted">طلبات</div>
                      </div>
                      <div className="rounded-xl p-1.5" style={{ background: "rgba(220,38,38,.07)" }}>
                        <div className="text-sm font-black" style={{ color: "#dc2626" }}>{c.stats.discountGiven.toLocaleString()}</div>
                        <div className="text-[9px] muted">خصم ممنوح</div>
                      </div>
                      <div className="rounded-xl p-1.5" style={{ background: "rgba(108,61,245,.08)" }}>
                        <div className="text-sm font-black" style={{ color: "#6C3DF5" }}>{c.stats.revenue.toLocaleString()}</div>
                        <div className="text-[9px] muted">مبيعات محققة</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!list.length && <p className="text-center muted py-10">لا حملات بعد — أطلق أول كوبون منصة 🎟️</p>}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
