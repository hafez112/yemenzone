'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser, logout } from '@/lib/api';
import { toast } from '@/components/Toast';
import { TOOLS } from '@/lib/tools';
import { myTools, addMyTool, removeMyTool } from '@/lib/tool-db';
import DashboardPwa from '@/components/DashboardPwa';
import PushSubscribe from '@/components/PushSubscribe';

const STATUS: Record<string, string> = {
  pending: '⏳ بانتظار', confirmed: '✅ مؤكد', processing: '📦 قيد التجهيز',
  shipped: '🚚 في الطريق', delivered: '🎉 تم التسليم', completed: '✔️ مكتمل', cancelled: '✕ ملغي',
  checked_in: '🛎️ دخل',
};

// لوحة العميل الشاملة: طلباتي / حجوزاتي / تقييماتي / مفضلتي / إعداداتي
export default function CustomerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('home');
  const [notifs, setNotifs] = useState<any>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [points, setPoints] = useState<any>(null);
  const [hub, setHub] = useState<any>(null);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [chats, setChats] = useState<any[] | null>(null);
  const [mySrv, setMySrv] = useState<any[] | null>(null);

  // 🧰 خدماتي — إضافة/إزالة مع قاعدة بيانات خاصة لكل خدمة في حساب العميل
  const loadSrv = () => myTools().then(setMySrv).catch(e => toast(e.message, 'error'));
  const addSrv = async (slug: string) => {
    try { await addMyTool(slug); toast('✅ أُضيفت الخدمة إلى لوحتك — لها قاعدة بيانات خاصة في حسابك'); loadSrv(); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  const removeSrv = async (slug: string) => {
    try { await removeMyTool(slug); toast('✕ أُزيلت الخدمة من لوحتك'); loadSrv(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/auth/customer-login'); return; }
    setUser(u);
    api('/customer/dashboard').then(setData).catch(e => toast(e.message, 'error'));
    api('/customer/home-hub').then(setHub).catch(() => {});
    api('/customer/notifications/unread-count').then(r => setUnreadNotifs(r.count || 0)).catch(() => {});
    // فتح تبويب محدد من رابط تنبيه (مثل /customer?tab=points)
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (wanted) setTab(wanted);
  }, []);

  // 🔁 إعادة الطلب بضغطة
  const reorder = async (orderId: string) => {
    setReorderBusy(true);
    try {
      const r = await api(`/customer/orders/${orderId}/reorder`, { method: 'POST' });
      toast(`🔁 أُعيد طلبك بنجاح — ${r.order.number}`);
      if (r.skipped?.length) toast(`⚠️ تُخطي غير المتوفر: ${r.skipped.join('، ')}`, 'error');
      api('/customer/home-hub').then(setHub).catch(() => {});
      api('/customer/dashboard').then(setData).catch(() => {});
    } catch (e: any) { toast(e.message, 'error'); }
    setReorderBusy(false);
  };

  // جلب التنبيهات عند فتح تبويبها أول مرة
  useEffect(() => {
    if (tab === 'notifs' && !notifs) {
      api('/customer/notifications').then(r => { setNotifs(r); setUnreadNotifs(r.unread || 0); }).catch(e => toast(e.message, 'error'));
    }
    // 🎁 جلب النقاط عند فتح تبويبها أول مرة
    if (tab === 'points' && !points) {
      api('/customer/referrals/my').then(setPoints).catch(e => toast(e.message, 'error'));
    }
    // 💬 محادثاتي
    if (tab === 'chats' && !chats) {
      api('/customer/chats').then(setChats).catch(e => toast(e.message, 'error'));
    }
    // 🧰 خدماتي
    if (tab === 'tools' && !mySrv) loadSrv();
  }, [tab]);

  const openNotif = async (n: any) => {
    if (!n.isRead) {
      api(`/customer/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
      setNotifs((p: any) => p ? { ...p, items: p.items.map((x: any) => x.id === n.id ? { ...x, isRead: true } : x), unread: Math.max(0, p.unread - 1) } : p);
      setUnreadNotifs(c => Math.max(0, c - 1));
    }
    if (n.link) router.push(n.link);
  };

  const readAllNotifs = async () => {
    await api('/customer/notifications/read-all', { method: 'PATCH' }).catch(() => {});
    setNotifs((p: any) => p ? { ...p, items: p.items.map((x: any) => ({ ...x, isRead: true })), unread: 0 } : p);
    setUnreadNotifs(0);
    toast('✅ قُرأت كل التنبيهات');
  };

  if (!user) return null;

  const allBookings = data ? [
    ...data.rentalBookings.map((b: any) => ({ ...b, kind: '🏠 إيجار', title: b.unit?.title, store: b.unit?.store })),
    ...data.roomBookings.map((b: any) => ({ ...b, kind: '🏨 فندق', title: b.room?.title, store: b.room?.store })),
    ...data.serviceRequests.map((b: any) => ({ ...b, kind: '🛠️ خدمة', title: b.service?.title, store: b.service?.store })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  const TABS = [
    { id: 'home', icon: '🏠', label: 'الرئيسية' },
    { id: 'orders', icon: '🛒', label: 'طلباتي', count: data?.orders?.length },
    { id: 'bookings', icon: '📅', label: 'حجوزاتي', count: allBookings.length },
    { id: 'notifs', icon: '🔔', label: 'التنبيهات', count: unreadNotifs || undefined },
    { id: 'reviews', icon: '⭐', label: 'تقييماتي', count: data?.reviews?.length },
    { id: 'chats', icon: '💬', label: 'محادثاتي' },
    { id: 'likes', icon: '❤️', label: 'مفضلتي', count: data?.likes?.length },
    { id: 'tools', icon: '🧰', label: 'خدماتي', count: mySrv?.length || undefined },
    { id: 'points', icon: '🎁', label: 'نقاطي' },
    { id: 'settings', icon: '⚙️', label: 'إعداداتي' },
  ];

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-teal-50 to-purple-50">
      <div className="max-w-3xl mx-auto">
        {/* 📱 تطبيق لوحة العميل — طلب يعتمد من الإدارة */}
        <div className="mb-4">
          <DashboardPwa app="customer" />
        </div>

        {/* بطاقة المستخدم */}
        <div className="rounded-3xl p-5 text-white shadow-xl mb-4"
          style={{ background: 'linear-gradient(135deg, var(--secondary), #00BFA5)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80">أهلاً بك 👋</div>
              <h1 className="text-xl font-black">{user.name}</h1>
              <div className="text-xs opacity-80" dir="ltr">{user.phone}</div>
            </div>
            <button onClick={logout} className="text-xs bg-white/20 px-3 py-1.5 rounded-full font-bold">خروج</button>
          </div>
        </div>

        {/* التبويبات */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold shrink-0 transition-all ${
                tab === t.id ? 'text-white shadow-lg' : 'glass'
              }`}
              style={tab === t.id ? { background: 'var(--primary)' } : {}}>
              {t.icon} {t.label} {t.count !== undefined && `(${t.count})`}
            </button>
          ))}
        </div>

        {!data ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-3xl" />)}</div>
        ) : (
          <>
            {/* 🏠 الرئيسية الموحدة — كل ما يهم العميل في لمحة */}
            {tab === 'home' && (
              !hub ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-3xl" />)}</div> : (
              <div className="space-y-3">
                {/* بطاقات سريعة */}
                <div className="grid grid-cols-3 gap-2 stagger">
                  <button onClick={() => setTab('points')} className="glass rounded-3xl p-3.5 text-center card-hover">
                    <div className="text-xl mb-1">🎁</div>
                    <div className="text-lg font-black grad-text">{hub.points.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 font-bold">نقاطي</div>
                  </button>
                  <button onClick={() => setTab('likes')} className="glass rounded-3xl p-3.5 text-center card-hover">
                    <div className="text-xl mb-1">❤️</div>
                    <div className="text-lg font-black grad-text">{hub.favCount}</div>
                    <div className="text-[10px] text-gray-500 font-bold">مفضلتي</div>
                  </button>
                  <Link href="/customer/card" className="glass rounded-3xl p-3.5 text-center card-hover block">
                    <div className="text-xl mb-1">💳</div>
                    <div className="text-lg font-black grad-text">بطاقتي</div>
                    <div className="text-[10px] text-gray-500 font-bold">الشحن والرصيد</div>
                  </Link>
                  <Link href="/customer/wishlist" className="glass rounded-3xl p-3.5 text-center card-hover block">
                    <div className="text-xl mb-1">🤍</div>
                    <div className="text-lg font-black grad-text">منتجاتي</div>
                    <div className="text-[10px] text-gray-500 font-bold">المحفوظة</div>
                  </Link>
                </div>

                {/* 🔔 الإشعارات الفورية */}
                <PushSubscribe />

                {/* 📍 عنواني */}
                <div className="glass rounded-3xl p-4 flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-gray-500">عنوان التوصيل المحفوظ</div>
                    <div className="text-sm font-bold truncate">{hub.address ? `${hub.governorate || ''} — ${hub.address}` : hub.governorate || 'لم تضف عنواناً بعد — يُطلب عند أول طلب'}</div>
                  </div>
                </div>

                {/* 🛒 طلباتي النشطة — بتتبع مرئي */}
                <div className="glass rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-extrabold text-sm">🛒 طلبات نشطة الآن</h2>
                    <Link href="/customer/orders" className="text-xs font-bold" style={{ color: 'var(--primary)' }}>الكل ←</Link>
                  </div>
                  {hub.activeOrders.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">لا طلبات نشطة — تسوّق وستتبعها هنا لحظة بلحظة ✨</p>
                  )}
                  <div className="space-y-3">
                    {hub.activeOrders.map((o: any) => (
                      <Link key={o.id} href={`/track?number=${o.number}&phone=${encodeURIComponent(user.phone)}`}
                        className="block bg-white/70 rounded-2xl p-3.5 card-hover">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-black text-xs" dir="ltr">{o.number}</span>
                          <span className="text-[10px] text-gray-400">🏪 {o.store.name}</span>
                        </div>
                        <MiniPipeline status={o.status} />
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[10px] text-gray-400 truncate flex-1">{o.itemsSummary}</span>
                          <span className="font-black text-xs grad-text shrink-0">{o.total.toLocaleString()} ر.ي</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 🔁 أعد الطلب بضغطة */}
                {hub.lastCompleted && (
                  <div className="rounded-3xl p-4 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}>
                    <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/15 anim-bobble" />
                    <div className="relative flex items-center gap-3">
                      <span className="text-2xl">🔁</span>
                      <div className="flex-1 min-w-0 text-white">
                        <div className="text-[10px] opacity-80 font-bold">آخر طلب ناجح — {hub.lastCompleted.store.name}</div>
                        <div className="text-sm font-black truncate">
                          {hub.lastCompleted.number} · {hub.lastCompleted.itemsCount} صنف · {hub.lastCompleted.total.toLocaleString()} ر.ي
                        </div>
                      </div>
                      <button onClick={() => reorder(hub.lastCompleted.id)} disabled={reorderBusy}
                        className="shrink-0 bg-white text-purple-700 text-xs font-extrabold px-4 py-2.5 rounded-full shadow-lg disabled:opacity-40">
                        {reorderBusy ? '⏳…' : '🔁 أعد الطلب'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ⭐ تقييمات معلقة — تذكير لطيف */}
                {hub.pendingReviews.length > 0 && (
                  <div className="glass rounded-3xl p-4">
                    <h2 className="font-extrabold text-sm mb-2">⭐ قيّم تجربتك</h2>
                    {hub.pendingReviews.map((r: any) => (
                      <Link key={r.orderId} href={`/store/${r.store.slug}`}
                        className="flex items-center gap-3 bg-white/70 rounded-2xl px-4 py-3 mb-2 card-hover group">
                        <span className="text-xl">🏪</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{r.store.name}</div>
                          <div className="text-[10px] text-gray-400">طلبك {r.orderNumber} اكتمل — رأيك يهمنا ويقوّي المتجر</div>
                        </div>
                        <span className="text-xs font-black text-amber-500 bg-amber-50 px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform">
                          قيّم الآن ★
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              )
            )}

            {/* الطلبات */}
            {tab === 'orders' && (
              <div className="space-y-2 stagger">
                {data.orders.length === 0 && <Empty icon="🛒" text="لا طلبات بعد — تصفح المتاجر" />}
                {data.orders.map((o: any) => (
                  <Link key={o.id} href="/customer/orders" className="block glass rounded-2xl p-4 card-hover">
                    <div className="flex justify-between mb-1">
                      <span className="font-black text-sm" dir="ltr">{o.number}</span>
                      <span className="text-xs font-bold">{(STATUS[o.status] || o.status)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>🏪 {o.store.name}</span>
                      <span className="font-black grad-text">{Number(o.total).toLocaleString()} ر.ي</span>
                    </div>
                  </Link>
                ))}
                {data.orders.length > 0 && (
                  <Link href="/customer/orders" className="block text-center text-sm font-bold py-2" style={{ color: 'var(--primary)' }}>
                    عرض كل التفاصيل ←
                  </Link>
                )}
              </div>
            )}

            {/* 🔔 التنبيهات — ردود المتاجر وعروض المنصة */}
            {tab === 'notifs' && (
              <div className="space-y-2 stagger">
                {!notifs && <div className="space-y-2">{[1,2].map(i => <div key={i} className="skeleton h-16 rounded-3xl" />)}</div>}
                {notifs && (
                  <>
                    {notifs.items.length > 0 && (
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs text-gray-400 font-bold">{notifs.unread > 0 ? `${notifs.unread} غير مقروء` : 'كل التنبيهات مقروءة ✅'}</span>
                        {notifs.unread > 0 && <button onClick={readAllNotifs} className="text-xs font-bold" style={{ color: 'var(--primary)' }}>قراءة الكل ✓</button>}
                      </div>
                    )}
                    {notifs.items.length === 0 && <Empty icon="🔔" text="لا تنبيهات — ردود المتاجر وعروض يمن زون تصل هنا" />}
                    {notifs.items.map((n: any) => (
                      <button key={n.id} onClick={() => openNotif(n)}
                        className={`w-full text-right glass rounded-2xl p-4 card-hover ${!n.isRead ? 'border-r-4' : 'opacity-70'}`}
                        style={!n.isRead ? { borderColor: 'var(--primary)' } : {}}>
                        <div className="flex items-start gap-2">
                          <span className="text-xl">{n.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <b className="text-sm flex-1">{n.title}</b>
                              {!n.isRead && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--primary)' }} />}
                            </div>
                            {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                            <div className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('ar-YE')}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* الحجوزات */}
            {tab === 'bookings' && (
              <div className="space-y-2 stagger">
                {allBookings.length === 0 && <Empty icon="📅" text="لا حجوزات بعد" />}
                {allBookings.map((b: any) => (
                  <div key={b.id} className="glass rounded-2xl p-4 card-hover">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-sm">{b.kind} — {b.title}</span>
                      <span className="text-xs font-bold">{(STATUS[b.status] || b.status)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>🏪 {b.store?.name}</span>
                      <span className="font-black grad-text">{Number(b.total).toLocaleString()} ر.ي</span>
                    </div>
                    {(b.fromDate || b.checkIn) && (
                      <div className="text-xs text-gray-400 mt-1">
                        📆 {new Date(b.fromDate || b.checkIn).toLocaleDateString('ar-YE')} ← {new Date(b.toDate || b.checkOut).toLocaleDateString('ar-YE')}
                      </div>
                    )}
                    {b.store?.whatsapp && (
                      <a href={`https://wa.me/${b.store.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank"
                        className="inline-block mt-2 text-xs font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
                        💬 تواصل مع البائع
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* تقييماتي */}
            {tab === 'reviews' && (
              <div className="space-y-2 stagger">
                {data.reviews.length === 0 && <Empty icon="⭐" text="لم تقيّم أي متجر بعد" />}
                {data.reviews.map((r: any) => (
                  <Link key={r.id} href={`/store/${r.store.slug}`} className="block glass rounded-2xl p-4 card-hover">
                    <div className="flex justify-between">
                      <span className="font-bold text-sm">🏪 {r.store.name}</span>
                      <span className="text-amber-400 text-sm">{'★'.repeat(r.rating)}</span>
                    </div>
                    {r.comment && <p className="text-xs text-gray-500 mt-1">{r.comment}</p>}
                  </Link>
                ))}
              </div>
            )}

            {/* 💬 محادثاتي مع المتاجر */}
            {tab === 'chats' && (
              !chats ? <div className="space-y-2">{[1,2].map(i => <div key={i} className="skeleton h-16 rounded-3xl" />)}</div> : (
                <div className="space-y-2 stagger">
                  {chats.length === 0 && <Empty icon="💬" text="لا محادثات — افتح متجراً واضغط «راسلنا مباشرة»" />}
                  {chats.map((c: any) => (
                    <Link key={c.id} href={`/customer/chat/${c.store.slug}`}
                      className="glass rounded-2xl p-4 flex items-center gap-3 card-hover">
                      <span className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-black text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}>
                        🏪
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <b className="text-sm truncate">{c.store.name}</b>
                          {c.unread > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center anim-soft-pulse">
                              {c.unread}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {c.lastMessage ? (c.lastMessage.fromType === 'customer' ? 'أنت: ' : 'المتجر: ') + c.lastMessage.body : 'ابدأ المحادثة'}
                        </div>
                      </div>
                      <span className="text-gray-300 shrink-0">←</span>
                    </Link>
                  ))}
                </div>
              )
            )}

            {/* مفضلتي */}
            {tab === 'likes' && (
              <div className="grid grid-cols-2 gap-2 stagger">
                {data.likes.length === 0 && <div className="col-span-2"><Empty icon="❤️" text="لا متاجر مفضلة بعد" /></div>}
                {data.likes.map((l: any) => (
                  <Link key={l.id} href={`/store/${l.store.slug}`}
                    className="glass rounded-2xl p-4 text-center card-hover">
                    <div className="text-3xl mb-1">🏪</div>
                    <div className="font-bold text-sm">{l.store.name}</div>
                  </Link>
                ))}
              </div>
            )}

            {/* 🧰 خدماتي — الخدمات التي أضفتها + قاعدة بيانات كل خدمة في حسابي */}
            {tab === 'tools' && (
              !mySrv ? <div className="glass rounded-3xl p-10 text-center skeleton h-40" /> : (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-extrabold mb-2">🧰 خدماتي ({mySrv.length})</h2>
                    {mySrv.length === 0 && (
                      <div className="glass rounded-3xl p-8 text-center">
                        <div className="text-4xl mb-2">🧰</div>
                        <p className="font-bold text-sm mb-1">لم تضف أي خدمة بعد</p>
                        <p className="text-xs text-gray-500">أضف من القائمة بالأسفل — كل خدمة تضيفها تحصل على قاعدة بيانات خاصة بها في حسابك</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 stagger">
                      {mySrv.map((r: any) => {
                        const t = TOOLS.find((x: any) => x.slug === r.slug);
                        if (!t) return null;
                        return (
                          <div key={r.slug} className="glass rounded-2xl p-3.5 relative">
                            <Link href={`/tools/${t.slug}`} className="block text-center">
                              <span className={`w-11 h-11 mx-auto rounded-xl bg-gradient-to-br ${t.grad} grid place-items-center text-xl shadow-md mb-2`}>{t.icon}</span>
                              <div className="font-bold text-[13px] leading-snug">{t.title}</div>
                              <div className="text-[10px] text-gray-500 mt-1">
                                {r.hasData
                                  ? <>🗄️ بيانات محفوظة — {new Date(r.updatedAt).toLocaleDateString('ar-YE')}</>
                                  : '🗄️ قاعدتها جاهزة في حسابك'}
                              </div>
                            </Link>
                            <button onClick={() => removeSrv(r.slug)}
                              className="absolute top-2 left-2 w-7 h-7 rounded-full bg-red-50 text-red-500 text-xs font-bold">✕</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h2 className="font-extrabold mb-2">➕ أضف خدمات إلى لوحتك</h2>
                    <div className="grid grid-cols-3 gap-2">
                      {TOOLS.filter((t: any) => t.cat !== 'merchant' && !mySrv.some((r: any) => r.slug === t.slug)).map((t: any) => (
                        <button key={t.slug} onClick={() => addSrv(t.slug)}
                          className="glass rounded-2xl p-3 text-center card-hover">
                          <span className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${t.grad} grid place-items-center text-lg shadow-sm mb-1.5`}>{t.icon}</span>
                          <div className="font-bold text-[11px] leading-snug">{t.title}</div>
                          <div className="text-[9px] text-emerald-600 font-bold mt-1">➕ أضفها</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 text-center">🛍️ أدوات التاجر متاحة في لوحة تحكم البائع — <Link href="/auth/seller-register" className="underline">أنشئ متجرك مجاناً</Link></p>
                  </div>
                </div>
              )
            )}

            {/* 🎁 نقاطي وإحالاتي */}
            {tab === 'points' && (
              !points ? <div className="glass rounded-3xl p-10 text-center skeleton h-40" /> : (
                <PointsPanel points={points} userName={user.name} />
              )
            )}

            {/* إعداداتي */}
            {tab === 'settings' && (
              <div className="glass rounded-3xl p-5 space-y-3">
                <h2 className="font-extrabold">⚙️ إعدادات الحساب</h2>
                <div className="bg-white/70 rounded-2xl p-3 text-sm space-y-1">
                  <div>👤 الاسم: <strong>{user.name}</strong></div>
                  <div>📱 الجوال: <strong dir="ltr">{user.phone}</strong></div>
                </div>
                <Link href="/customer/card"
                  className="block text-center py-3 rounded-2xl bg-purple-100 text-purple-700 font-extrabold">
                  💳 بطاقتي وشحنها
                </Link>
                <Link href="/complaint/track"
                  className="block text-center py-3 rounded-2xl bg-gray-100 text-gray-600 font-extrabold">
                  📩 تتبع شكوى
                </Link>
                <button onClick={logout}
                  className="w-full py-3 rounded-2xl bg-red-50 text-red-500 font-extrabold">
                  تسجيل الخروج
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// 🚦 مسار الطلب المصغّر — 5 مراحل بتدرج متحرك
function MiniPipeline({ status }: { status: string }) {
  const STEPS = [
    { k: 'pending', icon: '📥', label: 'استلام' },
    { k: 'confirmed', icon: '✅', label: 'تأكيد' },
    { k: 'processing', icon: '📦', label: 'تجهيز' },
    { k: 'shipped', icon: '🛵', label: 'شحن' },
    { k: 'delivered', icon: '📬', label: 'تسليم' },
  ];
  const idx = status === 'delivered' || status === 'completed' ? 4 : STEPS.findIndex((s) => s.k === status);
  const pct = Math.max(idx, 0) / (STEPS.length - 1) * 100;
  return (
    <div dir="rtl">
      <div className="flex justify-between px-0.5 mb-1">
        {STEPS.map((s, i) => (
          <span key={s.k} className={`text-[9px] font-bold transition-all ${i <= idx ? '' : 'opacity-35 grayscale'}`}
            style={i <= idx ? { color: 'var(--primary)' } : {}}>
            {s.icon} {s.label}
          </span>
        ))}
      </div>
      <div className="h-1.5 rounded-full bg-gray-200/80 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${Math.max(pct, 8)}%`, background: 'linear-gradient(90deg, var(--secondary), var(--primary))' }} />
      </div>
    </div>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="glass rounded-3xl p-10 text-center text-gray-400">
      <div className="text-5xl mb-3">{icon}</div>
      {text}
    </div>
  );
}

// 🎁 لوحة النقاط والإحالة — رصيد + تقدم المكافأة + إنجازات + رابط دعوة + سجل الحركات
function PointsPanel({ points, userName }: { points: any; userName: string }) {
  const cfg = points.config || {};
  const [ach, setAch] = useState<any>(null);
  useEffect(() => { api('/customer/achievements').then(setAch).catch(() => {}); }, []);
  const link = `${window.location.origin}/auth/customer-register?ref=${points.referralCode}`;
  const shareText = `🎁 انضم لمنصة يمن زون برمز دعوتي ${points.referralCode} واحصل على نقاط هدية فور التسجيل!\n${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('📋 نُسخ رابط الدعوة — أرسله لأصدقائك');
    } catch { toast('⚠️ انسخ الرابط يدوياً من الحقل', 'error'); }
  };

  return (
    <div className="space-y-3">
      {/* الرصيد */}
      <div className="rounded-3xl p-5 text-white text-center shadow-xl"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
        <div className="text-sm opacity-80">🎁 رصيد نقاطك</div>
        <div className="text-4xl font-black my-1">{points.points.toLocaleString('en')}</div>
        <div className="text-xs opacity-80">
          ≈ {(points.points * (cfg.pointValueYER || 0)).toLocaleString('en')} ريال خصم على خدمات المنصة
        </div>
        <div className="flex justify-center gap-4 mt-3 text-xs">
          <span>👥 دعوت <b>{points.invitedCount}</b></span>
          <span>🎁 كل دعوة ناجحة = <b>{cfg.pointsReferrer}+</b> نقطة</span>
        </div>

        {/* 🎯 شريط التقدم نحو المكافأة القادمة */}
        {ach?.nextTier && (
          <div className="mt-4 bg-white/15 rounded-2xl p-3 backdrop-blur">
            <div className="flex justify-between text-[10px] font-bold mb-1.5">
              <span>الهدف القادم: {ach.nextTier.toLocaleString()} نقطة</span>
              <span>{ach.tierProgress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-1000 shadow"
                style={{ width: `${Math.max(ach.tierProgress, 4)}%` }} />
            </div>
            <div className="text-[10px] opacity-80 mt-1.5">
              تبقى {(ach.nextTier - points.points).toLocaleString()} نقطة — كل دعوة تقرّبك 🚀
            </div>
          </div>
        )}
      </div>

      {/* 🏅 إنجازاتي — من نشاطي الحقيقي */}
      {ach && (
        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-sm">🏅 إنجازاتي</h2>
            <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
              {ach.unlockedCount}/{ach.badges.length} مفتوحة
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ach.badges.map((b: any) => (
              <div key={b.title} className={`rounded-2xl p-2 text-center transition-all ${b.unlocked ? 'bg-white shadow-sm' : 'opacity-50 grayscale'}`}
                title={`${b.title}: ${b.desc} — ${b.cur}/${b.target}`}>
                <div className="text-xl">{b.icon}</div>
                <div className="text-[9px] font-black mt-1 leading-tight">{b.title}</div>
                {!b.unlocked && (
                  <div className="h-1 rounded-full bg-gray-200 mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.progress}%`, background: 'var(--primary)' }} />
                  </div>
                )}
                {b.unlocked && <div className="text-[8px] text-emerald-500 font-black mt-1">✓ مفتوحة</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* رابط الدعوة */}
      <div className="glass rounded-3xl p-4">
        <h2 className="font-extrabold text-sm mb-2">📨 ادعُ أصدقاءك واكسبوا معاً</h2>
        <div className="flex gap-2 items-center bg-white/70 rounded-xl px-3 py-2.5 border border-purple-100">
          <span className="text-xs text-gray-500 truncate flex-1" dir="ltr">{link}</span>
          <button onClick={copy} className="btn small shrink-0">📋 نسخ</button>
        </div>
        <div className="flex gap-2 mt-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener"
            className="btn small flex-1 justify-center" style={{ background: '#25D366', color: '#fff' }}>
            مشاركة واتساب
          </a>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`}
            target="_blank" rel="noopener"
            className="btn small flex-1 justify-center" style={{ background: '#0088cc', color: '#fff' }}>
            تيليجرام
          </a>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          عندما يسجّل صديقك برمزك تُضاف نقاط لك وله — استبدل نقاطك بخصومات في
          <Link href="/services" className="font-bold" style={{ color: 'var(--primary)' }}> خدمات المنصة</Link>
        </p>
      </div>

      {/* السجل */}
      <div className="glass rounded-3xl p-4">
        <h2 className="font-extrabold text-sm mb-2">🧾 سجل النقاط</h2>
        {points.history.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">لا حركات بعد — شارك رابط دعوتك لتبدأ الكسب 🚀</p>
        )}
        {points.history.map((h: any) => (
          <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{h.reason}</div>
              <div className="text-[10px] text-gray-400">
                {new Date(h.createdAt).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' })}
              </div>
            </div>
            <b className="text-sm shrink-0" style={{ color: h.points > 0 ? '#059669' : '#dc2626' }}>
              {h.points > 0 ? '+' : ''}{h.points}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}
