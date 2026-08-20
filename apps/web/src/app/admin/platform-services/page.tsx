"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { api, imgUrl } from "../../../lib/api";
import { toast } from "../../../components/Toast";
import RichTextEditor from "../../../components/RichTextEditor";
import ImageUpload from "../../../components/ImageUpload";
import VideoInput from "../../../components/VideoInput";

const EMPTY = { id: null as string | null, title: "", description: "", price: "", image: "", videoUrl: "", sort: 0 };

// معاينة نصية للوصف الغني في القوائم
const stripHtml = (html?: string) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export default function AdminPlatformServicesPage() {
  const [tab, setTab] = useState<"services" | "orders">("services");
  const [services, setServices] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  const loadServices = () => api("/admin/platform-services").then(setServices).catch((e) => toast(e.message, "error"));
  const loadOrders = () => api("/admin/platform-services/orders").then(setOrdersData).catch((e) => toast(e.message, "error"));
  useEffect(() => { loadServices(); loadOrders(); }, []);

  const save = async () => {
    if (!form.title.trim()) return toast("⚠️ اسم الخدمة مطلوب", "error");
    if (!form.id && !(+form.price >= 0)) return toast("⚠️ السعر مطلوب", "error");
    try {
      await api("/admin/platform-services", { method: "POST", body: JSON.stringify(form) });
      toast(form.id ? "✅ حُدّثت الخدمة" : "✅ أُضيفت الخدمة");
      setForm(EMPTY); setEditing(false); loadServices();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const toggle = async (s: any) => {
    try { await api("/admin/platform-services", { method: "POST", body: JSON.stringify({ id: s.id, isActive: !s.isActive }) }); toast(s.isActive ? "⏸️ عُطّلت الخدمة" : "▶️ فُعّلت الخدمة"); loadServices(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const remove = async (s: any) => {
    if (!confirm("حذف \"" + s.title + "\"؟ (إن عليها طلبات ستُعطّل فقط)")) return;
    try {
      const r = await api("/admin/platform-services/" + s.id, { method: "DELETE" });
      toast(r.disabled ? "⏸️ عليها طلبات — عُطّلت بدل الحذف" : "🗑️ حُذفت الخدمة");
      loadServices();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const review = async (o: any, approve: boolean) => {
    if (!approve && !confirm("رفض طلب " + o.name + "؟")) return;
    try {
      await api("/admin/platform-services/orders/" + o.id + "/review", { method: "POST", body: JSON.stringify({ approve }) });
      toast(approve ? "✅ اعتُمد الطلب وسُجّل الإيراد" : "❌ رُفض الطلب");
      loadOrders();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const STATUS: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: "⏳ بانتظار المراجعة", bg: "#fef3c7", color: "#92400e" },
    approved: { label: "✅ معتمد", bg: "#d1fae5", color: "#065f46" },
    rejected: { label: "❌ مرفوض", bg: "#fee2e2", color: "#991b1b" },
  };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🧩 خدمات المنصة</h1>
          <p className="text-sm text-gray-500 mb-4">خدمات مدفوعة تقدمها المنصة للتجار (تصميم/تصوير/حملات…)</p>

          <div className="tabs">
            {([["services", "🧩 الخدمات"], ["orders", "📥 الطلبات"]] as const).map(([k, l]) => (
              <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k as any)}>
                {l}{k === "orders" && ordersData?.orders?.filter((o: any) => o.status === "pending").length ? " (" + ordersData.orders.filter((o: any) => o.status === "pending").length + ")" : ""}
              </button>
            ))}
          </div>

          {tab === "services" && (
            <div>
              <div className="card mb-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-black">الخدمات ({services.filter((s) => s.isActive).length} نشطة)</h3>
                  <button className="btn" onClick={() => { setForm(EMPTY); setEditing(true); }}>➕ خدمة جديدة</button>
                </div>
                {editing && (
                  <div className="p-3 rounded-2xl bg-gray-50 mt-3">
                    <div className="grid md:grid-cols-2 gap-2 mb-2">
                      <input className="input" placeholder="اسم الخدمة * (مثال: 🎨 تصميم شعار)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input" type="number" placeholder="السعر (ريال) *" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                        <input className="input" type="number" placeholder="الترتيب" value={form.sort} onChange={(e) => setForm({ ...form, sort: +e.target.value })} />
                      </div>
                    </div>

                    <label className="text-xs font-extrabold text-gray-500 block mb-1">📝 وصف الخدمة (محرر حديث — عناوين، قوائم، روابط…)</label>
                    <RichTextEditor value={form.description} onChange={(html) => setForm({ ...form, description: html })}
                      placeholder="اكتب وصفاً جذاباً للخدمة: ماذا تشمل؟ لمن هي؟ ماذا يستلم العميل؟" />

                    <div className="grid md:grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-xs font-extrabold text-gray-500 block mb-1">🖼️ صورة الخدمة</label>
                        <ImageUpload endpoint="/admin/platform-services/upload-image" value={form.image}
                          onChange={(url) => setForm({ ...form, image: url })} label="📷 رفع صورة من الجهاز" hint="تُضغط تلقائياً WebP" />
                      </div>
                      <VideoInput endpoint="/admin/platform-services/upload-video" value={form.videoUrl}
                        onChange={(url) => setForm({ ...form, videoUrl: url })} />
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button className="btn flex-1" onClick={save}>💾 حفظ</button>
                      <button className="btn btn-danger" onClick={() => { setEditing(false); setForm(EMPTY); }}>إلغاء</button>
                    </div>
                  </div>
                )}
              </div>
              {services.map((s) => (
                <div key={s.id} className="assign-row card mb-2">
                  {s.image && <img src={imgUrl(s.image)} alt="" className="w-14 h-14 rounded-xl object-cover border shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <b>{s.title}</b>
                    <span className="badge mr-1" style={{ background: "#eef2ff", color: "#3730a3" }}>{Number(s.price).toLocaleString("en")} {s.currency}</span>
                    <span className="badge mr-1" style={{ background: "#f3f4f6", color: "#6b7280" }}>📥 {s._count?.orders || 0} طلب</span>
                    {s.videoUrl && <span className="badge mr-1" style={{ background: "#fdf2f8", color: "#be185d" }}>🎬 فيديو</span>}
                    {(s.views > 0) && <span className="badge mr-1" style={{ background: "#ecfeff", color: "#0e7490" }}>👁️ {s.views}</span>}
                    {!s.isActive && <span className="badge mr-1" style={{ background: "#fee2e2", color: "#991b1b" }}>معطلة</span>}
                    <div className="text-xs text-gray-400">{stripHtml(s.description).slice(0, 90)}</div>
                  </div>
                  <a className="btn ghost" href={"/services/" + s.id} target="_blank">👁️</a>
                  <button className="btn" onClick={() => { setForm({ id: s.id, title: s.title, description: s.description || "", price: String(Number(s.price)), image: s.image || "", videoUrl: s.videoUrl || "", sort: s.sort }); setEditing(true); window.scrollTo(0, 0); }}>✏️</button>
                  <button className="btn" onClick={() => toggle(s)}>{s.isActive ? "⏸️" : "▶️"}</button>
                  <button className="btn btn-danger" onClick={() => remove(s)}>🗑️</button>
                </div>
              ))}
            </div>
          )}

          {tab === "orders" && ordersData && (
            <div>
              {ordersData.insights.length > 0 && (
                <div className="ai-card mb-3">
                  <h3 className="font-black mb-2">🤖 تحليل الطلبات</h3>
                  {ordersData.insights.map((t: string, i: number) => <div key={i} className="text-sm mb-1">• {t}</div>)}
                </div>
              )}
              {ordersData.orders.map((o: any) => {
                const st = STATUS[o.status];
                return (
                  <div key={o.id} className="card mb-2">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <b>{o.service?.title}</b>
                        <span className="badge mr-1" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        <div className="text-sm text-gray-600 mt-1">👤 {o.name} · 📱 <a href={"tel:" + o.phone} className="underline">{o.phone}</a></div>
                        {o.details && <div className="text-xs text-gray-500 mt-1">📝 {o.details}</div>}
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(o.createdAt).toLocaleString("ar-YE")} · 💰 {Number(o.service?.price).toLocaleString("en")} {o.service?.currency}
                          {o.pointsUsed > 0 && (
                            <span className="badge mr-1" style={{ background: "#f3e8ff", color: "#7e22ce" }}>
                              🎁 خصم {Number(o.discount).toLocaleString("en")} ({o.pointsUsed} نقطة) — المستحق {Number(o.finalAmount ?? o.service?.price).toLocaleString("en")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {o.proofImage && <img src={o.proofImage} alt="إثبات" className="w-14 h-14 rounded-xl object-cover cursor-pointer border" onClick={() => setZoom(o.proofImage)} />}
                        {o.status === "pending" && (
                          <>
                            <button className="btn" onClick={() => review(o, true)}>✅ اعتماد</button>
                            <button className="btn btn-danger" onClick={() => review(o, false)}>❌ رفض</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {ordersData.orders.length === 0 && <div className="card text-center py-8 text-gray-400">لا طلبات بعد</div>}
            </div>
          )}

          {zoom && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
              <img src={zoom} alt="إثبات" className="max-w-full max-h-full rounded-2xl" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
