'use client';
import { useEffect, useMemo, useState } from 'react';

// 🕌 مواقيت الصلاة — خوارزمية فلكية محلية (طريقة رابطة العالم الإسلامي) + التاريخ الهجري
const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'صنعاء', lat: 15.3694, lng: 44.1910 },
  { name: 'عدن', lat: 12.7855, lng: 45.0187 },
  { name: 'تعز', lat: 13.5795, lng: 44.0209 },
  { name: 'الحديدة', lat: 14.7978, lng: 42.9530 },
  { name: 'إب', lat: 13.9667, lng: 44.1833 },
  { name: 'ذمار', lat: 14.5426, lng: 44.4009 },
  { name: 'المكلا', lat: 14.5425, lng: 49.1272 },
  { name: 'سيئون', lat: 15.9448, lng: 48.7875 },
  { name: 'مأرب', lat: 15.4625, lng: 45.3258 },
  { name: 'عمران', lat: 15.6594, lng: 43.9439 },
  { name: 'حجة', lat: 15.6947, lng: 43.5993 },
  { name: 'صعدة', lat: 16.9402, lng: 43.7639 },
  { name: 'المحويت', lat: 15.4691, lng: 43.5452 },
  { name: 'البيضاء', lat: 13.9853, lng: 45.5725 },
  { name: 'أبين (زنجبار)', lat: 13.1283, lng: 45.3804 },
  { name: 'لحج', lat: 13.0567, lng: 44.8819 },
  { name: 'الضالع', lat: 13.6957, lng: 44.7314 },
  { name: 'شبوة (عتق)', lat: 14.5377, lng: 46.8319 },
  { name: 'المهرة (الغيضة)', lat: 16.2370, lng: 52.1633 },
  { name: 'الجوف', lat: 16.7891, lng: 45.3136 },
  { name: 'ريمة', lat: 14.6333, lng: 43.7167 },
  { name: 'سقطرى', lat: 12.4634, lng: 53.8238 },
  { name: 'تريم', lat: 16.0542, lng: 49.0000 },
];

// حساب المواقيت (مبسّط وفق المعادلات الفلكية القياسية — MWL: فجر 18°، عشاء 17°)
function prayTimes(lat: number, lng: number, date: Date) {
  const rad = Math.PI / 180;
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  const j = day + 2440587.5 - lng / 360; // يولياني محلي
  const g = 357.529 + 0.98560028 * (j - 2451545);
  const q = 280.459 + 0.98564736 * (j - 2451545);
  const L = (q + 1.915 * Math.sin(g * rad) + 0.020 * Math.sin(2 * g * rad)) * rad;
  const e = (23.439 - 0.00000036 * (j - 2451545)) * rad;
  const RA = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad / 15;
  const ra = ((RA % 24) + 24) % 24;
  const decl = Math.asin(Math.sin(e) * Math.sin(L));
  const eqt = q / 15 - ra;
  const noon = 12 - eqt; // بتوقيت محلي ظاهري
  const hourAngle = (angle: number) => Math.acos((-Math.sin(angle * rad) - Math.sin(decl) * Math.sin(lat * rad)) / (Math.cos(decl) * Math.cos(lat * rad))) / rad / 15;
  const asrAngle = -Math.atan(1 / (1 + Math.tan(Math.abs(lat * rad - decl)))) / rad;
  const tz = 3; // توقيت اليمن الثابت UTC+3
  const t = (h: number) => noon + h + tz - lng / 15;
  return {
    الفجر: t(-hourAngle(18)),
    الشروق: t(-hourAngle(0.833)),
    الظهر: noon + tz - lng / 15,
    العصر: t(hourAngle(-asrAngle)),
    المغرب: t(hourAngle(0.833)),
    العشاء: t(hourAngle(17)),
  } as Record<string, number>;
}

const toHM = (h: number) => {
  const hh = ((Math.floor(h) % 24) + 24) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  return { h: mm === 60 ? (hh + 1) % 24 : hh, m: mm === 60 ? 0 : mm };
};
const fmt12 = (h: number) => {
  const { h: hh, m } = toHM(h);
  const period = hh >= 12 ? 'م' : 'ص';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const ICONS: Record<string, string> = { الفجر: '🌌', الشروق: '🌅', الظهر: '☀️', العصر: '🌤️', المغرب: '🌇', العشاء: '🌙' };

export default function PrayerTool() {
  const [city, setCity] = useState(CITIES[0]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const times = useMemo(() => prayTimes(city.lat, city.lng, now), [city, now]);
  const names = ['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء'];

  const next = useMemo(() => {
    const cur = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    for (const n of names) if (times[n] > cur) return { name: n, at: times[n] };
    return { name: 'الفجر', at: times['الفجر'] + 24 }; // فجر الغد
  }, [times, now]);

  const remain = useMemo(() => {
    const cur = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    let d = next.at - cur;
    if (d < 0) d += 24;
    const h = Math.floor(d), m = Math.floor((d - h) * 60), s = Math.floor(((d - h) * 60 - m) * 60);
    return `${h > 0 ? h + ' ساعة و' : ''}${m} دقيقة و${s} ثانية`;
  }, [next, now]);

  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const cur = now.getHours() + now.getMinutes() / 60;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl p-6 text-center bg-gradient-to-br from-emerald-600/30 to-green-900/20 border border-emerald-400/30">
        <p className="text-sm text-emerald-200/80 mb-1">🕌 {hijri}</p>
        <p className="text-5xl font-black tabular-nums" dir="ltr">{now.toLocaleTimeString('en-US', { hour12: false })}</p>
        <p className="text-xs text-white/60 mt-1">{now.toLocaleDateString('ar-YE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <div className="mt-4 inline-block rounded-2xl bg-black/30 px-5 py-3">
          <p className="text-[11px] text-emerald-300 font-bold">⏳ متبقي على {next.name}</p>
          <p className="font-black text-lg">{remain}</p>
        </div>
      </div>

      <label className="block rounded-3xl border border-white/10 bg-white/5 p-4">
        <span className="text-xs font-bold text-white/60 block mb-1.5">📍 محافظتك</span>
        <select value={city.name} onChange={(e) => setCity(CITIES.find((c) => c.name === e.target.value)!)}
          className="w-full bg-white/10 border border-white/15 rounded-xl py-3 px-3 text-sm font-bold outline-none focus:border-emerald-400">
          {CITIES.map((c) => <option key={c.name} value={c.name} className="bg-slate-900">{c.name}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {names.map((n) => {
          const active = next.name === n;
          const passed = times[n] < cur && !(active && next.at > 24);
          return (
            <div key={n} className={`rounded-2xl p-4 text-center border transition-all ${active ? 'bg-gradient-to-br from-emerald-500/40 to-teal-600/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20 scale-[1.03]' : 'bg-white/5 border-white/10'} ${passed && !active ? 'opacity-50' : ''}`}>
              <div className="text-2xl mb-1">{ICONS[n]}</div>
              <p className="font-extrabold text-sm">{n}</p>
              <p className="font-black text-lg text-emerald-300">{fmt12(times[n])}</p>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-white/50">🧮 تُحسب فلكياً على جهازك (رابطة العالم الإسلامي) — تعمل بدون إنترنت · قد تختلف دقيقة أو دقيقتين عن التقويم المحلي</p>
    </div>
  );
}
