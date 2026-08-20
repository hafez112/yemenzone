"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "../../components/Toast";
import CaptchaBox from "../../components/CaptchaBox";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ═══ مراحل الطلب بالترتيب — تُعرض كمسار زمني ═══
const FLOW = [
  { key: "pending",    icon: "🕐", label: "قيد المراجعة",  desc: "استلم المتجر طلبك وبانتظار التأكيد" },
  { key: "confirmed",  icon: "✅", label: "تم التأكيد",    desc: "المتجر أكد طلبك وسيبدأ تجهيزه" },
  { key: "processing", icon: "📦", label: "قيد التجهيز",   desc: "طلبك يُجهَّز الآن بعناية" },
  { key: "shipped",    icon: "🚚", label: "في الطريق إليك", desc: "خرج طلبك مع مندوب التوصيل" },
  { key: "delivered",  icon: "📍", label: "تم التوصيل",    desc: "وصل طلبك — بانتظار الإقفال" },
  { key: "completed",  icon: "🎉", label: "مكتمل",         desc: "اكتمل طلبك — شكراً لتسوقك" },
];

const payAr = (m?: string) =>
  !m || m === "cash" ? "💵 الدفع عند الاستلام" :
  m.startsWith("gateway:") ? "🏦 تحويل — " + m.slice(8) : "💳 " + m;

function TrackPage() {
  const params = useSearchParams();
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function doTrack(n?: string, p?: string) {
    const num = (n ?? number).trim().toUpperCase();
    const ph = (p ?? phone).trim();
    if (!num || !ph) return toast("⚠️ أدخل رقم الطلب ورقم الجوال", "error");
    setLoading(true); setNotFound(false);
    try {
      const res = await fetch(`${API}/api/v1/orders/track?number=${encodeURIComponent(num)}&phone=${encodeURIComponent(ph)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "تعذر التتبع");
      setOrder(data);
    } catch (e: any) {
      setOrder(null); setNotFound(true);
      toast(e.message, "error");
    }
    setLoading(false);
  }

  // تعبئة وتتبع تلقائي عند القدوم برابط جاهز (من شاشة نجاح الطلب)
  useEffect(() => {
    const n = params.get("number");
    const p = params.get("phone");
    if (n) setNumber(n.toUpperCase());
    if (p) setPhone(p);
    if (n && p) doTrack(n, p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = order ? Math.max(0, FLOW.findIndex((f) => f.key === order.status)) : 0;
  const money = (v: any) => Number(v).toLocaleString("en");
  const currency = order?.currency === "YER" ? "ر.ي" : order?.currency || "ر.ي";

  return (
    <div className="page">
      <div className="max-w-xl mx-auto">
        {/* ═══ الترويسة ═══ */}
        <div className="rounded-3xl overflow-hidden shadow-xl mb-4">
          <div className="p-6 text-white text-center" style={{ background: "linear-gradient(135deg, var(--primary), #9333ea 60%, #db2777)" }}>
            <div className="text-5xl mb-2 anim-float">🔍</div>
            <h1 className="font-black text-2xl mb-1">تتبع طلبك</h1>
            <p className="text-sm opacity-90">أدخل رقم الطلب ورقم جوالك لمعرفة حالته لحظة بلحظة</p>
          </div>
        </div>

        {/* ═══ نموذج التتبع ═══ */}
        <div className="card mb-4">
          <div className="relative mb-2">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🧾</span>
            <input className="input pr-10 font-black tracking-wider" dir="ltr" placeholder="ORD-XXXXXX"
              value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} />
          </div>
          <div className="relative mb-3">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">📱</span>
            <input className="input pr-10" dir="ltr" placeholder="77XXXXXXX" inputMode="tel"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button className="w-full py-4 rounded-2xl text-white font-black text-lg shadow-xl transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--primary), #9333ea)" }}
            onClick={() => doTrack()} disabled={loading}>
            {loading ? "⏳ جارٍ البحث…" : "🔍 تتبع الطلب"}
          </button>
          <p className="text-center text-[11px] text-gray-400 mt-2">💡 رقم الطلب يصلك عند إتمام الشراء بصيغة ORD-XXXXXX</p>
        </div>

        {/* ═══ لم يُعثر ═══ */}
        {notFound && !loading && (
          <div className="card text-center py-8 mb-4">
            <div className="text-5xl mb-3">🔎</div>
            <b className="block mb-1">لم نعثر على الطلب</b>
            <p className="text-sm text-gray-400">تأكد من رقم الطلب كاملاً، وأن الجوال هو نفسه المستخدم عند الشراء</p>
          </div>
        )}

        {/* ═══ نتيجة التتبع ═══ */}
        {order && (
          <div className="space-y-3">
            {/* ملخص سريع */}
            <div className="card">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[11px] text-gray-400">رقم الطلب</div>
                  <b className="text-lg text-purple-700" dir="ltr">{order.number}</b>
                </div>
                <div className="text-left">
                  <div className="text-[11px] text-gray-400">الإجمالي</div>
                  <b className="text-lg" style={{ color: "var(--primary)" }}>{money(order.total)} {currency}</b>
                </div>
              </div>
              <div className="text-[11px] text-gray-400 mt-2">
                🗓️ {new Date(order.createdAt).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                {" · "}⏱️ آخر تحديث: {new Date(order.updatedAt).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })}
              </div>
            </div>

            {/* حالات خاصة */}
            {order.status === "cancelled" && (
              <div className="card text-center" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                <div className="text-4xl mb-2">❌</div>
                <b className="text-red-700">هذا الطلب ملغي</b>
                <p className="text-xs text-red-500 mt-1">تواصل مع المتجر إن كان الإلغاء بغير علمك</p>
              </div>
            )}
            {order.status === "refunded" && (
              <div className="card text-center" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                <div className="text-4xl mb-2">↩️</div>
                <b className="text-amber-700">تم استرجاع هذا الطلب</b>
              </div>
            )}

            {/* 📍 تتبع السائق المباشر — يظهر أثناء الطلب النشط عند مشاركة السائق لموقعه */}
            {order.driverLive && (
              <div className="card" style={{ background: "linear-gradient(135deg, #ecfeff, #f0f9ff)", border: "1px solid #bae6fd" }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl anim-soft-pulse">🛵</span>
                  <div className="flex-1 min-w-0">
                    <b className="text-sm">سائقك {order.driverLive.name} في الطريق إليك الآن</b>
                    {order.driverLive.vehicle && <div className="text-[11px] text-gray-500">{order.driverLive.vehicle}</div>}
                    <div className="text-[11px] font-bold mt-0.5" style={{ color: "#0284c7" }}>
                      📍 آخر تحديث {new Date(order.driverLive.updatedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                      {order.driverLive.distanceKm != null && ` · يبعد عنك ~${order.driverLive.distanceKm} كم`}
                    </div>
                  </div>
                  <a href={order.driverLive.mapsUrl} target="_blank"
                    className="text-xs font-extrabold text-white px-3 py-2 rounded-xl shrink-0"
                    style={{ background: "#0284c7" }}>
                    🗺️ الخريطة
                  </a>
                </div>
              </div>
            )}

            {/* المسار الزمني */}
            {order.status !== "cancelled" && order.status !== "refunded" && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black">🧭 مسار الطلب</h3>
                  <button onClick={() => doTrack()} className="text-xs font-extrabold text-purple-600 hover:opacity-70">🔄 تحديث الحالة</button>
                </div>
                {FLOW.map((s, i) => {
                  const doneStep = i <= idx;
                  const isCurrent = i === idx;
                  return (
                    <div key={s.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={"w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 transition-all " +
                          (isCurrent ? "text-white anim-pulse-glow shadow-lg" : doneStep ? "text-white" : "bg-gray-100 text-gray-300")}
                          style={doneStep ? { background: isCurrent ? "linear-gradient(135deg, var(--primary), #9333ea)" : "#10b981" } : {}}>
                          {isCurrent ? s.icon : doneStep ? "✓" : s.icon}
                        </div>
                        {i < FLOW.length - 1 && (
                          <div className={"w-0.5 flex-1 min-h-[18px] rounded my-1 " + (i < idx ? "bg-emerald-400" : "bg-gray-100")} />
                        )}
                      </div>
                      <div className="pb-5 pt-1.5">
                        <div className={"font-extrabold text-sm " + (doneStep ? "" : "text-gray-300")}>{s.label}</div>
                        {doneStep && <div className="text-[11px] text-gray-400">{s.desc}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* تفاصيل الطلب */}
            <div className="card">
              <h3 className="font-black mb-3">🧾 تفاصيل الطلب</h3>
              <div className="space-y-2 mb-3">
                {order.items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between items-center text-sm bg-gray-50 rounded-xl px-3 py-2">
                    <span className="font-bold">{it.name} <span className="text-gray-400 text-xs">× {it.qty}</span></span>
                    <b>{money(Number(it.price) * it.qty)} {currency}</b>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 space-y-1 text-sm">
                <div className="flex justify-between text-gray-400 text-xs"><span>المجموع</span><span>{money(order.subtotal)} {currency}</span></div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600 text-xs font-bold"><span>🎟️ الخصم</span><span>-{money(order.discount)} {currency}</span></div>
                )}
                {Number(order.deliveryFee) > 0 && (
                  <div className="flex justify-between text-gray-400 text-xs"><span>🚚 التوصيل</span><span>+{money(order.deliveryFee)} {currency}</span></div>
                )}
                <div className="flex justify-between font-black text-base pt-1"><span>الإجمالي</span><span style={{ color: "var(--primary)" }}>{money(order.total)} {currency}</span></div>
              </div>
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div>{payAr(order.paymentMethod)}</div>
                {order.address && <div>📍 {order.address}</div>}
              </div>
            </div>

            {/* ⭐ تقييم ما بعد الشراء — مرتبط بالطلب ومختوم بشارة مشترٍ موثّق */}
            {order.canReview && (
              <ReviewCard order={order} phone={phone}
                onDone={(rv: any) => setOrder({ ...order, canReview: false, review: rv })} />
            )}
            {order.review && (
              <div className="card text-center" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                <b className="text-amber-700 text-sm">⭐ تقييمك الموثّق لهذا الطلب</b>
                <div className="text-amber-400 text-xl mt-1">{"★".repeat(order.review.rating)}{"☆".repeat(5 - order.review.rating)}</div>
                {order.review.comment && <p className="text-xs text-gray-500 mt-1">{order.review.comment}</p>}
                <span className="inline-block mt-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✅ مشترٍ موثّق — يظهر في صفحة المتجر</span>
              </div>
            )}

            {/* ↩️ الاسترجاع — متاح بعد الاستلام وفق سياسة المنصة */}
            {(order.returns?.length > 0 || ["delivered", "completed"].includes(order.status)) && (
              <ReturnCard order={order} phone={phone}
                onDone={(r: any) => setOrder({ ...order, returns: [r, ...(order.returns || [])] })} />
            )}

            {/* المتجر + واتساب */}
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0" style={{ background: "linear-gradient(135deg, #ede9fe, #ccfbf1)" }}>🏪</div>
                <div className="flex-1 min-w-0">
                  <b className="block truncate">{order.store?.name}</b>
                  <Link href={"/store/" + order.store?.slug} className="text-[11px] text-purple-600 font-bold hover:underline">زيارة المتجر ←</Link>
                </div>
              </div>
              {order.store?.whatsapp && (
                <a href={`https://wa.me/${String(order.store.whatsapp).replace(/[^0-9]/g, "")}?text=${encodeURIComponent("مرحباً، أستفسر عن طلبي رقم " + order.number)}`}
                  target="_blank"
                  className="mt-3 flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-lg transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                  💬 تواصل مع المتجر بخصوص طلبك
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPageWrapper() {
  return (
    <Suspense fallback={<div className="page"><div className="card text-center py-10">⏳ جارٍ التحميل…</div></div>}>
      <TrackPage />
    </Suspense>
  );
}

// ↩️ بطاقة طلب الاسترجاع — بعد الاستلام، بوصف السبب، وتصل حالتها هنا فور مراجعة البائع
function ReturnCard({ order, phone, onDone }: any) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [captcha, setCaptcha] = useState({ id: "", answer: "" });
  const [capKey, setCapKey] = useState(0);
  const latest = order.returns?.[0];

  async function submit() {
    if (reason.trim().length < 10) return toast("✍️ اكتب سبب الاسترجاع بتفصيل (10 أحرف على الأقل)", "error");
    setSending(true);
    try {
      const res = await fetch(`${API}/api/v1/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: order.number, phone: phone.trim(), reason: reason.trim(), captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل إرسال الطلب");
      toast(data.message || "✅ وصل طلبك للبائع");
      onDone({ id: data.id, reason: reason.trim(), status: "pending", sellerNote: null, createdAt: new Date().toISOString() });
      setOpen(false);
    } catch (e: any) { toast(e.message, "error"); setCapKey(k => k + 1); }
    setSending(false);
  }

  // حالة طلب قائم
  if (latest) {
    const st = latest.status === "accepted"
      ? { bg: "#f0fdf4", bd: "#bbf7d0", icon: "✅", title: "قُبل طلب الاسترجاع", cls: "text-emerald-700" }
      : latest.status === "rejected"
      ? { bg: "#fef2f2", bd: "#fecaca", icon: "❌", title: "رُفض طلب الاسترجاع", cls: "text-red-700" }
      : { bg: "#fffbeb", bd: "#fde68a", icon: "⏳", title: "طلب الاسترجاع قيد مراجعة البائع", cls: "text-amber-700" };
    return (
      <div className="card" style={{ background: st.bg, border: "1px solid " + st.bd }}>
        <b className={st.cls + " text-sm"}>{st.icon} {st.title}</b>
        <p className="text-[11px] text-gray-500 mt-1">سببك: {latest.reason}</p>
        {latest.sellerNote && <p className="text-xs font-bold text-gray-600 mt-2 bg-white/70 rounded-xl p-2">💬 رد البائع: {latest.sellerNote}</p>}
        {latest.status === "accepted" && (
          <p className="text-[11px] font-bold text-emerald-600 mt-2">
            {latest.refundedAmount
              ? `💸 أُعيد ${Number(latest.refundedAmount).toLocaleString()} ر.ي إلى بطاقتك — رتّب مع البائع تسليم المنتج`
              : "📦 رتّب مع البائع تسليم المنتج ليُعاد مبلغك"}
          </p>
        )}
      </div>
    );
  }

  // نموذج طلب جديد
  return (
    <div className="card" style={{ background: "linear-gradient(135deg, #f5f3ff, #ecfeff)", border: "1px solid #ddd6fe" }}>
      <h3 className="font-black text-center mb-1">↩️ غير راضٍ عن المنتج؟</h3>
      <p className="text-[11px] text-gray-500 text-center mb-3">
        يمكنك طلب استرجاع خلال 7 أيام من الاستلام وفق <Link href="/returns" className="text-purple-600 font-bold underline">شروط الاسترجاع</Link>
      </p>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="w-full py-3.5 rounded-2xl text-white font-extrabold shadow-lg transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
          ↩️ تقديم طلب استرجاع
        </button>
      ) : (
        <>
          <textarea className="input w-full mb-2 bg-white" rows={3}
            placeholder="اشرح سبب الاسترجاع بوضوح: ماذا حدث؟ هل المنتج تالف/مختلف/ناقص؟ *"
            value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mb-2"><CaptchaBox key={capKey} scope="return" onChange={(id, answer) => setCaptcha({ id, answer })} /></div>
          <button onClick={submit} disabled={sending}
            className="w-full py-3.5 rounded-2xl text-white font-extrabold shadow-lg disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
            {sending ? "⏳ جارٍ الإرسال…" : "📨 إرسال طلب الاسترجاع للبائع"}
          </button>
          <button onClick={() => setOpen(false)} className="w-full text-xs text-gray-400 font-bold mt-2">إلغاء</button>
        </>
      )}
    </div>
  );
}

// ⭐ بطاقة تقييم ما بعد الشراء — تُرسل مرتبطة برقم الطلب فتحمل شارة التوثيق
function ReviewCard({ order, phone, onDone }: any) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    try {
      const res = await fetch(`${API}/api/v1/reviews/${order.store.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: order.customerName, phone: phone.trim(),
          rating, comment: comment.trim(), orderNumber: order.number,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل إرسال التقييم");
      toast("🌟 شكراً! تقييمك يظهر الآن بشارة مشترٍ موثّق ✅");
      onDone({ rating, comment: comment.trim() });
    } catch (e: any) { toast(e.message, "error"); }
    setSending(false);
  }

  return (
    <div className="card" style={{ background: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: "1px solid #fde68a" }}>
      <h3 className="font-black text-center mb-1">⭐ قيّم تجربتك مع {order.store?.name}</h3>
      <p className="text-[11px] text-gray-500 text-center mb-3">
        تقييمك مرتبط بطلبك <b dir="ltr">{order.number}</b> وسيحمل شارة «مشترٍ موثّق ✅»
      </p>
      <div className="flex justify-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}
            className="text-4xl transition-transform hover:scale-125"
            style={{ opacity: n <= rating ? 1 : 0.25 }}>⭐</button>
        ))}
      </div>
      <textarea className="input w-full mb-2 bg-white" rows={2}
        placeholder="حدّثنا عن تجربتك (اختياري)"
        value={comment} onChange={(e) => setComment(e.target.value)} />
      <button onClick={submit} disabled={sending}
        className="w-full py-3.5 rounded-2xl text-white font-extrabold shadow-lg disabled:opacity-40 transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
        {sending ? "⏳ جارٍ الإرسال…" : "🌟 إرسال التقييم الموثّق"}
      </button>
    </div>
  );
}
