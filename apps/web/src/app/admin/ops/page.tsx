'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';

// 🧠 غرفة العمليات الذكية — نبض المنصة لحظة بلحظة
const RANGES = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: '7 أيام' },
  { id: 'month', label: '30 يوماً' },
];

const LIGHTS: Record<string, { dot: string; glow: string; label: string }> = {
  green: { dot: '#10b981', glow: 'rgba(16,185,129,.5)', label: 'ممتاز' },
  yellow: { dot: '#f59e0b', glow: 'rgba(245,158,11,.5)', label: 'يحتاج انتباه' },
  red: { dot: '#ef4444', glow: 'rgba(239,68,68,.5)', label: 'حرج' },
  gray: { dot: '#6b7280', glow: 'rgba(107,114,128,.4)', label: 'لا بيانات' },
};

// 🛡️ قاموس الأحداث الأمنية
const EV: [RegExp, string, string][] = [
  [/auto_ban/, '🚫', 'حظر تلقائي لعنوان مشبوه'],
  [/login_fail/, '⚠️', 'محاولة دخول فاشلة'],
  [/login_success|admin_login/, '🔑', 'تسجيل دخول'],
  [/register/, '🌱', 'تسجيل حساب جديد'],
  [/otp/, '📨', 'إرسال رمز تحقق'],
  [/db\.reset/, '♻️', 'إعادة ضبط قاعدة البيانات'],
  [/db\.repair/, '🩺', 'إصلاح قاعدة البيانات'],
  [/ip_banned/, '🚫', 'حظر عنوان IP'],
  [/ip_unbanned/, '🔓', 'فك حظر عنوان IP'],
  [/admin\.created/, '🛡️', 'إنشاء حساب مدير'],
  [/admin\.deleted/, '🗑️', 'حذف حساب مدير'],
  [/admin\.updated|self_updated/, '✏️', 'تعديل حساب مدير'],
  [/device/, '📱', 'جهاز موثوق'],
  [/session_revoked/, '🔒', 'إلغاء جلسة'],
  [/pwa\.request/, '📱', 'طلب تطبيق ويب'],
  [/pwa\.approved/, '✅', 'قبول تطبيق ويب'],
  [/pwa\.rejected/, '❌', 'رفض تطبيق ويب'],
  [/driver_order/, '🛵', 'تحديث طلب من سائق'],
  [/expense/, '🧾', 'حركة مصروفات'],
];
const evMeta = (e: string): { icon: string; label: string } => {
  const hit = EV.find(([re]) => re.test(e));
  return hit ? { icon: hit[1], label: hit[2] } : { icon: '📌', label: e };
};

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const from = ref.current; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / 900, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(tick); else ref.current = to;
    };
    requestAnimationFrame(tick);
  }, [to]);
  return <>{v.toLocaleString()}{suffix}</>;
}

const timeAgo = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'الآن';
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`;
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`;
  return `قبل ${Math.floor(s / 86400)} يوم`;
};

export default function OpsRoomPage() {
  const router = useRouter();
  const [range, setRange] = useState('week');
  const [data, setData] = useState<any>(null);
  const [live, setLive] = useState(true);
  const firstLoad = useRef(true);

  const load = (silent = false) => {
    api(`/admin/ops-room?range=${range}`)
      .then((d) => { setData(d); firstLoad.current = false; })
      .catch((e) => { if (!silent) toast(e.message, 'error'); });
  };

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
  }, [range]);

  // 🔄 تحديث حي كل 15 ثانية
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, [live, range]);

  // ── رسم المنحنى المساحي (SVG) ──
  const AreaChart = ({ series, k }: { series: any[]; k: 'revenue' | 'orders' }) => {
    const W = 600, H = 190, PAD = 8;
    const vals = series.map((s) => s[k]);
    const max = Math.max(...vals, 1);
    const pts = series.map((s, i) => [
      PAD + (i / Math.max(series.length - 1, 1)) * (W - PAD * 2),
      H - PAD - (s[k] / max) * (H - PAD * 2),
    ]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1][0]},${H - PAD} L${pts[0][0]},${H - PAD} Z`;
    return (
      <div dir="ltr" className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id="opsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--secondary)" stopOpacity=".45" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity=".02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1={PAD} x2={W - PAD} y1={H * g} y2={H * g} stroke="rgba(255,255,255,.06)" strokeDasharray="3 5" />
          ))}
          <path d={area} fill="url(#opsFill)" className="ops-area" />
          <path d={line} fill="none" stroke="var(--secondary)" strokeWidth="2.5" strokeLinecap="round"
            pathLength={1} strokeDasharray={1} className="ops-line" />
          {pts.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={series[i][k] > 0 ? 3 : 0} fill="var(--secondary)" stroke="#0b0620" strokeWidth="1.5">
              <title>{series[i].label}: {series[i][k].toLocaleString()}</title>
            </circle>
          ))}
        </svg>
        <div className="flex justify-between text-[9px] text-gray-500 px-1" dir="rtl">
          <span>{series[0]?.label}</span>
          <span>{series[Math.floor(series.length / 2)]?.label}</span>
          <span>{series[series.length - 1]?.label}</span>
        </div>
      </div>
    );
  };

  const delta = (cur: number, prev: number) => {
    if (!prev) return cur > 0 ? { t: '+100%', up: true } : { t: '—', up: null };
    const d = Math.round(((cur - prev) / prev) * 100);
    return { t: `${d > 0 ? '+' : ''}${d}%`, up: d > 0 ? true : d < 0 ? false : null };
  };

  const maxHeat = data?.heat?.length ? data.heat[0].revenue : 1;

  return (
    <div className="min-h-screen bg-night bg-aurora pt-20 pb-24 px-3">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <main className="flex-1 min-w-0 text-white">

          {/* الترويسة */}
          <div className="gradient-border rounded-3xl mb-4 overflow-hidden">
            <div className="bg-night rounded-[calc(1.5rem-2px)] p-4 md:p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
                    🧠 غرفة العمليات
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${live ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/15 text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-400 anim-soft-pulse' : 'bg-gray-500'}`} />
                      {live ? 'مباشر' : 'متوقف'}
                    </span>
                  </h1>
                  <p className="text-xs text-gray-400 mt-1">نبض المنصة لحظة بلحظة — يتحدث تلقائياً كل 15 ثانية</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                    {RANGES.map((r) => (
                      <button key={r.id} onClick={() => setRange(r.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${range === r.id ? 'text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        style={range === r.id ? { background: 'linear-gradient(135deg, var(--primary), var(--secondary))' } : {}}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setLive(!live)} title={live ? 'إيقاف التحديث الحي' : 'تشغيل التحديث الحي'}
                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center text-sm">
                    {live ? '⏸️' : '▶️'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!data ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-3xl" />)}</div>
          ) : (
            <>
              {/* المؤشرات الرئيسية */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { icon: '💰', label: 'الإيراد', v: data.totals.revenue, prev: data.prevTotals.revenue, c: '#34d399' },
                  { icon: '🛒', label: 'الطلبات', v: data.totals.orders, prev: data.prevTotals.orders, c: '#a78bfa' },
                  { icon: '🌱', label: 'تسجيلات جديدة', v: data.totals.regs, prev: data.prevTotals.regs, c: '#22d3ee' },
                  { icon: '🚫', label: 'ملغاة', v: data.totals.cancelled, prev: 0, c: '#f87171', noDelta: true },
                ].map((k) => {
                  const d = delta(k.v, k.prev);
                  return (
                    <div key={k.label} className="glass-dark rounded-2xl p-3.5 relative overflow-hidden">
                      <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full opacity-20 blur-xl" style={{ background: k.c }} />
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 font-bold mb-1.5">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: `${k.c}22` }}>{k.icon}</span>
                        {k.label}
                      </div>
                      <div className="text-xl font-black"><CountUp to={k.v} /></div>
                      {!k.noDelta && d.up !== null && (
                        <div className={`text-[10px] font-bold mt-1 ${d.up ? 'text-emerald-400' : 'text-red-400'}`}>
                          {d.up ? '▲' : '▼'} {d.t} عن الفترة السابقة
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* المنحنى الزمني */}
              <div className="glass-dark rounded-3xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-extrabold text-sm">📈 الإيراد عبر الزمن</h2>
                  <span className="text-[10px] text-gray-500">مرّر على النقاط لرؤية القيم</span>
                </div>
                <AreaChart series={data.series} k="revenue" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* أعمدة الطلبات والتسجيلات */}
                <div className="glass-dark rounded-3xl p-4">
                  <h2 className="font-extrabold text-sm mb-3">🛒 الطلبات والتسجيلات</h2>
                  <div className="flex items-end gap-1 h-28" dir="ltr">
                    {data.series.map((s: any, i: number) => {
                      const maxO = Math.max(...data.series.map((x: any) => x.orders), 1);
                      const maxR = Math.max(...data.series.map((x: any) => x.regs), 1);
                      return (
                        <div key={i} className="flex-1 flex items-end gap-0.5 h-full" title={`${s.label}: ${s.orders} طلب · ${s.regs} تسجيل`}>
                          <div className="flex-1 rounded-t-md transition-all duration-700"
                            style={{ height: `${Math.max((s.orders / maxO) * 100, 3)}%`, background: 'linear-gradient(180deg,#a78bfa,#6C3DF5)' }} />
                          <div className="flex-1 rounded-t-md transition-all duration-700"
                            style={{ height: `${Math.max((s.regs / maxR) * 100, 3)}%`, background: 'linear-gradient(180deg,#22d3ee,#0e7490)' }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: '#a78bfa' }} /> طلبات</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: '#22d3ee' }} /> تسجيلات</span>
                  </div>
                </div>

                {/* مؤشرات الصحة */}
                <div className="glass-dark rounded-3xl p-4">
                  <h2 className="font-extrabold text-sm mb-3">🚦 صحة المنصة اللحظية</h2>
                  {[
                    { label: 'نجاح المدفوعات', m: data.health.payRate, val: data.health.payRate.value != null ? `${data.health.payRate.value}%` : '—', hint: 'مقبولة مقابل مرفوضة' },
                    { label: 'معدل الإلغاء', m: data.health.cancelRate, val: data.health.cancelRate.value != null ? `${data.health.cancelRate.value}%` : '—', hint: 'من إجمالي الطلبات' },
                    { label: 'متوسط زمن التسليم', m: data.health.deliveryH, val: data.health.deliveryH.value != null ? `${data.health.deliveryH.value} ساعة` : '—', hint: 'من الطلب حتى التسليم' },
                  ].map((h) => {
                    const L = LIGHTS[h.m.light];
                    return (
                      <div key={h.label} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                        <span className="relative w-4 h-4 shrink-0">
                          <span className="absolute inset-0 rounded-full anim-soft-pulse" style={{ background: L.dot, boxShadow: `0 0 14px ${L.glow}` }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold">{h.label}</div>
                          <div className="text-[10px] text-gray-500">{h.hint}</div>
                        </div>
                        <div className="text-left shrink-0">
                          <div className="font-black text-sm">{h.val}</div>
                          <div className="text-[9px] font-bold" style={{ color: L.dot }}>{L.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* خريطة المحافظات الحرارية */}
                <div className="glass-dark rounded-3xl p-4">
                  <h2 className="font-extrabold text-sm mb-3">🗺️ الخريطة الحرارية للمبيعات</h2>
                  {!data.heat.length ? (
                    <p className="text-gray-500 text-xs text-center py-8">لا مبيعات في هذه الفترة بعد</p>
                  ) : (
                    <div className="space-y-2">
                      {data.heat.slice(0, 10).map((g: any, i: number) => {
                        const intensity = g.revenue / maxHeat;
                        return (
                          <div key={g.name} className="relative rounded-xl overflow-hidden bg-white/[.03] p-2.5">
                            <div className="absolute inset-y-0 right-0 transition-all duration-1000"
                              style={{ width: `${Math.max(intensity * 100, 6)}%`, background: `linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) ${Math.round(20 + intensity * 55)}%, transparent))` }} />
                            <div className="relative flex items-center justify-between">
                              <span className="text-xs font-bold flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 w-4">{i + 1}</span> {g.name}
                              </span>
                              <span className="text-[11px] font-black text-teal-300">{g.revenue.toLocaleString()}
                                <span className="text-gray-500 font-normal"> · {g.orders} طلب</span></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* البث الأمني الحي */}
                <div className="glass-dark rounded-3xl p-4">
                  <h2 className="font-extrabold text-sm mb-3 flex items-center gap-2">
                    🛡️ الأحداث الأمنية الحية
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 anim-soft-pulse" />
                  </h2>
                  <div className="space-y-1 max-h-72 overflow-y-auto pl-1">
                    {data.feed.map((f: any) => {
                      const { icon, label } = evMeta(f.event);
                      const danger = /fail|ban|reset|deleted/.test(f.event);
                      return (
                        <div key={f.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-all">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${danger ? 'bg-red-500/15' : 'bg-white/5'}`}>{icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold truncate">{label}</div>
                            <div className="text-[9px] text-gray-500" dir="ltr">{f.ip || ''}</div>
                          </div>
                          <span className="text-[9px] text-gray-500 shrink-0">{timeAgo(f.createdAt)}</span>
                        </div>
                      );
                    })}
                    {!data.feed.length && <p className="text-gray-500 text-xs text-center py-8">لا أحداث مسجلة</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
