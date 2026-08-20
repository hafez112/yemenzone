'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

// 🏅 مستواي وشارات إنجازي — كلها تُحسب من نشاط المتجر الحقيقي
export default function SellerAchievementsPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    api('/stores/my/achievements').then(setData).catch((e) => toast(e.message, 'error'));
  }, []);

  if (!data) {
    return (
      <div className="page">
        <div className="flex flex-col md:flex-row gap-4">
          <SellerSidebar store={store} />
          <main className="flex-1"><div className="card skeleton h-64" /></main>
        </div>
      </div>
    );
  }

  const { level, next, progress, stats, badges, unlockedCount } = data;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🏅 إنجازاتي</h1>
          <p className="text-sm text-gray-500 mb-4">مستواك وشاراتك تنمو مع كل طلب مكتمل — وتظهر للزوار في واجهة متجرك</p>

          {/* بطاقة المستوى */}
          <div className="card text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${level.color}14, ${level.color}08)` }}>
            <div className="text-6xl mb-1">{level.icon}</div>
            <h2 className="!mb-0" style={{ color: level.color }}>تاجر {level.name}</h2>
            <p className="text-xs text-gray-500 mb-4">{stats.deliveredOrders} طلب مكتمل</p>

            {next ? (
              <div className="max-w-sm mx-auto">
                <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1">
                  <span>{level.icon} {level.name}</span>
                  <span>{next.icon} {next.name} — {next.minOrders} طلباً</span>
                </div>
                <div className="h-3 rounded-full bg-white/70 overflow-hidden border border-gray-100">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${level.color}, ${next.color})` }} />
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  تبقّى <b style={{ color: next.color }}>{next.minOrders - stats.deliveredOrders}</b> طلباً للمستوى {next.name} {next.icon}
                </p>
              </div>
            ) : (
              <div className="badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>👑 أعلى مستوى — أنت في القمة!</div>
            )}
          </div>

          {/* إحصاءات سريعة */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { v: stats.deliveredOrders, l: 'طلب مكتمل', i: '📦' },
              { v: stats.ratingAvg > 0 ? stats.ratingAvg.toFixed(1) : '—', l: 'التقييم', i: '⭐' },
              { v: stats.likesCount, l: 'إعجاب', i: '❤️' },
              { v: `${unlockedCount}/${badges.length}`, l: 'شارة مفتوحة', i: '🏅' },
            ].map((s) => (
              <div key={s.l} className="card !mb-0 !p-3 text-center">
                <div className="text-lg font-black">{s.v}</div>
                <div className="text-[10px] text-gray-400 font-bold">{s.i} {s.l}</div>
              </div>
            ))}
          </div>

          {/* شبكة الشارات */}
          <h2 className="font-black text-lg mb-2">🎖️ الشارات <span className="text-sm text-gray-400 font-normal">({unlockedCount} من {badges.length})</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {badges.map((b: any) => (
              <div key={b.id}
                className="card !mb-0 !p-4 text-center transition-all"
                style={b.unlocked
                  ? { background: 'linear-gradient(135deg,#fefce8,#fef3c7)', border: '1.5px solid #fde68a' }
                  : { opacity: 0.75, filter: 'grayscale(0.6)' }}>
                <div className="text-3xl mb-1">{b.unlocked ? b.icon : '🔒'}</div>
                <b className="text-sm block">{b.name}</b>
                <p className="text-[10px] text-gray-500 mt-0.5">{b.desc}</p>
                {b.unlocked ? (
                  <span className="badge mt-1.5" style={{ background: '#d1fae5', color: '#065f46' }}>✅ مفتوحة</span>
                ) : b.target > 1 ? (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (b.current / b.target) * 100)}%`, background: 'var(--primary)' }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{b.current}/{b.target}</span>
                  </div>
                ) : (
                  <span className="badge mt-1.5">مقفلة</span>
                )}
              </div>
            ))}
          </div>

          {/* نصيحة ذكية */}
          <div className="ai-card card">
            <b className="text-sm">🤖 أسرع طريق للشارات</b>
            <p className="text-xs text-gray-600 mt-1">
              {stats.deliveredOrders < 10
                ? 'ركّز على إكمال أول ١٠ طلبات — شارك متجرك مع معارفك عبر صفحة المشاركة.'
                : stats.ratingCount < 5
                ? 'اطلب من زبائنك الراضين تقييم متجرك — ٥ تقييمات بمتوسط ٤.٥ تفتح شارة "تقييم ممتاز".'
                : !stats.isVerified
                ? 'وثّق متجرك بالشارة الزرقاء — ترفع ثقة الزبائن وتفتح شارة "موثق رسمياً".'
                : 'استمر! كل طلب مكتمل يقرّبك من المستوى التالي.'}
            </p>
            <div className="flex gap-2 mt-2">
              <Link href="/seller/share" className="btn small">📱 مشاركة متجري</Link>
              {!stats.isVerified && <Link href="/seller/verification" className="btn small ghost">🎖️ توثيق متجري</Link>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
