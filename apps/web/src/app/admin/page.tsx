'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '@/lib/api';
import AdminSidebar from '@/components/AdminSidebar';
import AdminPwaPush from '@/components/admin/AdminPwaPush';
import { DashStat, DashPanel } from '@/components/dash/DashKit';

// 🔢 عدّاد متحرك — يرتفع من الصفر للقيمة بنعومة
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [to]);
  return <>{n.toLocaleString()}{suffix}</>;
}

// تحية حسب الوقت
const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return '🌙 ليلة سعيدة';
  if (h < 12) return '☀️ صباح الخير';
  if (h < 17) return '🌤️ مساء النور';
  return '🌆 مساء الخير';
};

// الرئيسية — غرفة قيادة المنصة الحية
export default function AdminHome() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/auth/admin-login'); return; }
    setAdminName(u.name || 'مدير المنصة');
    api('/admin/stats').then(setStats).catch(() => router.push('/auth/admin-login'));
    api('/admin/alerts').then(setAlerts).catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString('ar-YE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const CARDS = stats ? [
    { icon: '🏪', n: stats.counts.stores,        l: 'متجر',        c: '#6C3DF5', href: '/admin/stores' },
    { icon: '✅', n: stats.counts.verified,      l: 'موثق',        c: '#059669', href: '/admin/verification' },
    { icon: '👤', n: stats.counts.sellers,       l: 'بائع',        c: '#0EA5E9', href: '/admin/users' },
    { icon: '👥', n: stats.counts.customers,     l: 'عميل',        c: '#8B5CF6', href: '/admin/customers' },
    { icon: '🛒', n: stats.counts.orders,        l: 'طلب',         c: '#F59E0B', href: '/admin/stores' },
    { icon: '⏳', n: stats.counts.pendingOrders, l: 'طلب معلق',    c: '#DC2626', href: '/admin/stores' },
    { icon: '⭐', n: stats.counts.reviews,       l: 'تقييم',       c: '#FBBF24', href: '/admin/reviews' },
    { icon: '💳', n: stats.revenue,              l: 'إيرادات (ر.ي)', c: '#00E5C7', href: '/admin/finance' },
  ] : [];

  const QUICK = [
    { href: '/admin/ops',       icon: '🧠', l: 'غرفة العمليات', g: 'linear-gradient(135deg,#0D9488,#155E75)' },
    { href: '/admin/stores',    icon: '🏪', l: 'المتاجر',     g: 'linear-gradient(135deg,#6C3DF5,#4F46E5)' },
    { href: '/admin/finance',   icon: '💹', l: 'المركز المالي', g: 'linear-gradient(135deg,#059669,#0D9488)' },
    { href: '/admin/security',  icon: '🛡️', l: 'مركز الأمن',   g: 'linear-gradient(135deg,#DC2626,#B91C1C)' },
    { href: '/admin/design',    icon: '🎨', l: 'التصميم',     g: 'linear-gradient(135deg,#EC4899,#DB2777)' },
    { href: '/admin/messaging', icon: '💬', l: 'المراسلة',    g: 'linear-gradient(135deg,#0EA5E9,#0284C7)' },
    { href: '/admin/plans',     icon: '💎', l: 'الخطط',       g: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  ];

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-night relative overflow-hidden">
      {/* توهجات خلفية */}
      <div className="pointer-events-none absolute -top-32 right-0 w-96 h-96 rounded-full opacity-15 anim-blob" style={{ background: '#6C3DF5' }} />
      <div className="pointer-events-none absolute top-64 -left-32 w-96 h-96 rounded-full opacity-10 anim-blob" style={{ background: '#00E5C7', animationDelay: '3s' }} />
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-[0.07]" />

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 relative">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-4">

          {/* 📱 تطبيق لوحة الإدارة + إشعاراتها الفورية (تصل واللوحة مغلقة) */}
          <AdminPwaPush />

          {/* 🌟 ترويسة القيادة */}
          <div className="gradient-border rounded-3xl">
            <div className="bg-night rounded-3xl p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-aurora opacity-30" />
              <div className="relative flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="f-2xl font-black text-white">
                    {greeting()}، <span className="grad-text-animated">{adminName}</span>
                  </h1>
                  <p className="f-xs text-gray-400 mt-1">{today} — كل شيء تحت سيطرتك 👑</p>
                </div>
                <Link href="/admin/alerts"
                  className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3 tilt-hover">
                  <span className="relative text-2xl">
                    🔔
                    {(alerts?.total || 0) > 0 && (
                      <span className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full anim-soft-pulse" />
                    )}
                  </span>
                  <span>
                    <span className="block text-lg font-black text-white leading-none">{alerts ? alerts.total : '…'}</span>
                    <span className="text-[10px] text-gray-400 font-bold">تنبيه يحتاج قرارك</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* ⚡ إجراءات سريعة */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 stagger">
            {QUICK.map(q => (
              <Link key={q.href} href={q.href}
                className="glass-dark rounded-2xl p-3 text-center tilt-hover group">
                <div className="w-10 h-10 mx-auto mb-1.5 rounded-xl flex items-center justify-center text-lg glow-soft group-hover:scale-110 transition-transform"
                  style={{ background: q.g }}>
                  {q.icon}
                </div>
                <div className="text-[11px] font-extrabold text-gray-300">{q.l}</div>
              </Link>
            ))}
          </div>

          {/* 📊 الإحصائيات الحية */}
          {!stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton h-28 rounded-3xl opacity-20" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
                {CARDS.map(s => (
                  <DashStat key={s.l} dark icon={s.icon} label={s.l} color={s.c} href={s.href}
                    value={<CountUp to={Number(s.n) || 0} />} />
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {/* أحدث المتاجر */}
                <DashPanel dark icon="🆕" title="أحدث المتاجر" href="/admin/stores">
                  <div className="space-y-2">
                    {stats.latestStores.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-2xl px-3 py-2.5 hover:bg-white/10 transition-all">
                        <div className="f-sm min-w-0">
                          <span className="font-bold text-white block truncate">{s.type?.icon} {s.name}</span>
                          <span className="f-xs text-gray-500">{s.seller.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2 py-1 rounded-full shrink-0">{s.type?.nameAr}</span>
                      </div>
                    ))}
                    {stats.latestStores.length === 0 && <p className="text-gray-600 f-sm text-center py-4">لا متاجر بعد</p>}
                  </div>
                </DashPanel>

                {/* الأعلى درجة */}
                <DashPanel dark icon="🏆" title="الأعلى درجة ذكية" href="/admin/analytics" hrefLabel="التحليلات ←">
                  <div className="space-y-2">
                    {stats.topStores.map((s: any, i: number) => (
                      <Link key={s.id} href={`/store/${s.slug}`} target="_blank"
                        className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5 hover:bg-white/10 transition-all">
                        <span className="text-lg">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                        <span className="flex-1 font-bold f-sm text-white truncate">{s.name} {s.isVerified && '✅'}</span>
                        <span className="font-black f-sm grad-text-animated">{s.smartScore.toFixed(0)}</span>
                      </Link>
                    ))}
                    {stats.topStores.length === 0 && <p className="text-gray-600 f-sm text-center py-4">لا متاجر بعد</p>}
                  </div>
                </DashPanel>
              </div>

              {/* 🧭 مراكز القيادة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 stagger">
                {[
                  { href: '/admin/payments',  icon: '💳', l: 'المدفوعات',  d: 'اعتماد ومراجعة' },
                  { href: '/admin/security',  icon: '🛡️', l: 'الأمن',      d: 'حماية وجلسات' },
                  { href: '/admin/backups',   icon: '💾', l: 'النسخ',      d: 'احتياطي واستعادة' },
                  { href: '/admin/settings',  icon: '⚙️', l: 'الإعدادات',  d: 'هوية المنصة' },
                ].map(c => (
                  <Link key={c.href} href={c.href}
                    className="gradient-border rounded-2xl group">
                    <div className="bg-night rounded-2xl p-3.5 h-full group-hover:bg-white/5 transition-colors">
                      <div className="text-xl mb-1">{c.icon}</div>
                      <div className="text-xs font-extrabold text-white">{c.l}</div>
                      <div className="text-[10px] text-gray-500">{c.d}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
