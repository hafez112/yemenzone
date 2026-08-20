'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

// 🔔 تنبيهاتي — كل الأحداث المهمة لمتجري في مكان واحد
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const days = Math.floor(h / 24);
  if (days < 30) return `قبل ${days} يوم`;
  return new Date(d).toLocaleDateString('ar-YE');
}

export default function NotificationsPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<{ items: any[]; unread: number } | null>(null);

  async function load() {
    const [s, n] = await Promise.all([api('/stores/my'), api('/seller/notifications')]);
    setStore(s);
    setData(n);
  }

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    load().catch(() => router.push('/seller/setup'));
  }, []);

  async function readAll() {
    try {
      await api('/seller/notifications/read-all', { method: 'PATCH' });
      toast('✅ تم تعليم الكل كمقروء');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  async function open(n: any) {
    if (!n.isRead) {
      api(`/seller/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
      setData(d => d ? { items: d.items.map(x => x.id === n.id ? { ...x, isRead: true } : x), unread: Math.max(0, d.unread - 1) } : d);
    }
    if (n.link) router.push(n.link);
  }

  if (!store || !data) return null;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">🔔 التنبيهات {data.unread > 0 && <span className="text-sm text-red-500">({data.unread} جديد)</span>}</h1>
            {data.unread > 0 && (
              <button onClick={readAll}
                className="text-xs font-extrabold px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600">
                ✓ تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="space-y-2 stagger">
            {data.items.map((n: any) => (
              <button key={n.id} onClick={() => open(n)}
                className={`w-full text-right rounded-2xl p-4 flex items-start gap-3 transition-all card-hover ${
                  n.isRead ? 'bg-white/50' : 'glass border-r-4'
                }`}
                style={!n.isRead ? { borderRightColor: 'var(--primary)' } : {}}>
                <span className="text-2xl shrink-0">{n.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm ${n.isRead ? 'font-bold text-gray-600' : 'font-black'}`}>{n.title}</span>
                  {n.body && <span className="block text-xs text-gray-500 mt-0.5">{n.body}</span>}
                  <span className="block text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.isRead && <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--primary)' }} />}
              </button>
            ))}
            {data.items.length === 0 && (
              <div className="glass rounded-3xl p-10 text-center text-gray-400">
                <div className="text-4xl mb-2">🔕</div>
                لا تنبيهات بعد — ستصلك هنا الطلبات الجديدة وقرارات الإدارة فور حدوثها
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
