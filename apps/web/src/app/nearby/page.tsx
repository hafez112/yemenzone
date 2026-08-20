"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "../../components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// 📏 تنسيق المسافة بدقة عالية: بمضاعفات 10 أمتار تحت الكيلومتر، وخانة عشرية فوقه
const fmtDist = (km: number) =>
  km < 1 ? `${Math.max(Math.round(km * 100) * 10, 10)} م` : `${km.toFixed(1)} كم`;

// ⏱️ زمن الوصول التقريبي — مشي 5 كم/س، سيارة 25 كم/س داخل المدن
const fmtMin = (min: number) => {
  const m = Math.round(min);
  if (m < 1) return "دقيقة";
  if (m === 1) return "دقيقة";
  if (m === 2) return "دقيقتان";
  if (m <= 10) return `${m} دقائق`;
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60), r = m % 60;
  return `${h} س${r ? ` ${r} د` : ""}`;
};

export default function NearbyPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [govs, setGovs] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [gov, setGov] = useState("");
  const [type, setType] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = (lat?: number, lng?: number, g?: string, t?: string) => {
    const params = new URLSearchParams();
    if (lat !== undefined && lng !== undefined) { params.set("lat", String(lat)); params.set("lng", String(lng)); }
    if (g) params.set("gov", g);
    if (t) params.set("type", t);
    fetch(API + "/api/v1/stores/nearby?" + params).then((r) => r.json()).then(setData).catch(() => toast("تعذر تحميل النتائج", "error")).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch(API + "/api/v1/governorates").then((r) => r.json()).then((d) => setGovs(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(API + "/api/v1/store-types").then((r) => r.json()).then((d) => setTypes(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // 🎯 تحديد الموقع بأعلى دقة يتيحها الجهاز (GPS) — لمسافة دقيقة فعلاً
  const locate = () => {
    if (!navigator.geolocation) return toast("متصفحك لا يدعم تحديد الموقع", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6), acc: Math.round(pos.coords.accuracy) };
        setCoords(c);
        setLocating(false);
        toast("📍 حُدّد موقعك بدقة — النتائج مرتبة حسب قربها الفعلي منك");
        load(c.lat, c.lng, gov, type);
      },
      () => { setLocating(false); toast("⚠️ تعذر تحديد الموقع — فعّل GPS وسماح الموقع للمتصفح", "error"); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const filter = (g: string, t: string) => {
    setGov(g); setType(t); setLoading(true);
    load(coords?.lat, coords?.lng, g, t);
  };

  const withDist = data?.stores?.filter((s: any) => s.distanceKm !== null) || [];
  const nearestKm = withDist.length ? Math.min(...withDist.map((s: any) => s.distanceKm)) : null;

  return (
    <div dir="rtl" className="pb-24 min-h-screen" style={{ background: "linear-gradient(180deg, var(--primary-soft), transparent 320px)" }}>
      {/* ═══ الترويسة المتدرجة ═══ */}
      <div className="relative overflow-hidden rounded-b-[2.5rem]"
        style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--secondary)))" }}>
        <div className="anim-blob absolute -top-20 -left-16 w-72 h-72 rounded-full bg-white/15 blur-2xl pointer-events-none" />
        <div className="anim-blob absolute -bottom-24 -right-12 w-80 h-80 rounded-full bg-black/10 blur-2xl pointer-events-none" style={{ animationDelay: "2.2s" }} />
        <div className="relative px-4 pt-9 pb-20 text-center text-white max-w-2xl mx-auto">
          <div className="section-chip mx-auto mb-3" style={{ background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.35)", boxShadow: "0 8px 24px -8px rgba(0,0,0,.3)" }}>📍</div>
          <h1 className="f-2xl font-black mb-2">الأقرب إليك أولاً</h1>
          <p className="text-white/85 f-xs leading-relaxed">متاجر، فنادق، إيجارات وخدمات — مرتبة بذكاء يوازن القرب الفعلي + التقييم + الدرجة الذكية + التوثيق</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* ═══ بطاقة الموقع والفلاتر — زجاجية تعلو الترويسة ═══ */}
        <div className="glass rounded-3xl p-4 -mt-12 relative z-10 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={locate}
              disabled={locating}
              className="btn-primary flex-1 min-w-[180px] h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ boxShadow: "0 10px 24px -8px var(--primary-glow)" }}>
              {locating
                ? <><span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> جارٍ تحديد موقعك بدقة…</>
                : coords ? <>📍 موقعك محدد — أعد التحديث</> : <>📍 حدّد موقعي بدقة</>}
            </button>
            {coords && (
              <div className="f-xs px-3 h-12 rounded-2xl bg-white/70 border border-white/60 flex items-center gap-1.5 font-bold text-gray-600">
                🎯 دقة ±{coords.acc && coords.acc < 100 ? coords.acc : "100"} م
              </div>
            )}
          </div>

          {/* أنواع الأنشطة — شرائح أفقية */}
          <div className="edge-fade flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button onClick={() => filter(gov, "")}
              className={`shrink-0 h-10 px-4 rounded-full text-xs font-bold transition-all ${type === "" ? "text-white" : "bg-white/70 text-gray-600 border border-gray-200"}`}
              style={type === "" ? { background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)))", boxShadow: "0 6px 16px -6px var(--primary-glow)" } : {}}>
              ✨ الكل
            </button>
            {types.map((t) => (
              <button key={t.id} onClick={() => filter(gov, t.kind)}
                className={`shrink-0 h-10 px-4 rounded-full text-xs font-bold transition-all ${type === t.kind ? "text-white" : "bg-white/70 text-gray-600 border border-gray-200"}`}
                style={type === t.kind ? { background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)))", boxShadow: "0 6px 16px -6px var(--primary-glow)" } : {}}>
                {t.icon} {t.nameAr}
              </button>
            ))}
          </div>

          <select
            className="w-full h-11 rounded-2xl bg-white/70 border border-gray-200 px-4 text-sm font-bold text-gray-700 outline-none focus:ring-2 transition-shadow"
            style={{ ["--tw-ring-color" as any]: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
            value={gov} onChange={(e) => filter(e.target.value, type)}>
            <option value="">🗺️ كل المحافظات</option>
            {govs.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
        </div>

        {/* ═══ نصائح الذكاء المحلي ═══ */}
        {data?.tips?.length > 0 && (
          <div className="glass rounded-2xl px-4 py-3 mt-4 space-y-1.5">
            {data.tips.map((t: string, i: number) => (
              <div key={i} className="f-xs text-gray-600 flex items-start gap-2"><span className="shrink-0">🤖</span><span>{t}</span></div>
            ))}
          </div>
        )}

        {/* ═══ شريط الإحصاء بعد تحديد الموقع ═══ */}
        {coords && withDist.length > 0 && !loading && (
          <div className="flex items-center gap-2 mt-4 f-xs text-gray-500 font-bold">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--secondary)" }} />
            {withDist.length} {withDist.length === 1 ? "نشاط بإحداثيات دقيقة" : withDist.length === 2 ? "نشاطان بإحداثيات دقيقة" : withDist.length <= 10 ? "أنشطة بإحداثيات دقيقة" : "نشاطاً بإحداثيات دقيقة"} — أقربها يبعد {fmtDist(nearestKm!)}
          </div>
        )}

        {/* ═══ هياكل التحميل ═══ */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-white border border-gray-100">
                <div className="skeleton h-28 w-full" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-5 w-2/3 rounded-xl" />
                  <div className="skeleton h-4 w-1/2 rounded-lg" />
                  <div className="skeleton h-9 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ بطاقات النتائج ═══ */}
        {!loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 stagger">
            {data?.stores?.map((s: any) => {
              const mapsUrl = s.lat !== null && s.lng !== null ? `https://maps.google.com/?q=${s.lat},${s.lng}` : null;
              return (
                <div
                  key={s.id}
                  onClick={() => router.push("/store/" + s.slug)}
                  className="card-hover card-glow cursor-pointer rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm flex flex-col">
                  {/* الغلاف */}
                  <div className="relative h-28 overflow-hidden shrink-0"
                    style={!s.cover ? { background: "linear-gradient(135deg, var(--primary-soft), color-mix(in srgb, var(--secondary) 18%, white))" } : {}}>
                    {s.cover
                      ? <img src={s.cover} alt="" className="zoom-bg w-full h-full object-cover" loading="lazy" />
                      : <div className="w-full h-full grid place-items-center text-4xl opacity-40">{s.type?.icon || "🏪"}</div>}
                    <div className="cover-fade absolute inset-0 pointer-events-none" />
                    {/* المسافة — الشريحة الأبرز */}
                    {s.distanceKm !== null && (
                      <div className="absolute top-2.5 right-2.5 glass-dark rounded-xl px-2.5 py-1.5 text-white text-xs font-black flex items-center gap-1">
                        📏 {fmtDist(s.distanceKm)}
                      </div>
                    )}
                    {s.badge && (
                      <div className="absolute top-2.5 left-2.5 rounded-xl px-2.5 py-1.5 text-white text-[11px] font-black"
                        style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)))", boxShadow: "0 6px 16px -6px var(--primary-glow)" }}>
                        {s.badge}
                      </div>
                    )}
                    {/* الشعار */}
                    <div className="absolute -bottom-0 right-3 translate-y-1/2">
                      {s.logo
                        ? <img src={s.logo} alt="" className="w-12 h-12 rounded-2xl object-cover ring-4 ring-white shadow-lg" loading="lazy" />
                        : <div className="w-12 h-12 rounded-2xl grid place-items-center text-xl ring-4 ring-white shadow-lg text-white"
                            style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)))" }}>
                            {s.type?.icon || "🏪"}
                          </div>}
                    </div>
                  </div>

                  {/* الجسم */}
                  <div className="p-3.5 pt-2 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 pr-14 -mt-1 min-h-[1.5rem]">
                      <b className="truncate text-sm">{s.name}</b>
                      {s.isVerified && <span className="verified-badge shrink-0" title="موثق">✓</span>}
                    </div>
                    <div className="f-xs text-gray-400 mt-0.5 pr-14 truncate">
                      {s.type?.nameAr} · {s.governorate || "—"}{s.city ? " / " + s.city : ""}
                    </div>

                    {/* التقييم */}
                    <div className="flex items-center gap-1.5 mt-2 f-xs">
                      <span className="stars-gold font-black">★ {Number(s.ratingAvg || 0).toFixed(1)}</span>
                      {s.ratingCount > 0 && <span className="text-gray-400">({s.ratingCount})</span>}
                      {s.likesCount > 0 && <span className="text-gray-400">· ❤️ {s.likesCount}</span>}
                    </div>

                    {/* المسافة + زمن الوصول */}
                    {s.distanceKm !== null && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="f-xs font-black px-2.5 py-1.5 rounded-xl text-white flex items-center gap-1"
                          style={{ background: "linear-gradient(135deg, #0284c7, #06b6d4)", boxShadow: "0 6px 14px -6px rgba(2,132,199,.5)" }}>
                          🚶 {fmtMin((s.distanceKm / 5) * 60)}
                        </span>
                        <span className="f-xs font-black px-2.5 py-1.5 rounded-xl text-white flex items-center gap-1"
                          style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 6px 14px -6px rgba(5,150,105,.5)" }}>
                          🚗 {fmtMin((s.distanceKm / 25) * 60)}
                        </span>
                      </div>
                    )}

                    {s.description && <p className="f-xs text-gray-400 mt-2.5 line-clamp-2 leading-relaxed">{s.description}</p>}

                    {/* الإجراءات */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <span className="flex-1 text-center f-xs font-black py-2.5 rounded-xl text-white"
                        style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)))", boxShadow: "0 8px 18px -8px var(--primary-glow)" }}>
                        زيارة الصفحة ←
                      </span>
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="f-xs font-black py-2.5 px-3.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                          🧭 الاتجاهات
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ حالة الفراغ ═══ */}
        {!loading && data && data.stores?.length === 0 && (
          <div className="glass rounded-3xl text-center py-14 mt-5">
            <div className="text-5xl mb-3">🧭</div>
            <div className="font-black mb-1">لا نتائج مطابقة</div>
            <div className="f-xs text-gray-400 mb-5">جرّب إزالة الفلاتر أو اختر محافظة أخرى</div>
            <button onClick={() => filter("", "")}
              className="btn-primary h-11 px-8 rounded-2xl text-white font-black text-sm">
              ✨ عرض الكل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
