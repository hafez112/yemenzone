'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SellerSidebar from '@/components/SellerSidebar';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

const PAY_TYPES: Record<string, { icon: string; label: string; hint: string }> = {
  cash:     { icon: '💵', label: 'الدفع عند الاستلام', hint: 'العميل يدفع نقداً عند استلام طلبه' },
  wallet:   { icon: '📱', label: 'محفظة إلكترونية',   hint: 'الكريمي جوال، ون كاش، أم فلوس...' },
  bank:     { icon: '🏦', label: 'حساب بنكي',          hint: 'حساب جاري أو توفير باسمك' },
  transfer: { icon: '💸', label: 'حوالة',              hint: 'حوالة محلية باسمك عبر الصرافين' },
};

// 💳🚚 طرق الدفع والتوصيل الخاصة بمتجري — تظهر لعملائي عند إتمام الطلب
export default function SellerCheckoutPage() {
  const { list: CURS, def: defCur } = useCurrency();
  const dsym = (code?: string) => CURS.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || defCur?.symbol || 'ر.ي';
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'pay' | 'delivery'>('pay');
  const [payForm, setPayForm] = useState<any>({ type: 'wallet', label: '', account: '', accountName: '', instructions: '', fee: 0 });
  const [delForm, setDelForm] = useState<any>({ label: '', fee: 0, eta: '', areas: '', note: '' });
  const [showPayForm, setShowPayForm] = useState(false);
  const [showDelForm, setShowDelForm] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () => api('/stores/my/checkout').then(setData).catch(e => toast(e.message, 'error'));
  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
    load();
  }, []);

  async function addPay() {
    if (!payForm.label.trim()) return toast('⚠️ اسم الطريقة مطلوب', 'error');
    if (payForm.type !== 'cash' && !payForm.account.trim()) return toast('⚠️ رقم المحفظة/الحساب مطلوب', 'error');
    setSending(true);
    try {
      await api('/stores/my/payment-methods', { method: 'POST', body: JSON.stringify(payForm) });
      toast('✅ أُضيفت طريقة الدفع — تظهر لعملائك الآن');
      setPayForm({ type: 'wallet', label: '', account: '', accountName: '', instructions: '', fee: 0 });
      setShowPayForm(false);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  async function addDel() {
    if (!delForm.label.trim()) return toast('⚠️ اسم طريقة التوصيل مطلوب', 'error');
    setSending(true);
    try {
      await api('/stores/my/delivery-methods', { method: 'POST', body: JSON.stringify(delForm) });
      toast('✅ أُضيفت طريقة التوصيل — تظهر لعملائك الآن');
      setDelForm({ label: '', fee: 0, eta: '', areas: '', note: '' });
      setShowDelForm(false);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  async function toggle(kind: 'payment-methods' | 'delivery-methods', m: any) {
    try {
      await api(`/stores/my/${kind}/${m.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !m.isActive }) });
      toast(m.isActive ? '⏸️ أُوقفت الطريقة مؤقتاً' : '▶️ الطريقة نشطة الآن');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  async function remove(kind: 'payment-methods' | 'delivery-methods', m: any) {
    if (!confirm(`حذف "${m.label}" نهائياً؟`)) return;
    try {
      await api(`/stores/my/${kind}/${m.id}`, { method: 'DELETE' });
      toast('🗑️ حُذفت الطريقة');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  if (!store || !data) return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto"><div className="skeleton h-40 rounded-3xl" /></div>
    </main>
  );

  const { paymentMethods, deliveryMethods } = data;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-black">💳 الدفع والتوصيل</h1>
            <button onClick={() => tab === 'pay' ? setShowPayForm(!showPayForm) : setShowDelForm(!showDelForm)}
              className="btn-primary text-white text-sm font-extrabold px-5 py-2.5 rounded-2xl">
              {tab === 'pay' ? '➕ طريقة دفع' : '➕ طريقة توصيل'}
            </button>
          </div>

          {/* التبويبات */}
          <div className="flex gap-2">
            <button onClick={() => setTab('pay')}
              className={`px-4 py-2 rounded-full text-sm font-extrabold transition-all ${tab === 'pay' ? 'text-white shadow' : 'bg-white/70 text-gray-500'}`}
              style={tab === 'pay' ? { background: 'var(--primary)' } : {}}>
              💳 طرق الدفع ({paymentMethods.length})
            </button>
            <button onClick={() => setTab('delivery')}
              className={`px-4 py-2 rounded-full text-sm font-extrabold transition-all ${tab === 'delivery' ? 'text-white shadow' : 'bg-white/70 text-gray-500'}`}
              style={tab === 'delivery' ? { background: 'var(--primary)' } : {}}>
              🚚 طرق التوصيل ({deliveryMethods.length})
            </button>
          </div>

          {/* ═══ طرق الدفع ═══ */}
          {tab === 'pay' && (
            <>
              {showPayForm && (
                <div className="glass rounded-3xl p-5 space-y-3 gradient-border">
                  <h2 className="font-extrabold">💳 طريقة دفع جديدة لعملائك</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PAY_TYPES).map(([k, t]) => (
                      <button key={k} type="button" onClick={() => setPayForm({ ...payForm, type: k })}
                        className={`p-3 rounded-2xl border-2 text-right transition-all ${payForm.type === k ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-white'}`}>
                        <div className="font-extrabold text-sm">{t.icon} {t.label}</div>
                        <div className="text-[10px] text-gray-400">{t.hint}</div>
                      </button>
                    ))}
                  </div>
                  <input value={payForm.label} onChange={e => setPayForm({ ...payForm, label: e.target.value })}
                    placeholder='الاسم الظاهر للعميل — مثل: "محفظة الكريمي جوال"'
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                  {payForm.type !== 'cash' && (
                    <>
                      <input value={payForm.account} onChange={e => setPayForm({ ...payForm, account: e.target.value })}
                        placeholder={payForm.type === 'wallet' ? 'رقم المحفظة *' : payForm.type === 'bank' ? 'رقم الحساب *' : 'اسم/رقم استلام الحوالة *'} dir="ltr"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                      <input value={payForm.accountName} onChange={e => setPayForm({ ...payForm, accountName: e.target.value })}
                        placeholder="اسم صاحب الحساب"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                      <textarea value={payForm.instructions} onChange={e => setPayForm({ ...payForm, instructions: e.target.value })}
                        placeholder="تعليمات للعميل (اختياري) — مثل: حوّل ثم أرسل صورة الإشعار" rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">رسوم إضافية ({dsym()}):</span>
                    <input type="number" min="0" value={payForm.fee} onChange={e => setPayForm({ ...payForm, fee: e.target.value })}
                      className="w-28 px-3 py-2 rounded-xl border border-gray-200 outline-none" dir="ltr" />
                  </div>
                  <button onClick={addPay} disabled={sending}
                    className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
                    {sending ? '⏳ جاري الحفظ...' : '✅ حفظ وإتاحة للعملاء'}
                  </button>
                </div>
              )}

              <div className="space-y-3 stagger">
                {paymentMethods.map((m: any) => {
                  const t = PAY_TYPES[m.type] || PAY_TYPES.cash;
                  return (
                    <div key={m.id} className="glass rounded-3xl p-4 flex items-center gap-3 flex-wrap">
                      <span className="w-11 h-11 rounded-2xl bg-white shadow flex items-center justify-center text-xl shrink-0">{t.icon}</span>
                      <div className="flex-1 min-w-[160px]">
                        <div className="font-extrabold text-sm">{m.label}</div>
                        <div className="text-[11px] text-gray-400">
                          {t.label}{m.account ? ` • ${m.account}` : ''}{m.fee > 0 ? ` • رسوم ${m.fee}` : ''}
                        </div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.isActive ? '🟢 نشطة' : '⏸️ موقوفة'}
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => toggle('payment-methods', m)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white border border-gray-200">
                          {m.isActive ? '⏸️ إيقاف' : '▶️ تفعيل'}
                        </button>
                        <button onClick={() => remove('payment-methods', m)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-600">🗑️</button>
                      </div>
                    </div>
                  );
                })}
                {paymentMethods.length === 0 && !showPayForm && (
                  <div className="glass rounded-3xl p-10 text-center text-gray-400">
                    <div className="text-4xl mb-2">💳</div>
                    لا طرق دفع بعد — افتراضياً يظهر لعملائك «الدفع عند الاستلام» فقط
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══ طرق التوصيل ═══ */}
          {tab === 'delivery' && (
            <>
              {showDelForm && (
                <div className="glass rounded-3xl p-5 space-y-3 gradient-border">
                  <h2 className="font-extrabold">🚚 طريقة توصيل جديدة</h2>
                  <input value={delForm.label} onChange={e => setDelForm({ ...delForm, label: e.target.value })}
                    placeholder='الاسم — مثل: "توصيل للمنزل" أو "استلام من المتجر"'
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">رسوم التوصيل ({dsym()})</label>
                      <input type="number" min="0" value={delForm.fee} onChange={e => setDelForm({ ...delForm, fee: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">المدة التقريبية</label>
                      <input value={delForm.eta} onChange={e => setDelForm({ ...delForm, eta: e.target.value })}
                        placeholder="30-60 دقيقة"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none" />
                    </div>
                  </div>
                  <input value={delForm.areas} onChange={e => setDelForm({ ...delForm, areas: e.target.value })}
                    placeholder="المناطق المخدومة — مثل: صنعاء، أمانة العاصمة فقط"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                  <input value={delForm.note} onChange={e => setDelForm({ ...delForm, note: e.target.value })}
                    placeholder="ملاحظة للعميل (اختياري)"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                  <button onClick={addDel} disabled={sending}
                    className="btn-primary w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40">
                    {sending ? '⏳ جاري الحفظ...' : '✅ حفظ وإتاحة للعملاء'}
                  </button>
                </div>
              )}

              <div className="space-y-3 stagger">
                {deliveryMethods.map((m: any) => (
                  <div key={m.id} className="glass rounded-3xl p-4 flex items-center gap-3 flex-wrap">
                    <span className="w-11 h-11 rounded-2xl bg-white shadow flex items-center justify-center text-xl shrink-0">🚚</span>
                    <div className="flex-1 min-w-[160px]">
                      <div className="font-extrabold text-sm">{m.label}</div>
                      <div className="text-[11px] text-gray-400">
                        {m.fee > 0 ? `${m.fee.toLocaleString()} ${dsym()}` : 'مجاني'}{m.eta ? ` • ${m.eta}` : ''}{m.areas ? ` • ${m.areas}` : ''}
                      </div>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {m.isActive ? '🟢 نشطة' : '⏸️ موقوفة'}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => toggle('delivery-methods', m)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white border border-gray-200">
                        {m.isActive ? '⏸️ إيقاف' : '▶️ تفعيل'}
                      </button>
                      <button onClick={() => remove('delivery-methods', m)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-600">🗑️</button>
                    </div>
                  </div>
                ))}
                {deliveryMethods.length === 0 && !showDelForm && (
                  <div className="glass rounded-3xl p-10 text-center text-gray-400">
                    <div className="text-4xl mb-2">🚚</div>
                    لا طرق توصيل بعد — أضف «توصيل للمنزل» أو «استلام من المتجر» برسومك الخاصة
                  </div>
                )}
              </div>
            </>
          )}

          {/* كيف تظهر للعميل */}
          <div className="glass rounded-3xl p-5">
            <h2 className="font-extrabold mb-2">💡 كيف تظهر لعملائك؟</h2>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal pr-5">
              <li>أضف طرق دفعك (محافظك وحساباتك) وطرق توصيلك برسومها</li>
              <li>عند إتمام الطلب يختار العميل طريقة الدفع والتوصيل من خياراتك أنت</li>
              <li>الرسوم تُحسب تلقائياً وتُضاف لإجمالي الطلب — والتحقق منها يتم في الخادم</li>
              <li>للتحويلات: يظهر للعميل رقم حسابك ويرفع إثبات التحويل — يصلك للمراجعة والاعتماد</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
