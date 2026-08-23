'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SellerSidebar from '@/components/SellerSidebar';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import { smartMatch, searchBlob } from '@/lib/smart-search';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🛤️ خط سير الطلب الكامل — من الجديد حتى الاستلام
const PIPELINE = [
  { key: 'pending',    label: 'جديد',      icon: '🆕' },
  { key: 'confirmed',  label: 'مؤكد',      icon: '✅' },
  { key: 'processing', label: 'قيد التجهيز', icon: '📦' },
  { key: 'shipped',    label: 'في الطريق',  icon: '🛵' },
  { key: 'delivered',  label: 'سُلّم',      icon: '📬' },
  { key: 'completed',  label: 'مكتمل',     icon: '🎉' },
];
const TABS = [{ key: 'all', label: 'الكل', icon: '🗂️' }, ...PIPELINE, { key: 'cancelled', label: 'ملغاة', icon: '❌' }];
const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'جديد 🆕',      cls: 'bg-amber-100 text-amber-700' },
  confirmed:  { label: 'مؤكد ✅',      cls: 'bg-blue-100 text-blue-700' },
  processing: { label: 'قيد التجهيز 📦', cls: 'bg-indigo-100 text-indigo-700' },
  shipped:    { label: 'في الطريق 🛵',  cls: 'bg-cyan-100 text-cyan-700' },
  delivered:  { label: 'سُلّم 📬',      cls: 'bg-teal-100 text-teal-700' },
  completed:  { label: 'مكتمل 🎉',     cls: 'bg-emerald-100 text-emerald-700' },
  cancelled:  { label: 'ملغي ❌',      cls: 'bg-red-100 text-red-600' },
  refunded:   { label: 'مسترجع ↩️',    cls: 'bg-gray-100 text-gray-500' },
};
const PAY_AR: Record<string, string> = { cash: '💵 عند الاستلام', gateway: '💳 بوابة', card: '🎫 بطاقة يمن زون — مدفوع ✅' };

// 🗺️ رابط خرائط جوجل لموقع العميل
const mapsLink = (o: any) => `https://maps.google.com/?q=${o.customerLat},${o.customerLng}`;
// 📤 نص جاهز يرسله البائع للسائق أو شركة التوصيل — يتضمن رابط الموقع
const deliveryBrief = (o: any) => [
  `🛵 طلب توصيل ${o.number}`,
  `👤 ${o.customerName} — 📱 ${o.customerPhone}`,
  o.address ? `📍 العنوان: ${o.address}` : '',
  (o.customerLat && o.customerLng) ? `🗺️ موقع العميل: ${mapsLink(o)}` : '',
  `💰 الإجمالي: ${Number(o.total).toLocaleString()} ${o.currency || 'ر.ي'}${o.paymentMethod === 'cash' ? ' (تحصيل نقدي من العميل)' : ' (مدفوع ✅)'}`,
].filter(Boolean).join('\n');
async function copyText(t: string, msg: string) {
  try { await navigator.clipboard.writeText(t); toast(msg); }
  catch { toast('⚠️ تعذر النسخ التلقائي — انسخ يدوياً', 'error'); }
}

export default function SellerOrdersPage() {
  const { list } = useCurrency();
  const sym = (code?: string) => list.find((c) => c.code === String(code || 'YER').toUpperCase())?.symbol || code || 'ر.ي';
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [selected, setSelected] = useState<string[]>([]); // 🖨️ تحديد جماعي للبوالص
  const [search, setSearch] = useState(''); // 🔍 البحث الذكي

  const toggleSelect = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length >= 20 ? s : [...s, id]);

  const load = (status = tab) => api(`/seller/orders?status=${status}`).then(setOrders).catch(e => toast(e.message, 'error'));
  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load('all');
    // عدّادات التبويبات من القائمة الكاملة
    api('/seller/orders?status=all').then(setAllOrders).catch(() => {});
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allOrders.length };
    for (const o of allOrders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [allOrders]);

  const refresh = () => { load(); api('/seller/orders?status=all').then(setAllOrders).catch(() => {}); };

  const setStatus = async (id: string, status: string) => {
    if (status === 'cancelled' && !confirm('إلغاء الطلب؟ سيُعاد المخزون ويُشعر العميل')) return;
    setBusy(id + status);
    try {
      await api(`/seller/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      const msgs: Record<string, string> = {
        confirmed: '✅ أكّدت الطلب وأُشعر العميل', processing: '📦 الطلب قيد التجهيز الآن',
        shipped: '🛵 الطلب في الطريق للعميل', delivered: '📬 سُجّل التسليم',
        completed: '🎉 اكتمل الطلب — أحسنت!', cancelled: '❌ أُلغي الطلب وأُعيد المخزون',
      };
      toast(msgs[status] || '✅ حُدّثت الحالة');
      refresh();
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy('');
  };

  const reviewPayment = async (id: string, approve: boolean) => {
    if (!approve && !confirm('رفض إثبات الدفع؟ سيُشعر العميل بمراجعة التحويل')) return;
    setBusy(id + 'pay');
    try {
      await api(`/seller/orders/${id}/payment`, { method: 'POST', body: JSON.stringify({ approve }) });
      toast(approve ? '💳 قُبل إثبات الدفع' : '⚠️ رُفض الإثبات وأُشعر العميل');
      refresh();
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy('');
  };

  // 🔍 البحث الذكي — يفتّش كل الطلبات (كل الحالات) برقم الطلب/العميل/هاتفه/العنوان/الأصناف/السائق
  const q = search.trim();
  const shownOrders = q
    ? allOrders.filter((o) => smartMatch(searchBlob([
        o.number, o.customerName, o.customerPhone, o.address, o.notes,
        o.driver?.name, o.driver?.phone,
        STATUS_META[o.status]?.label,
        ...(o.items || []).map((it: any) => it.name),
      ]), q))
    : orders;

  if (!store) return null;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-black">🛒 طلبات متجري</h1>
            <span className="text-[11px] font-bold text-gray-400">دورة كاملة: تأكيد ← تجهيز ← شحن ← تسليم ← إتمام</span>
          </div>

          {/* التبويبات مع العدّادات */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); load(t.key); }}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-extrabold transition-all ${
                  tab === t.key ? 'text-white shadow' : 'bg-white/70 text-gray-500'
                }`}
                style={tab === t.key ? { background: 'var(--primary)' } : {}}>
                {t.icon} {t.label}
                {(counts[t.key] || 0) > 0 && <span className="opacity-80"> ({counts[t.key]})</span>}
              </button>
            ))}
          </div>

          {/* 🔍 البحث الذكي في الطلبات */}
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 بحث ذكي: رقم طلب، اسم عميل، هاتف، منتج، عنوان، سائق..."
              className="w-full px-4 py-3 rounded-2xl border border-purple-200 outline-none bg-white text-sm font-bold focus:border-purple-400 shadow-sm" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 text-xs font-black">✕</button>
            )}
            {q && (
              <p className="text-[11px] font-bold text-purple-500 mt-1.5">
                🤖 {shownOrders.length === 0 ? 'لا نتائج' : shownOrders.length === 1 ? 'طلب واحد' : shownOrders.length === 2 ? 'طلبان' : shownOrders.length <= 10 ? `${shownOrders.length} طلبات` : `${shownOrders.length} طلباً`} مطابقة لـ «{search}» — البحث يشمل كل الحالات
              </p>
            )}
          </div>

          {/* الطلبات */}
          {shownOrders.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">{q ? '🔍' : '📭'}</div>
              {q ? `لا طلبات تطابق «${search}»` : 'لا طلبات في هذه الحالة حالياً'}
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {shownOrders.map((o: any) => {
                const stepIdx = PIPELINE.findIndex(p => p.key === o.status);
                const meta = STATUS_META[o.status] || { label: o.status, cls: 'bg-gray-100 text-gray-500' };
                const isBusy = busy.startsWith(o.id);
                return (
                  <div key={o.id} className={`glass rounded-3xl p-4 space-y-3 transition-all ${selected.includes(o.id) ? 'ring-2 ring-sky-400' : ''}`}>
                    {/* الرأس */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-start gap-2">
                        {/* ☑️ تحديد للطباعة الجماعية */}
                        <button onClick={() => toggleSelect(o.id)} title="تحديد لطباعة البوليصة"
                          className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                            selected.includes(o.id) ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-300 text-transparent hover:border-sky-300'
                          }`}>
                          ✓
                        </button>
                        <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black" dir="ltr">{o.number}</span>
                          <a href={`/invoice/${o.number}`} target="_blank" title="فاتورة الطلب"
                            className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all">🧾 فاتورة</a>
                          <a href={`/seller/slips?ids=${o.id}`} target="_blank" title="بوليصة شحن للطباعة"
                            className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 transition-all">🖨️ بوليصة</a>
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{new Date(o.createdAt).toLocaleString('ar-YE')}</div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-lg grad-text">{Number(o.total).toLocaleString()} {sym(o.currency)}</div>
                        <div className="text-[10px] text-gray-400">
                          {PAY_AR[o.paymentMethod] || (o.paymentMethod?.startsWith('store:') ? `💳 ${o.paymentMethod.slice(6)}` : o.paymentMethod || '—')}
                          {o.deliveryMethod ? ` • 🚚 ${o.deliveryMethod}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* 🛤️ شريط خط السير */}
                    {!['cancelled', 'refunded'].includes(o.status) && (
                      <div className="flex items-center gap-0.5">
                        {PIPELINE.map((p, i) => (
                          <div key={p.key} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className={`h-1.5 w-full rounded-full transition-all ${i <= stepIdx ? '' : 'bg-gray-200'}`}
                              style={i <= stepIdx ? { background: 'linear-gradient(90deg, var(--primary), var(--secondary, #00E5C7))' } : {}} />
                            <span className={`text-[9px] font-bold ${i <= stepIdx ? 'text-gray-700' : 'text-gray-300'}`}>{p.icon}{i === stepIdx ? ` ${p.label}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* العميل */}
                    <div className="flex items-center gap-3 flex-wrap text-sm bg-white/60 rounded-2xl px-3 py-2">
                      <span className="font-bold">👤 {o.customerName}</span>
                      <a href={`tel:${o.customerPhone}`} className="text-xs font-bold text-purple-600">📞 {o.customerPhone}</a>
                      <a href={`https://wa.me/${o.customerPhone.replace(/[^0-9]/g, '')}`} target="_blank" className="text-xs font-bold text-emerald-600">💬 واتساب</a>
                      {o.address && <span className="text-xs text-gray-400">📍 {o.address}</span>}
                      {o.driver && <span className="text-xs font-bold text-cyan-600">🛵 {o.driver.name} <a href={`tel:${o.driver.phone}`}>📞</a></span>}
                    </div>

                    {/* 🗺️ موقع العميل المُشارك — يصل للبائع ويمرره للسائق/شركة التوصيل */}
                    {o.customerLat && o.customerLng && (
                      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-sky-800">🗺️ العميل شارك موقعه</span>
                          <a href={mapsLink(o)} target="_blank"
                            className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-sky-600">فتح الخريطة</a>
                          <button onClick={() => copyText(mapsLink(o), '📋 نُسخ رابط الموقع')}
                            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-sky-700 border border-sky-200">📋 نسخ الرابط</button>
                          {o.driver && (
                            <a href={`https://wa.me/${o.driver.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(deliveryBrief(o))}`} target="_blank"
                              className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-emerald-500">📤 أرسله للسائق واتساب</a>
                          )}
                          <button onClick={() => copyText(deliveryBrief(o), '🚚 نُسخت بيانات التسليم كاملة — ألصقها لشركة التوصيل')}
                            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-cyan-700 border border-cyan-200">🚚 بيانات شركة التوصيل</button>
                        </div>
                        <p className="text-[11px] text-sky-600 font-bold mt-1.5">
                          {o.driver
                            ? '✅ السائق المعيَّن يرى موقع العميل تلقائياً في تطبيقه — أو أرسله له واتساب بالزر أعلاه'
                            : '💡 عيّن سائقاً من «🚚 تعيين سائق» وسيظهر له موقع العميل تلقائياً في تطبيقه'}
                        </p>
                      </div>
                    )}

                    {/* 💳 مراجعة إثبات الدفع */}
                    {o.payment?.status === 'pending' && o.payment?.proofImage && (
                      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 flex items-center gap-3 flex-wrap">
                        <a href={`${API}${o.payment.proofImage}`} target="_blank">
                          <img src={`${API}${o.payment.proofImage}`} alt="إثبات الدفع"
                            className="w-14 h-14 rounded-xl object-cover shadow" />
                        </a>
                        <div className="flex-1 min-w-[140px]">
                          <div className="font-extrabold text-sm text-amber-700">📤 إثبات تحويل بانتظار مراجعتك</div>
                          <div className="text-[11px] text-amber-600">اضغط الصورة لمعاينتها ثم قرر</div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => reviewPayment(o.id, true)} disabled={isBusy}
                            className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-500 disabled:opacity-40">✅ قبول</button>
                          <button onClick={() => reviewPayment(o.id, false)} disabled={isBusy}
                            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-red-100 text-red-600 disabled:opacity-40">❌ رفض</button>
                        </div>
                      </div>
                    )}
                    {o.payment?.status === 'approved' && (
                      <div className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">💳 دفعة معتمدة ✅</div>
                    )}

                    {/* التفاصيل */}
                    <button onClick={() => setOpen(open === o.id ? null : o.id)}
                      className="text-xs font-extrabold text-gray-500 hover:text-gray-700">
                      {open === o.id ? '▲ إخفاء الأصناف' : `▼ عرض الأصناف (${o.items?.length || 0})`}
                    </button>
                    {open === o.id && (
                      <div className="bg-gray-50 rounded-2xl p-3 space-y-1 anim-fade-up">
                        {o.items?.map((it: any) => (
                          <div key={it.id} className="flex justify-between text-xs">
                            <span>▪️ {it.name} × {it.qty}</span>
                            <span className="font-bold">{Number(it.price * it.qty).toLocaleString()}</span>
                          </div>
                        ))}
                        {Number(o.discount) > 0 && <div className="text-xs text-emerald-600 font-bold">🎟️ خصم: -{Number(o.discount).toLocaleString()}</div>}
                        {Number(o.deliveryFee) > 0 && <div className="text-xs text-blue-600 font-bold">🚚 رسوم: +{Number(o.deliveryFee).toLocaleString()}</div>}
                        {o.notes && <div className="text-xs text-gray-400">📝 {o.notes}</div>}
                      </div>
                    )}

                    {/* ⚡ إجراءات دورة الطلب الكاملة */}
                    <div className="flex gap-2 flex-wrap">
                      {o.status === 'pending' && (<>
                        <button onClick={() => setStatus(o.id, 'confirmed')} disabled={isBusy}
                          className="btn-primary px-4 py-2.5 rounded-xl text-white text-xs font-extrabold disabled:opacity-40">✅ تأكيد الطلب</button>
                        <button onClick={() => setStatus(o.id, 'cancelled')} disabled={isBusy}
                          className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-600 disabled:opacity-40">❌ إلغاء</button>
                      </>)}
                      {o.status === 'confirmed' && (<>
                        <button onClick={() => setStatus(o.id, 'processing')} disabled={isBusy}
                          className="btn-primary px-4 py-2.5 rounded-xl text-white text-xs font-extrabold disabled:opacity-40">📦 بدء التجهيز</button>
                        <button onClick={() => setStatus(o.id, 'cancelled')} disabled={isBusy}
                          className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-600 disabled:opacity-40">❌ إلغاء</button>
                      </>)}
                      {o.status === 'processing' && (<>
                        <button onClick={() => setStatus(o.id, 'shipped')} disabled={isBusy}
                          className="btn-primary px-4 py-2.5 rounded-xl text-white text-xs font-extrabold disabled:opacity-40">🛵 شحن مباشر (بدون سائق)</button>
                        <a href="/seller/delivery" className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-cyan-50 text-cyan-700">🚚 تعيين سائق</a>
                        <button onClick={() => setStatus(o.id, 'cancelled')} disabled={isBusy}
                          className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-600 disabled:opacity-40">❌ إلغاء</button>
                      </>)}
                      {o.status === 'shipped' && (
                        <button onClick={() => setStatus(o.id, 'delivered')} disabled={isBusy}
                          className="btn-primary px-4 py-2.5 rounded-xl text-white text-xs font-extrabold disabled:opacity-40">📬 تم التسليم للعميل</button>
                      )}
                      {o.status === 'delivered' && (
                        <button onClick={() => setStatus(o.id, 'completed')} disabled={isBusy}
                          className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-500 disabled:opacity-40">🎉 إتمام الطلب</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 🖨️ شريط الطباعة الجماعية — يطفو عند تحديد طلبات */}
      {selected.length > 0 && (
        <div className="fixed bottom-24 inset-x-3 z-40 max-w-lg mx-auto anim-bounce-in">
          <div className="rounded-2xl p-3 flex items-center gap-3 shadow-2xl text-white"
            style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>
            <span className="text-sm font-extrabold flex-1">🖨️ حددت {selected.length} طلباً للطباعة</span>
            <a href={`/seller/slips?ids=${selected.join(',')}`} target="_blank"
              className="bg-white text-sky-700 text-xs font-extrabold px-4 py-2 rounded-xl shadow">
              طباعة البوالص
            </a>
            <button onClick={() => setSelected([])} className="text-white/70 text-xs font-bold px-2">إلغاء</button>
          </div>
        </div>
      )}
    </main>
  );
}
