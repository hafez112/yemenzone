'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCart, clearCart, cartTotalConv, cartCount, CartItem } from '@/lib/cart';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// ✅ إتمام طلب المول — صفحة منفصلة بثيم فاخر:
// بيانات التوصيل + مشاركة الموقع + طرق التوصيل + طرق الدفع (متجر/بوابات/بطاقة يمن زون) + كوبون + إثبات تحويل
export default function MallCheckoutClient({ store, primary }: { store: any; primary: string }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [done, setDone] = useState<any>(null);
  const [form, setForm] = useState({ customerName: '', customerPhone: '', address: '', notes: '' });
  const [sending, setSending] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<any>(null);
  const [gateways, setGateways] = useState<any[]>([]);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [deliveryId, setDeliveryId] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const [shareLoc, setShareLoc] = useState(false);
  const [loc, setLoc] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [myCard, setMyCard] = useState<any>(undefined);
  const [doneCard, setDoneCard] = useState(false);
  const [cardPaying, setCardPaying] = useState(false);
  const [cardPaid, setCardPaid] = useState(false);
  const [cardError, setCardError] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const { fmt, convert, def: defCur } = useCurrency();

  function requestLocation() {
    if (!('geolocation' in navigator)) {
      toast('⚠️ متصفحك لا يدعم تحديد الموقع — أكمل بدون مشاركة', 'error');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy || 0) });
        setLocLoading(false);
        toast('📍 تم تحديد موقعك — سيصل رابطه للمول مع طلبك');
      },
      () => {
        setLocLoading(false);
        setShareLoc(false);
        setLoc(null);
        toast('⚠️ تعذر تحديد موقعك — اسمح بالوصول للموقع أو أكمل بدونه', 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    const c = getCart(store.slug);
    setCart(c);
    // تهيئة الاختيارات من طرق المول
    const sms: any[] = store.paymentMethods || [];
    if (sms.length) {
      const firstCash = sms.find(m => m.type === 'cash');
      setPayMethod(firstCash ? 'cash' : `sm:${sms[0].id}`);
    }
    const dms: any[] = store.deliveryMethods || [];
    if (dms.length) setDeliveryId(dms[0].id);
    api('/v1/payments/gateways?scope=orders').then(setGateways).catch(() => {});
    const u = getUser();
    setUser(u);
    if (u) {
      setForm(f => ({ ...f, customerName: u.name, customerPhone: u.phone }));
      api('/customer/card').then(d => setMyCard(d.card)).catch(() => setMyCard(null));
    }
  }, [store.slug]);

  const count = cartCount(cart);
  // 💱 كل سطر يُحوَّل من عملة صنفه إلى عملة المنصة الافتراضية — الخادم يعيد الحساب نفسه عند الطلب
  const total = cartTotalConv(cart, (a, from) => convert(a, from, defCur?.code));
  const defSym = defCur?.symbol || 'ر.ي';
  const storeMethods: any[] = store.paymentMethods || [];
  const hasStorePay = storeMethods.length > 0;
  const selectedStoreMethod = payMethod.startsWith('sm:') ? storeMethods.find(m => `sm:${m.id}` === payMethod) : null;
  const selectedGateway = gateways.find(g => g.id === payMethod);
  const gatewayFee = selectedGateway?.fee || selectedStoreMethod?.fee || 0;
  const deliveryMethods: any[] = store.deliveryMethods || [];
  const selectedDelivery = deliveryMethods.find(d => d.id === deliveryId);
  const deliveryFee = selectedDelivery?.fee || 0;
  const finalTotal = (coupon ? Math.max(0, total - coupon.discount) : total) + gatewayFee + deliveryFee;
  const needsProof = payMethod !== 'cash' && payMethod !== 'yzcard' && payMethod !== '' && (!selectedStoreMethod || selectedStoreMethod.type !== 'cash');

  const cardBalance = myCard ? Number(myCard.balance) : null;
  // 💱 كفاية الرصيد تُقاس بعد تحويله من عملة البطاقة إلى عملة الطلب
  const cardBalanceInOrderCur = myCard ? convert(Number(myCard.balance), myCard.currency, defCur?.code) : null;
  const cardEnough = cardBalanceInOrderCur !== null && cardBalanceInOrderCur >= finalTotal;
  const cardUnavailable = user && myCard === null;
  const cardSym = myCard?.currency || defSym;

  async function payOrderWithCard(orderId: string, orderTotal: number, otpCode?: string) {
    setCardPaying(true);
    setCardError('');
    try {
      const r = await api('/customer/card/pay', {
        method: 'POST',
        body: JSON.stringify({ orderId, otp: otpCode || undefined }),
      });
      if (r.otpRequired) {
        setOtpRequired(true);
        toast('🔐 أرسلنا رمز تأكيد الدفع إلى جوالك');
      } else {
        setCardPaid(true);
        setOtpRequired(false);
        api('/customer/card').then(d => setMyCard(d.card)).catch(() => {});
        toast(r.message || '✅ تم الدفع من بطاقتك');
      }
    } catch (e: any) {
      setCardError(e.message);
      toast(e.message, 'error');
    }
    setCardPaying(false);
  }

  async function submitOrder() {
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      return toast('الاسم ورقم الجوال مطلوبان', 'error');
    }
    if (payMethod === 'yzcard') {
      if (!user) return toast('⚠️ سجّل دخولك كعميل أولاً لتدفع ببطاقة يمن زون', 'error');
      if (!myCard) return toast('⚠️ تعذر فحص بطاقتك — أعد المحاولة بعد لحظات', 'error');
      if (myCard.isActive === false) return toast('⚠️ بطاقتك موقوفة — تواصل مع الدعم', 'error');
      const digits = (s: string) => (s || '').replace(/\D/g, '');
      if (digits(form.customerPhone) !== digits(user.phone || ''))
        return toast('⚠️ الدفع بالبطاقة يتطلب أن يكون جوال الطلب هو جوال حسابك المسجل', 'error');
      if ((cardBalanceInOrderCur ?? 0) < finalTotal)
        return toast(`⚠️ رصيد بطاقتك (${Number(myCard.balance).toLocaleString()} ${myCard.currency || ''}) لا يكفي — اشحنها من صفحة بطاقتك`, 'error');
    }
    setSending(true);
    setDoneCard(false); setCardPaid(false); setCardError(''); setOtpRequired(false); setOtp('');
    try {
      const r = await api(`/v1/orders/${store.slug}`, {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.productId, qty: i.qty, variantId: i.variantId })),
          ...form,
          ...(shareLoc && loc ? { customerLat: loc.lat, customerLng: loc.lng } : {}),
          customerId: user?.id,
          couponCode: coupon?.code,
          paymentMethod: payMethod === 'yzcard' ? 'card'
            : payMethod.startsWith('sm:') ? payMethod.replace('sm:', 'store:')
            : payMethod === 'cash' ? 'cash'
            : `gateway:${selectedGateway?.name || payMethod}`,
          deliveryMethodId: deliveryId || undefined,
        }),
      });
      clearCart(store.slug);
      setDone(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (payMethod === 'yzcard') {
        setDoneCard(true);
        payOrderWithCard(r.order.id, Number(r.order.total));
        toast(`🎉 تم إرسال طلبك ${r.order.number} — جاري الدفع من بطاقتك`);
      } else {
        toast(`🎉 تم إرسال طلبك ${r.order.number}`);
      }
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  async function submitProof() {
    if (!proofFile || !done) return toast('اختر صورة الإثبات أولاً', 'error');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', proofFile);
      const up = await fetch(`${API}/api/v1/payments/upload-proof`, { method: 'POST', body: fd }).then(r => r.json());
      if (!up.url) throw new Error(up.message || 'فشل الرفع');
      await api(`/v1/payments/order/${done.order.id}/proof`, {
        method: 'POST',
        body: JSON.stringify({
          ...(payMethod.startsWith('sm:') ? { storeMethodId: payMethod.slice(3) } : { gatewayId: payMethod }),
          proofImage: up.url,
          payerPhone: form.customerPhone,
        }),
      });
      setProofSent(true);
      toast('✅ أُرسل إثبات الدفع — سنراجعه ونؤكد طلبك');
    } catch (e: any) { toast(e.message, 'error'); }
    setUploading(false);
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    try {
      const r = await api('/v1/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode.trim(), storeSlug: store.slug, total }),
      });
      setCoupon(r);
      toast(`🎟️ ${r.label} — وفّرت ${fmt(r.discount)}`);
    } catch (e: any) {
      setCoupon(null);
      toast(e.message, 'error');
    }
  }

  const cardOption = (
    <label className={`block p-3 rounded-2xl border cursor-pointer transition-all ${payMethod === 'yzcard' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2">
        <input type="radio" name="pay" checked={payMethod === 'yzcard'} onChange={() => setPayMethod('yzcard')} />
        <span className="font-bold text-sm flex-1">🎫 بطاقة يمن زون <span className="text-[10px] text-teal-600 font-extrabold">— دفع فوري من رصيدك</span></span>
        {user && cardBalance !== null && (
          <span className={`text-[11px] font-extrabold ${cardEnough ? 'text-teal-600' : 'text-red-500'}`}>
            {cardBalance.toLocaleString()} {cardSym}
          </span>
        )}
      </div>
      {payMethod === 'yzcard' && (
        <div className="mt-2 text-xs bg-white rounded-lg p-2 border border-gray-100">
          {!user && (
            <p className="text-amber-600 font-bold">⚠️ هذه الوسيلة تتطلب حساب عميل — <a href="/auth/customer-login" className="underline">سجّل دخولك</a> ثم أكمل طلبك</p>
          )}
          {cardUnavailable && <p className="text-amber-600 font-bold">⚠️ بطاقة يمن زون متاحة لحسابات العملاء — سجّل دخولك <a href="/auth/customer-login" className="underline">كعميل</a> لتفعيلها</p>}
          {user && myCard === undefined && <p className="text-gray-400 font-bold">⏳ جاري فحص رصيد بطاقتك...</p>}
          {user && cardBalance !== null && !cardEnough && (
            <p className="text-red-500 font-bold">رصيدك لا يكفي لهذا الطلب — اشحن بطاقتك من <a href="/customer/card" className="underline">صفحة البطاقة</a> ثم عُد هنا</p>
          )}
          {user && cardEnough && (
            <p className="text-teal-700 font-bold">✅ سيُخصم ما يعادل {finalTotal.toLocaleString()} {defSym} من رصيد بطاقتك ({cardSym}) فور تأكيد الطلب ويُضاف لمحفظة المول مباشرة — بلا إثبات تحويل</p>
          )}
        </div>
      )}
    </label>
  );

  // ═══ شاشة النجاح ═══
  if (done) {
    return (
      <main className="min-h-screen pb-24 pt-20" style={{ background: `linear-gradient(180deg, ${primary}08, transparent 40%), #faf9ff` }}>
        <div className="max-w-lg mx-auto px-3">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 text-center">
            <div className="text-6xl mb-4 anim-float">🎉</div>
            <h3 className="font-black text-xl mb-1">تم استلام طلبك!</h3>
            <p className="text-gray-500 text-sm mb-1">رقم الطلب: <span className="font-black" style={{ color: primary }} dir="ltr">{done.order.number}</span></p>
            <p className="text-gray-400 text-xs mb-6">سيظهر الطلب في لوحة المول — ولتأكيد أسرع أرسله لواتساب المول</p>

            {doneCard && (
              <div className="w-full bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-3 text-right">
                {cardPaying && <p className="font-extrabold text-sm text-teal-700">⏳ جاري الخصم من بطاقتك وإيداع المبلغ في محفظة المول...</p>}
                {cardPaid && (
                  <p className="font-extrabold text-sm text-emerald-600">✅ تم الدفع من بطاقتك — أُضيف {Number(done.order.total).toLocaleString()} {done.order.currency || defSym} لمحفظة المول وطلبك قيد التجهيز</p>
                )}
                {otpRequired && !cardPaid && !cardPaying && (
                  <>
                    <p className="font-extrabold text-sm mb-2">🔐 أدخل رمز تأكيد الدفع المرسل إلى جوالك</p>
                    <div className="flex gap-2">
                      <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="ــــــ" dir="ltr" inputMode="numeric"
                        className="flex-1 px-3 py-2.5 rounded-xl border border-teal-200 text-center font-black tracking-widest" />
                      <button onClick={() => payOrderWithCard(done.order.id, Number(done.order.total), otp)}
                        disabled={cardPaying || otp.length < 6}
                        className="px-5 rounded-xl bg-teal-600 text-white font-extrabold text-sm disabled:opacity-40">
                        تأكيد الدفع
                      </button>
                    </div>
                  </>
                )}
                {cardError && !cardPaying && !cardPaid && !otpRequired && (
                  <p className="text-red-500 text-xs font-bold">⚠️ {cardError} — طلبك محفوظ ويمكنك إتمام الدفع من <a href="/customer/orders" className="underline">صفحة طلباتك</a></p>
                )}
              </div>
            )}
            {needsProof && !proofSent && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 text-right">
                <p className="font-extrabold text-sm mb-2">📤 أكمل الدفع — ارفع إثبات التحويل</p>
                <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] || null)}
                  className="w-full text-xs mb-2" />
                <button onClick={submitProof} disabled={uploading || !proofFile}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-extrabold text-sm disabled:opacity-40">
                  {uploading ? '⏳ جاري الرفع...' : '📤 إرسال الإثبات'}
                </button>
              </div>
            )}
            {proofSent && <p className="text-emerald-600 font-bold text-sm mb-3">✅ استلمنا إثباتك — قيد المراجعة</p>}
            {done.storeWhatsapp && (
              <a href={`https://wa.me/${done.storeWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(done.waText)}`}
                target="_blank"
                className="block w-full py-4 rounded-2xl bg-green-500 text-white font-extrabold text-lg shadow-xl anim-pulse-glow mb-3">
                💬 تأكيد الطلب عبر واتساب
              </a>
            )}
            <a href={`/track?number=${encodeURIComponent(done.order.number)}&phone=${encodeURIComponent(form.customerPhone)}`}
              className="w-full py-3 rounded-2xl border-2 font-extrabold text-sm mb-3 flex items-center justify-center gap-1"
              style={{ borderColor: primary, color: primary }}>
              🔍 تتبع حالة طلبك
            </a>
            <Link href={`/store/${store.slug}`} className="text-sm text-gray-400 font-bold">متابعة التسوق في المول ←</Link>
          </div>
        </div>
      </main>
    );
  }

  // ═══ نموذج إتمام الطلب ═══
  return (
    <main className="min-h-screen pb-24 pt-20" style={{ background: `linear-gradient(180deg, ${primary}08, transparent 40%), #faf9ff` }}>
      <div className="max-w-lg mx-auto px-3">
        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
          <div className="anim-blob absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="text-4xl">✅</span>
            <div>
              <h1 className="f-2xl font-black">إتمام الطلب</h1>
              <p className="f-xs text-white/85 font-bold">{count} منتج • {fmt(finalTotal)} — {store.name}</p>
            </div>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-3">🛒</div>
            <p className="font-black text-lg">سلتك فارغة</p>
            <Link href={`/store/${store.slug}`} className="inline-block mt-4 px-6 py-3 rounded-2xl text-white font-extrabold text-sm shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)` }}>
              🏬 تسوّق أولاً
            </Link>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {/* ملخص السلة */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-black text-sm mb-2">📦 طلبك ({count})</h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {cart.map(i => (
                  <div key={i.productId + (i.variantId || '')} className="flex justify-between text-xs font-bold text-gray-500">
                    <span className="truncate">{i.name}{i.variant ? ` — ${i.variant}` : ''} × {i.qty}</span>
                    <span className="shrink-0">{fmt(i.price * i.qty, i.currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* بيانات التوصيل */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-2.5">
              <h3 className="font-black text-sm">📝 بيانات التوصيل</h3>
              <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
                placeholder="الاسم الكامل *"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-300" />
              <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="رقم الجوال *" dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-300" />
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="العنوان (المحافظة — الحي)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-300" />

              {/* 📍 مشاركة الموقع */}
              <div className={`rounded-2xl border p-3 transition-all ${shareLoc ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}>
                <p className="font-extrabold text-sm mb-2">📍 مشاركة موقعك للتوصيل</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setShareLoc(true); if (!loc && !locLoading) requestLocation(); }}
                    className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${shareLoc ? 'text-white shadow' : 'bg-white text-gray-500 border border-gray-200'}`}
                    style={shareLoc ? { background: '#0d9488' } : {}}>
                    📍 إرسال موقعي
                  </button>
                  <button type="button" onClick={() => { setShareLoc(false); }}
                    className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${!shareLoc ? 'text-white shadow' : 'bg-white text-gray-500 border border-gray-200'}`}
                    style={!shareLoc ? { background: '#64748b' } : {}}>
                    🚫 بدون مشاركة
                  </button>
                </div>
                {shareLoc && (
                  <div className="mt-2 text-[11px] font-bold">
                    {locLoading && <p className="text-teal-700">⏳ جاري تحديد موقعك بدقة عالية...</p>}
                    {!locLoading && loc && (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-teal-700">✅ تُحِدّ موقعك بدقة ±{loc.acc}م — يصل رابطه للمول ومنه للسائق</p>
                        <a className="text-teal-800 underline shrink-0" target="_blank"
                          href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}>معاينة 🗺️</a>
                      </div>
                    )}
                    {!locLoading && !loc && (
                      <button type="button" onClick={requestLocation} className="text-teal-700 underline">↻ إعادة المحاولة</button>
                    )}
                  </div>
                )}
                {!shareLoc && <p className="mt-2 text-[11px] text-gray-400 font-bold">لن يُرسل أي موقع — يكتفى بالعنوان المكتوب أعلاه</p>}
              </div>

              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="ملاحظات للمول (اختياري)" rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-300" />
            </div>

            {/* الكوبون */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-2">
              <h3 className="font-black text-sm">🎟️ كوبون الخصم</h3>
              <div className="flex gap-2">
                <input value={couponCode} onChange={e => setCouponCode(e.target.value)}
                  placeholder="أدخل الكوبون" dir="ltr"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm" />
                <button onClick={applyCoupon}
                  className="px-4 rounded-xl font-bold text-sm text-white"
                  style={{ background: coupon ? '#059669' : primary }}>
                  {coupon ? '✓ مطبق' : 'تطبيق'}
                </button>
              </div>
              {coupon && (
                <div className="bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2 text-xs font-bold flex justify-between">
                  <span>🎟️ {coupon.label}</span>
                  <span>-{fmt(coupon.discount)}</span>
                </div>
              )}
            </div>

            {/* طريقة التوصيل */}
            {deliveryMethods.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-2">
                <h3 className="font-black text-sm">🚚 طريقة التوصيل</h3>
                {deliveryMethods.map(d => (
                  <label key={d.id} className={`block p-3 rounded-2xl border cursor-pointer transition-all ${deliveryId === d.id ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="delivery" checked={deliveryId === d.id} onChange={() => setDeliveryId(d.id)} />
                      <span className="font-bold text-sm flex-1">{d.label}</span>
                      <span className="text-xs font-extrabold" style={{ color: primary }}>{d.fee > 0 ? `+${fmt(d.fee)}` : 'مجاني'}</span>
                    </div>
                    {deliveryId === d.id && (d.eta || d.areas || d.note) && (
                      <div className="mt-1.5 text-[11px] text-gray-500 pr-6">
                        {d.eta && <span>⏱️ {d.eta} </span>}
                        {d.areas && <span>📍 {d.areas} </span>}
                        {d.note && <span>📝 {d.note}</span>}
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}

            {/* طريقة الدفع */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-2">
              <h3 className="font-black text-sm">💳 طريقة الدفع</h3>
              {hasStorePay ? (
                <>
                  {storeMethods.map(m => {
                    const key = m.type === 'cash' ? 'cash' : `sm:${m.id}`;
                    const icon = m.type === 'cash' ? '💵' : m.type === 'wallet' ? '📱' : m.type === 'bank' ? '🏦' : '💸';
                    return (
                      <label key={m.id} className={`block p-3 rounded-2xl border cursor-pointer transition-all ${payMethod === key ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="pay" checked={payMethod === key} onChange={() => setPayMethod(key)} />
                          <span className="font-bold text-sm">{icon} {m.label}</span>
                          {m.fee > 0 && <span className="text-xs text-gray-400">+{m.fee} رسوم</span>}
                        </div>
                        {payMethod === key && m.type !== 'cash' && (
                          <div className="mt-2 text-xs bg-white rounded-lg p-2 border border-gray-100">
                            {m.account && <p className="font-bold" dir="ltr">📌 {m.account}</p>}
                            {m.accountName && <p className="text-gray-500">👤 {m.accountName}</p>}
                            {m.instructions && <p className="text-gray-500 mt-1">{m.instructions}</p>}
                            <p className="text-amber-600 mt-1">⚠️ حوّل {finalTotal.toLocaleString()} {defSym} ثم ارفع الإثبات بعد تأكيد الطلب</p>
                          </div>
                        )}
                      </label>
                    );
                  })}
                  {cardOption}
                </>
              ) : (
                <>
                  <label className={`flex items-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all ${payMethod === 'cash' ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                    <input type="radio" name="pay" checked={payMethod === 'cash'} onChange={() => setPayMethod('cash')} />
                    <span className="font-bold text-sm">💵 الدفع عند الاستلام</span>
                  </label>
                  {gateways.map(g => (
                    <label key={g.id} className={`block p-3 rounded-2xl border cursor-pointer transition-all ${payMethod === g.id ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="pay" checked={payMethod === g.id} onChange={() => setPayMethod(g.id)} />
                        <span className="font-bold text-sm">{g.provider === 'bank' ? '🏦' : g.provider === 'wallet' ? '📱' : '💳'} {g.name}</span>
                        {g.fee > 0 && <span className="text-xs text-gray-400">+{g.fee} رسوم</span>}
                      </div>
                      {payMethod === g.id && (
                        <div className="mt-2 text-xs bg-white rounded-lg p-2 border border-gray-100">
                          {g.accountInfo && <p className="font-bold">📌 {g.accountInfo}</p>}
                          {g.instructions && <p className="text-gray-500 mt-1">{g.instructions}</p>}
                          <p className="text-amber-600 mt-1">⚠️ حوّل {finalTotal.toLocaleString()} {defSym} ثم ارفع الإثبات بعد تأكيد الطلب</p>
                        </div>
                      )}
                    </label>
                  ))}
                  {cardOption}
                </>
              )}
            </div>

            {/* ملخص المبالغ */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>المجموع ({count} منتج)</span>
                <span>{fmt(total)}</span>
              </div>
              {coupon && (
                <div className="flex justify-between text-xs text-emerald-600 font-bold mb-1">
                  <span>الخصم</span>
                  <span>-{fmt(coupon.discount)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-blue-600 font-bold mb-1">
                  <span>🚚 {selectedDelivery?.label}</span>
                  <span>+{fmt(deliveryFee)}</span>
                </div>
              )}
              {gatewayFee > 0 && (
                <div className="flex justify-between text-xs text-amber-600 font-bold mb-1">
                  <span>رسوم {selectedGateway?.name || selectedStoreMethod?.label}</span>
                  <span>+{fmt(gatewayFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-lg border-t border-gray-100 pt-2 mt-1">
                <span>الإجمالي النهائي</span>
                <span className="price-grad">{fmt(finalTotal)}</span>
              </div>
            </div>

            <button onClick={submitOrder} disabled={sending}
              className="theme-glow w-full py-4 rounded-2xl text-white font-extrabold text-lg shadow-xl disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${primary}, #F59E0B)`, '--tp': primary } as any}>
              {sending ? '⏳ جاري الإرسال...' : '✅ تأكيد الطلب'}
            </button>
            <Link href={`/store/${store.slug}/cart`} className="block text-center text-sm text-gray-400 font-bold">→ رجوع للسلة</Link>
          </div>
        )}
      </div>
    </main>
  );
}
