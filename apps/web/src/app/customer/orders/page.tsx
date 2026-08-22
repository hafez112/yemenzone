'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import CaptchaBox from '@/components/CaptchaBox';
import { useCurrency } from '@/lib/currency';

const STATUS: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: 'بانتظار البائع', color: '#F59E0B', icon: '⏳' },
  confirmed: { label: 'مؤكد',           color: '#0EA5E9', icon: '✅' },
  processing:{ label: 'قيد التجهيز',    color: '#8B5CF6', icon: '📦' },
  shipped:   { label: 'في الطريق',      color: '#6366F1', icon: '🚚' },
  delivered: { label: 'تم التسليم',     color: '#059669', icon: '🎉' },
  completed: { label: 'مكتمل',          color: '#059669', icon: '✔️' },
  cancelled: { label: 'ملغي',           color: '#DC2626', icon: '✕' },
};

// ↩️ قسم الاسترجاع داخل تفاصيل الطلب — يعرض الحالة أو نموذج الطلب
function ReturnSection({ order, onDone, sym }: any) {
  const [openForm, setOpenForm] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [captcha, setCaptcha] = useState({ id: '', answer: '' });
  const [capKey, setCapKey] = useState(0);
  const latest = order.returns?.[0];

  async function submit() {
    if (reason.trim().length < 10) return toast('✍️ اكتب سبب الاسترجاع بتفصيل (10 أحرف على الأقل)', 'error');
    setSending(true);
    try {
      const r = await api('/v1/returns', {
        method: 'POST',
        body: JSON.stringify({ number: order.number, phone: order.customerPhone, reason: reason.trim(), captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
      });
      toast(r.message || '✅ وصل طلبك للبائع');
      onDone({ id: r.id, reason: reason.trim(), status: 'pending', sellerNote: null, createdAt: new Date().toISOString() });
      setOpenForm(false);
    } catch (e: any) { toast(e.message, 'error'); setCapKey(k => k + 1); }
    setSending(false);
  }

  if (latest) {
    return (
      <div className={`mb-3 rounded-2xl p-3 border ${latest.status === 'accepted' ? 'bg-emerald-50 border-emerald-200' : latest.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
        <p className="font-extrabold text-sm">
          {latest.status === 'accepted' ? '✅ قُبل طلب الاسترجاع' : latest.status === 'rejected' ? '❌ رُفض طلب الاسترجاع' : '⏳ طلب الاسترجاع قيد مراجعة البائع'}
        </p>
        <p className="text-[11px] text-gray-500 mt-1">سببك: {latest.reason}</p>
        {latest.sellerNote && <p className="text-xs font-bold text-gray-600 mt-2 bg-white/70 rounded-xl p-2">💬 رد البائع: {latest.sellerNote}</p>}
        {latest.status === 'accepted' && (
          <p className="text-[11px] font-bold text-emerald-600 mt-2">
            {latest.refundedAmount
              ? `💸 أُعيد ${Number(latest.refundedAmount).toLocaleString()} ${sym(order.currency)} إلى بطاقتك — رتّب مع البائع تسليم المنتج`
              : '📦 رتّب مع البائع تسليم المنتج ليُعاد مبلغك'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3 bg-purple-50 border border-purple-200 rounded-2xl p-3">
      <p className="font-extrabold text-sm mb-1">↩️ غير راضٍ عن المنتج؟</p>
      <p className="text-[11px] text-gray-500 mb-2">اطلب استرجاعاً خلال 7 أيام من الاستلام وفق <a href="/returns" target="_blank" className="text-purple-600 font-bold underline">شروط الاسترجاع</a></p>
      {openForm ? (
        <>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="اشرح سبب الاسترجاع بوضوح: تالف؟ مختلف عن الوصف؟ ناقص؟ *"
            className="w-full px-3 py-2 rounded-xl border border-purple-200 mb-2 text-sm bg-white" />
          <div className="mb-2"><CaptchaBox key={capKey} scope="return" onChange={(id, answer) => setCaptcha({ id, answer })} /></div>
          <button onClick={submit} disabled={sending}
            className="w-full py-3 rounded-xl bg-purple-600 text-white font-extrabold text-sm disabled:opacity-40">
            {sending ? '⏳...' : '📨 إرسال طلب الاسترجاع للبائع'}
          </button>
          <button onClick={() => setOpenForm(false)} className="w-full text-xs text-gray-400 font-bold mt-1.5">إلغاء</button>
        </>
      ) : (
        <button onClick={() => setOpenForm(true)}
          className="w-full py-3 rounded-xl bg-purple-600 text-white font-extrabold text-sm">
          ↩️ تقديم طلب استرجاع
        </button>
      )}
    </div>
  );
}

// طلباتي — لوحة العميل (تصلها الطلبات من المتاجر)
export default function MyOrders() {
  const router = useRouter();
  const { list, convert } = useCurrency();
  const sym = (code?: string) => list.find((c) => c.code === String(code || '').toUpperCase())?.symbol || code || 'ر.ي';
  const [orders, setOrders] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [payStatus, setPayStatus] = useState<any>(null);
  const [gateways, setGateways] = useState<any[]>([]);
  const [payGateway, setPayGateway] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [card, setCard] = useState<any>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [paying, setPaying] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    if (!getUser()) { router.push('/auth/customer-login'); return; }
    api('/customer/orders').then(setOrders).catch(e => toast(e.message, 'error'));
  }, []);

  async function openDetail(id: string) {
    try {
      const r = await api(`/customer/orders/${id}`);
      setOpen(r);
      // 💳 حالة الدفع + البوابات المتاحة
      const u = getUser();
      setPayStatus(null);
      setProofFile(null);
      api(`/v1/payments/order/${id}/status?phone=${u?.phone}`).then(setPayStatus).catch(() => {});
      api('/v1/payments/gateways?scope=orders').then(g => { setGateways(g); if (g[0]) setPayGateway(g[0].id); }).catch(() => {});
      api('/customer/card').then(d => setCard(d.card)).catch(() => setCard(null));
      setOtpSent(false); setOtp('');
    } catch (e: any) { toast(e.message, 'error'); }
  }

  // 💳 الدفع ببطاقة يمن زون (مع OTP عند تفعيله)
  async function payWithCard() {
    setPaying(true);
    try {
      const r = await api('/customer/card/pay', {
        method: 'POST',
        body: JSON.stringify({ orderId: open.id, otp: otp || undefined }),
      });
      if (r.otpRequired) {
        setOtpSent(true);
        toast('🔐 أرسلنا رمز التأكيد إلى جوالك');
      } else {
        toast(r.message || '✅ تم الدفع');
        setOpen(null);
        api('/customer/orders').then(setOrders);
      }
    } catch (e: any) { toast(e.message, 'error'); }
    setPaying(false);
  }

  // 📤 رفع إثبات الدفع لاحقاً من لوحة العميل
  async function submitProof() {
    if (!proofFile || !open) return toast('اختر صورة الإثبات أولاً', 'error');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', proofFile);
      const up = await fetch(`${API}/api/v1/payments/upload-proof`, { method: 'POST', body: fd }).then(r => r.json());
      if (!up.url) throw new Error(up.message || 'فشل الرفع');
      const u = getUser();
      await api(`/v1/payments/order/${open.id}/proof`, {
        method: 'POST',
        body: JSON.stringify({ gatewayId: payGateway, proofImage: up.url, payerPhone: u?.phone }),
      });
      toast('✅ أُرسل الإثبات — قيد المراجعة');
      setPayStatus({ status: 'pending' });
      setProofFile(null);
    } catch (e: any) { toast(e.message, 'error'); }
    setUploading(false);
  }

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-teal-50 to-purple-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-black mb-4">🛒 طلباتي ({orders.length})</h1>

        <div className="space-y-3 stagger">
          {orders.length === 0 && (
            <div className="glass rounded-3xl p-10 text-center text-gray-400">
              <div className="text-5xl mb-3">📦</div>
              لا طلبات بعد — تصفح المتاجر واطلب ما يعجبك
            </div>
          )}
          {orders.map(o => {
            const st = STATUS[o.status] || STATUS.pending;
            return (
              <button key={o.id} onClick={() => openDetail(o.id)}
                className="w-full glass rounded-3xl p-4 text-right card-hover">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black" dir="ltr">{o.number}</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: st.color }}>
                    {st.icon} {st.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">🏪 {o.store.name}</span>
                  <span className="font-black grad-text">{Number(o.total).toLocaleString()} {sym(o.currency)}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {o.items.length} منتج • {new Date(o.createdAt).toLocaleDateString('ar-YE')}
                </div>
              </button>
            );
          })}
        </div>

        {/* تفاصيل الطلب المنبثقة — mb-16 يرفعها فوق شريط الأدوات السفلي في الجوال */}
        {open && (
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" onClick={() => setOpen(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 pb-10 anim-bounce-in max-h-[75vh] md:max-h-[85vh] overflow-y-auto mb-16 md:mb-0"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-lg" dir="ltr">{open.number}</h2>
                <div className="flex items-center gap-2">
                  <a href={`/invoice/${open.number}`} target="_blank"
                    className="px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-xs font-extrabold">🧾 فاتورة</a>
                  <button onClick={() => setOpen(null)} className="w-9 h-9 rounded-full bg-gray-100">✕</button>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {open.items.map((i: any) => (
                  <div key={i.id} className="flex justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                    <span>{i.name} × {i.qty}</span>
                    <span className="font-bold">{(Number(i.price) * i.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-lg border-t pt-3 mb-4">
                <span>الإجمالي</span>
                <span className="grad-text">{Number(open.total).toLocaleString()} {sym(open.currency)}</span>
              </div>
              <div className="text-xs text-gray-400 mb-4">🏪 {open.store.name} • الحالة: {(STATUS[open.status] || STATUS.pending).label}</div>

              {/* 💳 حالة الدفع */}
              {payStatus && (
                <div className="mb-4">
                  {payStatus.status === 'approved' && <p className="text-emerald-600 font-bold text-sm bg-emerald-50 rounded-xl p-3">✅ تم تأكيد دفعتك {payStatus.number}</p>}
                  {payStatus.status === 'pending' && <p className="text-amber-600 font-bold text-sm bg-amber-50 rounded-xl p-3">⏳ إثبات الدفع {payStatus.number} قيد المراجعة</p>}
                  {payStatus.status === 'rejected' && <p className="text-red-600 font-bold text-sm bg-red-50 rounded-xl p-3">❌ رُفض إثبات الدفع — أرسل إثباتاً صحيحاً</p>}
                  {['unpaid', 'rejected'].includes(payStatus.status) && open.status !== 'cancelled' && card && (() => {
                    const balInOrder = convert(Number(card.balance), card.currency, open.currency);
                    const enough = balInOrder >= Number(open.total);
                    return (
                    <div className="mb-3 bg-purple-50 border border-purple-200 rounded-2xl p-3">
                      <p className="font-extrabold text-sm mb-1">💳 ادفع ببطاقة يمن زون</p>
                      <p className="text-xs text-gray-500 mb-2">رصيدك: {Number(card.balance).toLocaleString()} {sym(card.currency)}{card.currency !== open.currency && ` ≈ ${balInOrder.toLocaleString()} ${sym(open.currency)}`} {!enough && <span className="text-red-500 font-bold">— لا يكفي، اشحن بطاقتك من <a href="/customer/card" className="underline">هنا</a></span>}</p>
                      {otpSent && (
                        <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="رمز التأكيد OTP" dir="ltr" inputMode="numeric"
                          className="w-full px-3 py-2 rounded-xl border border-purple-200 mb-2 text-sm" />
                      )}
                      <button onClick={payWithCard} disabled={paying || !enough}
                        className="w-full py-3 rounded-xl bg-purple-600 text-white font-extrabold text-sm disabled:opacity-40">
                        {paying ? '⏳...' : otpSent ? '✅ تأكيد الدفع' : `💳 دفع ${Number(open.total).toLocaleString()} ${sym(open.currency)} بالبطاقة`}
                      </button>
                    </div>
                    );
                  })()}
                  {['unpaid', 'rejected'].includes(payStatus.status) && open.status !== 'cancelled' && gateways.length > 0 && (
                    <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
                      <p className="font-extrabold text-sm">💳 ادفع إلكترونياً الآن</p>
                      {gateways.map(g => (
                        <label key={g.id} className="flex items-start gap-2 text-xs bg-white rounded-xl p-2 border border-gray-100 cursor-pointer">
                          <input type="radio" name="gw" checked={payGateway === g.id} onChange={() => setPayGateway(g.id)} className="mt-0.5" />
                          <span>
                            <span className="font-bold">{g.provider === 'bank' ? '🏦' : '📱'} {g.name}</span>
                            {payGateway === g.id && <span className="block text-gray-500 mt-1">{g.accountInfo} — {g.instructions}</span>}
                          </span>
                        </label>
                      ))}
                      <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] || null)} className="w-full text-xs" />
                      <button onClick={submitProof} disabled={uploading || !proofFile}
                        className="w-full py-3 rounded-xl text-white font-extrabold text-sm disabled:opacity-40"
                        style={{ background: 'var(--primary)' }}>
                        {uploading ? '⏳ جاري الرفع...' : '📤 إرسال إثبات الدفع'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* ↩️ الاسترجاع — بعد الاستلام وفق شروط المنصة */}
              {(open.returns?.length > 0 || ['delivered', 'completed'].includes(open.status)) && (
                <ReturnSection order={open}
                  onDone={(r: any) => setOpen({ ...open, returns: [r, ...(open.returns || [])] })} />
              )}
              {open.store.whatsapp && (
                <a href={`https://wa.me/${open.store.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(open.waText)}`}
                  target="_blank"
                  className="block text-center py-3.5 rounded-2xl bg-green-500 text-white font-extrabold shadow-xl">
                  💬 تواصل مع البائع واتساب
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
