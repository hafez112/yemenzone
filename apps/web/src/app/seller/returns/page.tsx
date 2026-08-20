'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

// ↩️ إدارة طلبات الاسترجاع — مراجعة البائع: قبول (يعيد المخزون والمبلغ) أو رفض مسبّب
const TABS = [
  { key: 'pending', icon: '⏳', label: 'قيد المراجعة' },
  { key: 'accepted', icon: '✅', label: 'مقبولة' },
  { key: 'rejected', icon: '❌', label: 'مرفوضة' },
  { key: 'all', icon: '📋', label: 'الكل' },
];
const STATUS_AR: Record<string, { label: string; cls: string }> = {
  pending: { label: '⏳ قيد المراجعة', cls: 'bg-amber-100 text-amber-700' },
  accepted: { label: '✅ مقبول — أُعيد للمخزون', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '❌ مرفوض', cls: 'bg-red-100 text-red-600' },
};

export default function SellerReturnsPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
  }, []);

  const load = (s = tab) => {
    setLoading(true);
    api(`/seller/returns${s === 'all' ? '' : `?status=${s}`}`)
      .then((r) => { setItems(r.items); setCounts(r.counts); })
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (store) load(); }, [store, tab]);

  const review = async (id: string, approve: boolean, orderInfo: any) => {
    const note = (notes[id] || '').trim();
    if (approve) {
      const refundNote = orderInfo.paymentMethod === 'card'
        ? `\n\n💳 الطلب مدفوع ببطاقة يمن زون — سيُخصم ${Number(orderInfo.total).toLocaleString()} ر.ي من محفظتك ويُعاد لبطاقة العميل تلقائياً.`
        : '';
      if (!confirm(`قبول الاسترجاع؟\n\n📦 ستعود كميات الطلب إلى مخزونك تلقائياً.\n🔔 سيُشعر العميل بقبول الاسترجاع وترتيب إعادة المنتج.${refundNote}`)) return;
    } else if (!note) {
      return toast('✍️ اكتب سبب الرفض في حقل الرد أولاً — يظهر للعميل', 'error');
    }
    setBusy(id);
    try {
      const r = await api(`/seller/returns/${id}/review`, { method: 'POST', body: JSON.stringify({ approve, note }) });
      toast(approve
        ? (r.refunded ? `✅ قُبل الاسترجاع — عاد المخزون وأُعيد ${r.refunded.toLocaleString()} ر.ي لبطاقة العميل` : '✅ قُبل الاسترجاع — عادت الكميات لمخزونك وأُشعر العميل')
        : '❌ رُفض الطلب وأُشعر العميل بالسبب');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy('');
  };

  if (!store) return null;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-black">↩️ طلبات الاسترجاع</h1>
            <a href="/returns" target="_blank" className="text-[11px] font-bold text-purple-600 underline">📜 سياسة الاسترجاع</a>
          </div>

          {/* التبويبات مع العدّادات */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-extrabold transition-all ${tab === t.key ? 'text-white shadow' : 'bg-white/70 text-gray-500'}`}
                style={tab === t.key ? { background: 'var(--primary)' } : {}}>
                {t.icon} {t.label}
                {t.key !== 'all' && (counts[t.key] || 0) > 0 && <span className="opacity-80"> ({counts[t.key]})</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-40 rounded-3xl bg-white/60 animate-pulse" />)}</div>
          ) : items.length === 0 ? (
            <div className="bg-white/70 rounded-3xl p-10 text-center text-gray-400">
              <div className="text-5xl mb-3">↩️</div>
              <p className="font-bold">لا طلبات استرجاع {tab === 'pending' ? 'بانتظارك — كل شيء تحت السيطرة' : 'هنا'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((r) => {
                const st = STATUS_AR[r.status] || STATUS_AR.pending;
                const o = r.order;
                return (
                  <div key={r.id} className="bg-white rounded-3xl p-4 shadow-sm space-y-3">
                    {/* الرأس */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black" dir="ltr">{o.number}</span>
                          <a href={`/invoice/${o.number}`} target="_blank"
                            className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all">🧾 فاتورة</a>
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          أُرسل {new Date(r.createdAt).toLocaleString('ar-YE')}
                          {r.reviewedAt && ` • رُوجع ${new Date(r.reviewedAt).toLocaleString('ar-YE')}`}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-lg grad-text">{Number(o.total).toLocaleString()} {o.currency === 'YER' ? 'ر.ي' : o.currency}</div>
                        <div className="text-[10px] text-gray-400">
                          {o.paymentMethod === 'card' ? '🎫 مدفوع ببطاقة يمن زون — الاسترداد تلقائي' : o.paymentMethod === 'cash' ? '💵 عند الاستلام' : `💳 ${o.paymentMethod}`}
                        </div>
                      </div>
                    </div>

                    {/* الأصناف */}
                    <div className="flex flex-wrap gap-1.5">
                      {o.items.map((it: any, i: number) => (
                        <span key={i} className="text-[11px] font-bold bg-gray-100 rounded-full px-2.5 py-1">
                          {it.name}{it.variant ? ` (${it.variant})` : ''} ×{it.qty}
                        </span>
                      ))}
                    </div>

                    {/* العميل */}
                    <div className="flex items-center gap-3 flex-wrap text-sm bg-white/60 rounded-2xl px-3 py-2 border border-gray-100">
                      <span className="font-bold">👤 {r.customerName}</span>
                      <a href={`tel:${r.customerPhone}`} className="text-xs font-bold text-purple-600">📞 {r.customerPhone}</a>
                      <a href={`https://wa.me/${r.customerPhone.replace(/[^0-9]/g, '')}`} target="_blank" className="text-xs font-bold text-emerald-600">💬 واتساب</a>
                    </div>

                    {/* سبب الاسترجاع */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                      <p className="text-[10px] font-extrabold text-amber-600 mb-1">📝 سبب الاسترجاع من العميل</p>
                      <p className="text-sm font-bold text-gray-700">{r.reason}</p>
                    </div>

                    {/* رد البائع */}
                    {r.sellerNote && (
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                        <p className="text-[10px] font-extrabold text-gray-400 mb-1">💬 ردك</p>
                        <p className="text-sm font-bold text-gray-600">{r.sellerNote}</p>
                      </div>
                    )}
                    {r.status === 'accepted' && r.refundedAmount && (
                      <p className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">💸 أُعيد {Number(r.refundedAmount).toLocaleString()} ر.ي لبطاقة العميل تلقائياً</p>
                    )}

                    {/* القرار */}
                    {r.status === 'pending' && (
                      <div className="space-y-2 pt-1">
                        <textarea value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                          placeholder="ردك للعميل (تعليمات الإرجاع عند القبول / سبب الرفض — إلزامي للرفض)" rows={2}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400" />
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => review(r.id, true, o)} disabled={busy === r.id}
                            className="py-3 rounded-xl bg-emerald-500 text-white font-extrabold text-sm shadow disabled:opacity-40 transition-all hover:bg-emerald-600">
                            {busy === r.id ? '⏳...' : '✅ قبول — يعود للمخزون'}
                          </button>
                          <button onClick={() => review(r.id, false, o)} disabled={busy === r.id}
                            className="py-3 rounded-xl bg-red-500 text-white font-extrabold text-sm shadow disabled:opacity-40 transition-all hover:bg-red-600">
                            {busy === r.id ? '⏳...' : '❌ رفض بسبب مكتوب'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-gray-400 font-bold text-center">
            💡 القبول يعيد الكميات لمخزونك فوراً — ولطلبات بطاقة يمن زون يُعاد المبلغ تلقائياً من محفظتك لبطاقة العميل
          </p>
        </div>
      </div>
    </main>
  );
}
