"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getUser, logout } from "../../lib/api";
import { toast } from "../../components/Toast";
import DashboardPwa from "../../components/DashboardPwa";
import { DashBadge, DashEmpty } from "../../components/dash/DashKit";

const TABS = [
  { key: "all", label: "الكل", icon: "📦" },
  { key: "confirmed", label: "جاهز للاستلام", icon: "🟡" },
  { key: "shipped", label: "في الطريق", icon: "🛵" },
  { key: "delivered", label: "تم التسليم", icon: "✅" },
];

const STATUS_LABEL: Record<string, string> = {
  confirmed: "جاهز للاستلام", processing: "قيد التجهيز",
  shipped: "في الطريق 🛵", delivered: "تم التسليم ✅",
};
const STATUS_TONE: Record<string, "warn" | "info" | "ok"> = {
  confirmed: "warn", processing: "warn", shipped: "info", delivered: "ok",
};

export default function DriverDashboard() {
  const router = useRouter();
  const [driver, setDriver] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async (status = tab) => {
    try {
      const d = await api(`/driver/orders?status=${status}`);
      setOrders(d.orders || []);
      setCounts(d.counts || {});
    } catch { toast("❌ تعذر تحميل الطلبات"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const u = localStorage.getItem("yz_type") === "driver" ? getUser() : null;
    if (!u) { router.replace("/driver/login"); return; }
    setDriver(u);
    load("all");
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api(`/driver/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast(status === "shipped" ? "🛵 انطلقت! الطلب في الطريق" : "✅ تم التسليم — أحسنت!");
      load();
    } catch { toast("❌ تعذر تحديث الحالة"); }
  };

  const totalActive = (counts.confirmed || 0) + (counts.processing || 0) + (counts.shipped || 0);

  // 📍 مشاركة الموقع المباشر — بقرار السائق، تُرسل كل 30 ثانية أثناء الجولة
  const [sharing, setSharing] = useState(false);
  const watchRef = useRef<number | null>(null);
  const lastSent = useRef(0);

  const startSharing = () => {
    if (!("geolocation" in navigator)) return toast("⚠️ متصفحك لا يدعم تحديد الموقع", "error");
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent.current < 30000) return; // إرسال كل 30 ثانية كحد أدنى
        lastSent.current = now;
        api("/driver/location", {
          method: "POST",
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      () => { toast("⚠️ تعذر تحديد موقعك — اسمح بالوصول للموقع", "error"); setSharing(false); },
      { enableHighAccuracy: true },
    );
    setSharing(true);
    toast("📍 موقعك المباشر يُشارك الآن — العميل يراك تقترب منه");
  };

  const stopSharing = async () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setSharing(false);
    await api("/driver/location/stop", { method: "POST" }).catch(() => {});
    toast("⏹️ توقفت مشاركة الموقع");
  };

  useEffect(() => () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); }, []);

  if (!driver) return null;

  return (
    <div className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(135deg, #faf5ff, #f0fdfa)' }}>
      <div className="max-w-2xl mx-auto">
        {/* ترويسة السائق — متدرجة بهوية المنصة */}
        <header className="rounded-3xl p-5 text-white relative overflow-hidden shadow-xl mb-4">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--primary), #14b8a6)' }} />
          <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full bg-white/15 anim-blob" />
          <div className="relative flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="f-xl font-black flex items-center gap-2">🛵 أهلاً {driver.name}</h1>
              <p className="f-xs opacity-85 mt-0.5">{driver.vehicle ? `${driver.vehicle} · ` : ""}{driver.governorate || "كل المحافظات"}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-white/20 backdrop-blur">📦 نشطة: {totalActive}</span>
              <span className="px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-white/20 backdrop-blur">✅ اليوم: {counts.delivered || 0}</span>
              <button onClick={() => logout()}
                className="px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-white/15 border border-white/30 hover:bg-white/25 transition-all">
                خروج
              </button>
            </div>
          </div>
        </header>

        {/* 📱 تطبيق لوحة السائق — طلب يعتمد من الإدارة */}
        <div className="mb-4">
          <DashboardPwa app="driver" />
        </div>

        {/* 📍 التتبع المباشر */}
        <div className="glass rounded-3xl p-3.5 mb-4">
          {sharing ? (
            <button onClick={stopSharing}
              className="w-full py-3.5 rounded-2xl font-extrabold f-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(220,38,38,.1)', color: '#b91c1c', border: '1.5px solid rgba(220,38,38,.25)' }}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 anim-soft-pulse" />
              الموقع المباشر يعمل — اضغط للإيقاف
            </button>
          ) : (
            <button onClick={startSharing}
              className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold f-sm transition-all hover:opacity-95">
              📍 شارك موقعك المباشر أثناء التوصيل
            </button>
          )}
        </div>

        {/* تبويبات الحالة — رقائق النظام الموحد */}
        <nav className="flex gap-2 overflow-x-auto edge-fade pb-2 mb-3">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); load(t.key); }}
              className={`theme-chip shrink-0 flex items-center gap-1.5 ${tab === t.key ? "on" : ""}`}>
              {t.icon} {t.label}
              {t.key !== "all" && counts[t.key] ? (
                <span className={`text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${
                  tab === t.key ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-700'
                }`}>{counts[t.key]}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* قائمة الطلبات */}
        <main>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-36 rounded-3xl" />)}</div>
          ) : orders.length === 0 ? (
            <div className="glass rounded-3xl"><DashEmpty icon="🎉" text="لا توجد طلبات هنا — استرح قليلاً!" /></div>
          ) : (
            orders.map((o) => (
              <article key={o.id} className="glass rounded-3xl p-4 mb-3 card-hover">
                <header className="flex items-center justify-between gap-2 mb-2">
                  <strong className="f-base font-black" dir="ltr">{o.number}</strong>
                  <DashBadge tone={STATUS_TONE[o.status] || "neutral"} label={STATUS_LABEL[o.status] || o.status} />
                </header>
                <div className="f-sm space-y-1.5 text-gray-600">
                  <p className="flex items-center gap-1.5 flex-wrap">🏪 <b>{o.store?.name}</b>
                    <a href={`tel:${o.store?.phone}`} className="font-bold" style={{ color: 'var(--primary)' }}>📞 اتصال بالمتجر</a>
                  </p>
                  <p className="flex items-center gap-1.5 flex-wrap">👤 {o.customerName}
                    <a href={`tel:${o.customerPhone}`} className="font-bold" dir="ltr" style={{ color: 'var(--primary)' }}>📞 {o.customerPhone}</a>
                  </p>
                  {o.address && <p>📍 {o.address}</p>}
                  {o.customerLat && o.customerLng && (
                    <a target="_blank" href={`https://maps.google.com/?q=${o.customerLat},${o.customerLng}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all hover:opacity-85"
                      style={{ background: 'rgba(2,132,199,.1)', color: '#0369a1', border: '1px solid rgba(2,132,199,.2)' }}>
                      🗺️ موقع العميل على الخريطة
                    </a>
                  )}
                  <p>🧾 {o.items?.length || 0} صنف — الإجمالي: <strong className="grad-text">{o.total} {o.currency}</strong>{o.paymentMethod === "cash" ? " (تحصيل نقدي 💵)" : ""}</p>
                  {o.notes && <p className="text-gray-400 f-xs">📝 {o.notes}</p>}
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(o.status === "confirmed" || o.status === "processing") && (
                    <button onClick={() => updateStatus(o.id, "shipped")}
                      className="btn-primary flex-1 py-3 rounded-2xl text-white font-extrabold f-sm transition-all hover:opacity-95">
                      🛵 استلمت — في الطريق
                    </button>
                  )}
                  {o.status === "shipped" && (
                    <button onClick={() => updateStatus(o.id, "delivered")}
                      className="flex-1 py-3 rounded-2xl text-white font-extrabold f-sm transition-all hover:opacity-95"
                      style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 8px 20px -8px rgba(5,150,105,.5)' }}>
                      ✅ تم التسليم
                    </button>
                  )}
                  <a target="_blank" href={`https://wa.me/${o.customerPhone?.replace(/\D/g, "")}?text=${encodeURIComponent(`مرحباً، أنا سائق يمن زون 🛵 طلبك ${o.number} قادم إليك`)}`}
                    className="px-4 py-3 rounded-2xl font-extrabold f-sm flex items-center transition-all hover:opacity-85"
                    style={{ background: 'rgba(22,163,74,.1)', color: '#15803d', border: '1px solid rgba(22,163,74,.2)' }}>
                    💬 واتساب العميل
                  </a>
                </div>
              </article>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
