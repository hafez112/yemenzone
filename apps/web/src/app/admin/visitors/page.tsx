'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '../../../components/AdminSidebar';
import { api, getUser } from '../../../lib/api';
import { toast } from '../../../components/Toast';

// 👁️ الزوار والتنبيهات — مراقبة حية لحركة المنصة + ما يحتاج إجراءً
function Stat({ icon, label, value, sub, color }: any) {
  return (
    <div className="rounded-2xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">{icon} {label}</div>
      <div className="text-2xl font-black mt-1" style={{ color }}>{Number(value || 0).toLocaleString()}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function HBar({ label, value, max, color }: any) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-32 truncate text-gray-300 font-bold shrink-0" dir="ltr">{label}</div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(3, (value / Math.max(max, 1)) * 100)}%`, background: color }} />
      </div>
      <div className="w-10 text-left text-gray-400 font-extrabold shrink-0">{Number(value).toLocaleString()}</div>
    </div>
  );
}

const timeAgo = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  return `قبل ${Math.floor(h / 24)} يوم`;
};

const DEVICE_LABEL: Record<string, string> = { mobile: '📱 جوال', desktop: '🖥️ حاسوب', tablet: '📟 لوحي' };

export default function AdminVisitorsPage() {
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);

  const load = () => {
    api('/admin/visitors').then(setD).catch((e) => { toast(e.message, 'error'); router.push('/auth/admin-login'); });
    api('/admin/alerts').then(setAlerts).catch(() => {});
  };

  useEffect(() => {
    if (!getUser()) { router.push('/auth/admin-login'); return; }
    load();
    const t = setInterval(load, 60000); // 🔄 تحديث تلقائي كل دقيقة
    return () => clearInterval(t);
  }, []);

  if (!d) return null;
  const { totals, hourly, topPages, topStores, devices, refs, recent } = d;
  const maxHour = Math.max(...hourly.map((h: any) => h.count), 1);
  const maxPage = Math.max(...topPages.map((p: any) => p.count), 1);
  const maxStore = Math.max(1, ...topStores.map((s: any) => s.count));
  const maxRef = Math.max(1, ...refs.map((r: any) => r.count));
  const totalDevices = devices.reduce((a: number, x: any) => a + x.count, 0) || 1;
  const alertGroups = (alerts?.groups || []).filter((g: any) => g.count > 0);

  return (
    <main className="min-h-screen pt-20 pb-24 px-3" style={{ background: 'linear-gradient(180deg, #0A0A14, #141428)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <AdminSidebar />
        <div className="flex-1 space-y-4 min-w-0">

          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black text-white">👁️ الزوار والتنبيهات</h1>
            <button onClick={load} className="text-xs font-bold text-white/70 border border-white/15 rounded-full px-3 py-1.5 hover:text-white transition-colors">🔄 تحديث</button>
          </div>

          {/* 🚨 التنبيهات — ما يحتاج إجراءً الآن */}
          {alertGroups.length > 0 && (
            <div className="rounded-2xl p-4 border border-amber-500/30" style={{ background: 'rgba(255,184,0,0.06)' }}>
              <div className="text-sm font-black text-amber-300 mb-3">🚨 تنبيهات تحتاج إجراءً</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {alertGroups.map((g: any) => (
                  <Link key={g.key} href={g.link} className="rounded-xl p-3 border border-white/10 hover:border-amber-400/50 transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="text-lg">{g.icon}</div>
                    <div className="text-xs font-bold text-gray-200 mt-1">{g.label}</div>
                    <div className="text-xl font-black text-amber-300 mt-0.5">{g.count}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {alertGroups.length === 0 && alerts && (
            <div className="rounded-2xl p-3 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center" style={{ background: 'rgba(16,185,129,0.07)' }}>
              ✅ لا توجد تنبيهات معلقة — كل شيء تحت السيطرة
            </div>
          )}

          {/* 📊 بطاقات الإحصائيات */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat icon="👁️" label="زيارات اليوم" value={totals.today} sub={`أمس: ${totals.yesterday.toLocaleString()}`} color="#00E5C7" />
            <Stat icon="🧍" label="زوار فريدون اليوم" value={totals.uniqueToday} sub={`الأسبوع: ${totals.uniqueWeek.toLocaleString()}`} color="#6C3DF5" />
            <Stat icon="📅" label="زيارات 7 أيام" value={totals.week} sub={`الشهر: ${totals.month.toLocaleString()}`} color="#FFB800" />
            <Stat icon="🌐" label="فريدون 30 يوم" value={totals.uniqueMonth} sub={`الإجمالي الكلي: ${totals.total.toLocaleString()}`} color="#f472b6" />
          </div>

          {/* 🕐 الزيارات بالساعة — آخر 24 ساعة */}
          <div className="rounded-2xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-sm font-black text-white mb-3">🕐 حركة آخر 24 ساعة</div>
            <div className="flex items-end gap-[3px] h-24" dir="ltr">
              {hourly.map((h: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${h.hour}:00 — ${h.count} زيارة`}>
                  <div className="w-full rounded-t" style={{ height: `${Math.max(3, (h.count / maxHour) * 80)}px`, background: h.count > 0 ? 'linear-gradient(180deg,#00E5C7,#0ea5e9)' : 'rgba(255,255,255,0.06)' }} />
                  {i % 4 === 0 && <div className="text-[8px] text-gray-500">{h.hour}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* 📄 أعلى الصفحات */}
            <div className="rounded-2xl p-4 border border-white/10 space-y-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-sm font-black text-white mb-1">📄 أعلى الصفحات — 30 يوم</div>
              {topPages.length === 0 && <div className="text-xs text-gray-500">لا بيانات بعد — الزيارات تُسجل منذ تفعيل التتبع</div>}
              {topPages.map((p: any) => <HBar key={p.path} label={p.path} value={p.count} max={maxPage} color="#6C3DF5" />)}
            </div>

            {/* 🏪 أعلى المتاجر */}
            <div className="rounded-2xl p-4 border border-white/10 space-y-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-sm font-black text-white mb-1">🏪 أعلى المتاجر زيارة — 30 يوم</div>
              {topStores.length === 0 && <div className="text-xs text-gray-500">لا بيانات بعد</div>}
              {topStores.map((s: any) => <HBar key={s.slug} label={s.name} value={s.count} max={maxStore} color="#00E5C7" />)}
            </div>

            {/* 📱 الأجهزة */}
            <div className="rounded-2xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-sm font-black text-white mb-3">📱 الأجهزة — 30 يوم</div>
              <div className="flex h-3 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {devices.map((x: any, i: number) => (
                  <div key={x.device} style={{ width: `${(x.count / totalDevices) * 100}%`, background: ['#00E5C7', '#6C3DF5', '#FFB800'][i % 3] }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {devices.map((x: any) => (
                  <div key={x.device} className="font-bold text-gray-300">
                    {DEVICE_LABEL[x.device] || x.device} — <span className="text-white font-black">{x.count.toLocaleString()}</span>
                    <span className="text-gray-500"> ({Math.round((x.count / totalDevices) * 100)}%)</span>
                  </div>
                ))}
                {devices.length === 0 && <div className="text-xs text-gray-500">لا بيانات بعد</div>}
              </div>
            </div>

            {/* 🌐 مصادر الزيارات */}
            <div className="rounded-2xl p-4 border border-white/10 space-y-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-sm font-black text-white mb-1">🌐 من أين يأتي الزوار — 30 يوم</div>
              {refs.length === 0 && <div className="text-xs text-gray-500">لا بيانات بعد</div>}
              {refs.map((r: any) => <HBar key={r.ref} label={r.ref === 'direct' ? '🔗 مباشر' : r.ref === 'internal' ? '🏠 داخلي' : r.ref} value={r.count} max={maxRef} color="#FFB800" />)}
            </div>
          </div>

          {/* 🕒 أحدث الزيارات */}
          <div className="rounded-2xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-sm font-black text-white mb-3">🕒 أحدث الزيارات</div>
            <div className="space-y-1.5">
              {recent.length === 0 && <div className="text-xs text-gray-500">لا زيارات مسجلة بعد — التتبع يبدأ فور النشر</div>}
              {recent.map((v: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs border-b border-white/5 pb-1.5">
                  <span>{DEVICE_LABEL[v.device] || '🖥️'}</span>
                  <span className="text-gray-200 font-bold truncate flex-1" dir="ltr">{v.path}</span>
                  {v.storeSlug && <span className="text-[10px] text-cyan-300 font-bold shrink-0">🏪 {v.storeSlug}</span>}
                  <span className="text-[10px] text-gray-500 shrink-0">{timeAgo(v.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
