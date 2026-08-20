"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { imgUrl } from "../../lib/api";
import { toast } from "../../components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const stripHtml = (html?: string) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function PlatformServicesPage() {
  const params = useSearchParams();
  const [services, setServices] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", details: "" });
  const [gatewayId, setGatewayId] = useState("");
  const [proof, setProof] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  // 🎁 خصم النقاط
  const [pointsInfo, setPointsInfo] = useState<any>(null);
  const [usePoints, setUsePoints] = useState(false);

  // جلب رصيد النقاط عند إدخال رقم جوال مكتمل
  useEffect(() => {
    const phone = form.phone.trim();
    if (phone.length < 7) { setPointsInfo(null); setUsePoints(false); return; }
    const t = setTimeout(() => {
      fetch(`${API}/api/v1/platform/points-balance?phone=${encodeURIComponent(phone)}`)
        .then((r) => r.json())
        .then((d) => { setPointsInfo(d); if (!d.points) setUsePoints(false); })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [form.phone]);

  // حساب الخصم المتوقع من النقاط (نفس منطق الخادم)
  const price = selected ? Number(selected.price) : 0;
  const pointsDiscount = (usePoints && pointsInfo?.points > 0 && pointsInfo?.active && pointsInfo?.pointValueYER > 0)
    ? Math.min(Math.floor(price * (pointsInfo.maxDiscountPct / 100)), pointsInfo.points * pointsInfo.pointValueYER)
    : 0;
  const finalPrice = Math.max(0, price - pointsDiscount);

  useEffect(() => {
    fetch(API + "/api/v1/platform/services").then((r) => r.json()).then((d) => { setServices(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    fetch(API + "/api/v1/payments/gateways?scope=orders").then((r) => r.json()).then((d) => setGateways(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // اختيار مسبق عند القدوم من صفحة عرض الخدمة /services/[id] → /services?order=<id>
  useEffect(() => {
    const oid = params.get("order");
    if (!oid || !services.length || selected) return;
    const s = services.find((x) => x.id === oid);
    if (s) { setSelected(s); window.scrollTo(0, 0); }
  }, [params, services, selected]);

  const uploadProof = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(API + "/api/v1/payments/upload-proof", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل الرفع");
      setProof(data.url);
      toast("✅ رُفع الإثبات");
    } catch (e: any) { toast(e.message, "error"); }
    setUploading(false);
  };

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast("⚠️ الاسم والجوال مطلوبان", "error");
    if (!proof) return toast("⚠️ ارفع إثبات التحويل أولاً", "error");
    try {
      const res = await fetch(API + "/api/v1/platform/services/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: selected.id, ...form, proofImage: proof, usePoints: usePoints && pointsDiscount > 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل الإرسال");
      setDone(true);
      toast("🎉 استلمنا طلبك — سنراجع الدفع ونتواصل معك");
    } catch (e: any) { toast(e.message, "error"); }
  };

  if (loading) return <div className="page"><div className="card text-center py-10">⏳ جارٍ التحميل…</div></div>;

  return (
    <div className="page">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black mb-2">🧩 خدمات يمن زون</h1>
          <p className="text-gray-500">خدمات احترافية من فريق المنصة لتطوير تجارتك</p>
        </div>

        {!selected && (
          <div className="grid md:grid-cols-2 gap-3">
            {services.map((s) => (
              <div key={s.id} className="plan-card">
                <Link href={"/services/" + s.id} className="block relative">
                  {s.image ? (
                    <img src={imgUrl(s.image)} alt="" loading="lazy" decoding="async" className="w-full h-32 object-cover rounded-2xl mb-3" />
                  ) : (
                    <div className="w-full h-32 rounded-2xl mb-3 skeleton flex items-center justify-center text-5xl">🧩</div>
                  )}
                  {s.videoUrl && <span className="absolute top-2 right-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black/60 text-white">🎬 فيديو</span>}
                </Link>
                <h3 className="font-black text-lg mb-1">
                  <Link href={"/services/" + s.id} className="hover:underline">{s.title}</Link>
                </h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{stripHtml(s.description).slice(0, 110)}</p>
                <div className="flex justify-between items-center">
                  <b className="text-xl" style={{ color: "var(--primary)" }}>{Number(s.price).toLocaleString("en")} <span className="text-xs">{s.currency}</span></b>
                  <div className="flex gap-1.5">
                    <Link href={"/services/" + s.id} className="btn ghost small">التفاصيل</Link>
                    <button className="btn small" onClick={() => { setSelected(s); setDone(false); setProof(""); }}>اطلبها 🚀</button>
                  </div>
                </div>
              </div>
            ))}
            {services.length === 0 && <div className="card text-center py-10 text-gray-400 md:col-span-2">لا خدمات متاحة حالياً — تابعنا قريباً</div>}
          </div>
        )}

        {selected && !done && (
          <div className="max-w-xl mx-auto">
            {/* ═══ ترويسة الطلب المتدرجة ═══ */}
            <div className="rounded-3xl overflow-hidden shadow-xl mb-4">
              <div className="p-5 text-white relative" style={{ background: "linear-gradient(135deg, var(--primary), #9333ea 60%, #db2777)" }}>
                <button className="absolute top-3 left-3 text-xs font-bold bg-white/20 backdrop-blur px-3 py-1.5 rounded-full hover:bg-white/30 transition"
                  onClick={() => setSelected(null)}>← كل الخدمات</button>
                <div className="text-4xl mb-2">🧩</div>
                <h2 className="font-black text-xl mb-1">{selected.title}</h2>
                <p className="text-xs opacity-90 leading-relaxed">{stripHtml(selected.description).slice(0, 120)}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="bg-white/25 backdrop-blur font-black px-4 py-1.5 rounded-full text-lg">
                    {finalPrice.toLocaleString('en')} {selected.currency}
                  </span>
                  {pointsDiscount > 0 && <span className="text-sm line-through opacity-70">{price.toLocaleString('en')}</span>}
                  <Link href={"/services/" + selected.id} className="text-[11px] underline opacity-90 mr-auto">التفاصيل الكاملة{selected.videoUrl ? " والفيديو" : ""} ←</Link>
                </div>
              </div>
              {/* مؤشر الخطوات */}
              <div className="bg-white p-4 flex items-center">
                {[
                  { n: "١", label: "بياناتك", ok: !!(form.name.trim() && form.phone.trim()) },
                  { n: "٢", label: "طريقة الدفع", ok: !!gatewayId },
                  { n: "٣", label: "إثبات التحويل", ok: !!proof },
                ].map((s, i, arr) => (
                  <div key={s.n} className={"flex items-center" + (i < arr.length - 1 ? " flex-1" : "")}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={"w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all " + (s.ok ? "text-white" : "bg-gray-100 text-gray-400")}
                        style={s.ok ? { background: "linear-gradient(135deg, var(--primary), #9333ea)" } : {}}>
                        {s.ok ? "✓" : s.n}
                      </div>
                      <span className={"text-[10px] font-bold whitespace-nowrap " + (s.ok ? "" : "text-gray-400")}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && <div className={"flex-1 h-0.5 mx-2 rounded mb-4 " + (s.ok ? "" : "bg-gray-100")} style={s.ok ? { background: "var(--primary)" } : {}} />}
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ الخطوة ١: بيانات التواصل ═══ */}
            <div className="card mb-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, var(--primary), #9333ea)" }}>١</span>
                <h3 className="font-black">بيانات التواصل</h3>
              </div>
              <div className="relative mb-2">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">👤</span>
                <input className="input pr-10" placeholder="اسمك الكامل *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="relative mb-2">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">📱</span>
                <input className="input pr-10" placeholder="رقم الجوال *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="relative">
                <span className="absolute right-3 top-3 text-gray-400 pointer-events-none">📝</span>
                <textarea className="input w-full pr-10" rows={3} placeholder="تفاصيل إضافية (رابط متجرك، ملاحظات…)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
              </div>
            </div>

            {/* 🎁 خصم النقاط — يظهر فقط لمن لديه رصيد */}
            {pointsInfo?.active && pointsInfo?.points > 0 && pointsInfo?.pointValueYER > 0 && (
              <label className={`flex items-center gap-3 rounded-2xl p-3 mb-3 cursor-pointer transition-all border-2 ${usePoints ? 'border-purple-400 bg-purple-50' : 'border-transparent bg-gray-50'}`}>
                <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)}
                  className="w-5 h-5 accent-purple-600" />
                <div className="flex-1">
                  <b className="text-sm">🎁 استخدم نقاطي ({pointsInfo.points.toLocaleString('en')} نقطة)</b>
                  <div className="text-[11px] text-gray-500">
                    خصم يصل {pointsInfo.maxDiscountPct}% من السعر
                    {usePoints && pointsDiscount > 0 && (
                      <b className="text-purple-700"> — وفّرت {pointsDiscount.toLocaleString('en')} {selected.currency}!</b>
                    )}
                  </div>
                </div>
              </label>
            )}

            {/* ═══ الخطوة ٢: طريقة الدفع ═══ */}
            <div className="card mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, var(--primary), #9333ea)" }}>٢</span>
                <h3 className="font-black">طريقة الدفع</h3>
                <span className="mr-auto text-sm font-black" style={{ color: "var(--primary)" }}>
                  {finalPrice.toLocaleString('en')} {selected.currency}
                  {pointsDiscount > 0 && <span className="text-[11px] text-gray-400 line-through font-normal mr-1">{price.toLocaleString('en')}</span>}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">حوّل المبلغ إلى الحساب المناسب ثم ارفع الإثبات في الخطوة التالية</p>
              <div className="grid gap-2">
                {gateways.map((g) => {
                  const on = gatewayId === g.id;
                  return (
                    <button key={g.id} type="button" onClick={() => setGatewayId(g.id)}
                      className={"text-right p-3 rounded-2xl border-2 transition-all " + (on ? "bg-white shadow-md" : "border-gray-100 bg-gray-50 hover:border-gray-200")}
                      style={on ? { borderColor: "var(--primary)" } : {}}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">💳</span>
                        <b className="text-sm flex-1">{g.name}</b>
                        <span className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all " + (on ? "text-white" : "bg-gray-200 text-transparent")}
                          style={on ? { background: "var(--primary)" } : {}}>✓</span>
                      </div>
                      {on && (
                        <div className="text-xs text-gray-500 mt-2 p-2 rounded-xl bg-gray-50 border border-gray-100">
                          <div>🏦 {g.accountInfo}</div>
                          <div className="mt-1">📋 {g.instructions}</div>
                          {g.fee > 0 && <div className="mt-1 text-amber-600">⚠️ رسوم إضافية: {g.fee}</div>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══ الخطوة ٣: إثبات التحويل ═══ */}
            <div className="card mb-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, var(--primary), #9333ea)" }}>٣</span>
                <h3 className="font-black">إثبات التحويل</h3>
              </div>
              <label className={"block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all " + (proof ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50/40")}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])} />
                {uploading ? (
                  <>
                    <div className="text-3xl mb-2">⏳</div>
                    <b className="text-sm">جارٍ الرفع…</b>
                  </>
                ) : proof ? (
                  <div className="flex items-center gap-3 justify-center">
                    <img src={proof} alt="الإثبات" className="w-16 h-16 rounded-xl object-cover border-2 border-green-300" />
                    <div className="text-right">
                      <b className="text-sm text-green-700">✅ رُفع الإثبات بنجاح</b>
                      <div className="text-[11px] text-gray-400">اضغط لاستبدال الصورة</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl mb-2">📎</div>
                    <b className="text-sm">ارفع صورة إثبات التحويل *</b>
                    <div className="text-[11px] text-gray-400 mt-1">لقطة شاشة أو صورة الحوالة</div>
                  </>
                )}
              </label>
            </div>

            {/* زر الإرسال */}
            <button className="w-full py-4 rounded-2xl text-white font-black text-lg shadow-xl transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, var(--primary), #9333ea 60%, #db2777)" }}
              onClick={submit}>
              🚀 إرسال الطلب — {finalPrice.toLocaleString('en')} {selected.currency}
            </button>
            <p className="text-center text-[11px] text-gray-400 mt-2">نراجع الدفع ونتواصل معك خلال 24 ساعة 🔒</p>
          </div>
        )}

        {selected && done && (
          <div className="card text-center py-10">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-black mb-2">استلمنا طلبك!</h2>
            <p className="text-gray-500 mb-4">سنراجع إثبات الدفع ونتواصل معك على <b>{form.phone}</b> خلال 24 ساعة</p>
            <button className="btn" onClick={() => { setSelected(null); setForm({ name: "", phone: "", details: "" }); setProof(""); setGatewayId(""); }}>خدمات أخرى</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlatformServicesPageWrapper() {
  return (
    <Suspense fallback={<div className="page"><div className="card text-center py-10">⏳ جارٍ التحميل…</div></div>}>
      <PlatformServicesPage />
    </Suspense>
  );
}
