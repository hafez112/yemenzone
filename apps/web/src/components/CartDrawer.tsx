'use client';
import { useEffect, useState } from 'react';
import { getCart, saveCart, updateQty, clearCart, cartTotal, cartCount, rememberStoreId, CartItem } from '@/lib/cart';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useCurrency } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// السلة المنزلقة + إتمام الطلب + تأكيد واتساب
export default function CartDrawer({ store, primary }: { store: any; primary: string }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
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
  // 📍 مشاركة موقع العميل مع الطلب (اختياري — بقرار العميل)
  const [shareLoc, setShareLoc] = useState(false);
  const [loc, setLoc] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  // 🎫 بطاقة يمن زون كوسيلة دفع — رصيد العميل وحالة الدفع الفوري
  const [user, setUser] = useState<any>(null);
  const [myCard, setMyCard] = useState<any>(undefined); // undefined=جاري الفحص، null=غير متاحة
  const [doneCard, setDoneCard] = useState(false);
  const [cardPaying, setCardPaying] = useState(false);
  const [cardPaid, setCardPaid] = useState(false);
  const [cardError, setCardError] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const { fmt } = useCurrency(); // 💱 عرض الأسعار بالعملة المختارة

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
        toast('📍 تم تحديد موقعك — سيصل رابطه للبائع مع طلبك');
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
    rememberStoreId(store.slug, store.id); // 🛰️ ربط slug بالمعرّف لمزامنة السلة
    setCart(getCart(store.slug));
    // 💳 بوابات الدفع النشطة (عام)
    api('/v1/payments/gateways?scope=orders').then(setGateways).catch(() => {});
    const u = getUser();
    setUser(u);
    if (u) {
      setForm(f => ({ ...f, customerName: u.name, customerPhone: u.phone }));
      // 🎫 جلب رصيد بطاقة العميل لعرضها ضمن وسائل الدفع
      api('/customer/card').then(d => setMyCard(d.card)).catch(() => setMyCard(null));
    }
    const handler = (e: any) => { if (e.detail.slug === store.slug) setCart(e.detail.items); };
    window.addEventListener('yz-cart', handler);
    const openHandler = () => setOpen(true);
    window.addEventListener('yz-open-cart', openHandler);
    return () => {
      window.removeEventListener('yz-cart', handler);
      window.removeEventListener('yz-open-cart', openHandler);
    };
  }, [store.slug]);

  // 🎫 دفع الطلب ببطاقة يمن زون — خصم من رصيد العميل وإيداع فوري في محفظة البائع
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
        // تحديث الرصيد المعروض محلياً بعد الخصم
        setMyCard((c: any) => (c ? { ...c, balance: Number(c.balance) - orderTotal } : c));
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
    // 🎫 تحقق مسبق عند اختيار بطاقة يمن زون — قبل إنشاء الطلب
    if (payMethod === 'yzcard') {
      if (!user) return toast('⚠️ سجّل دخولك كعميل أولاً لتدفع ببطاقة يمن زون', 'error');
      if (!myCard) return toast('⚠️ تعذر فحص بطاقتك — أعد المحاولة بعد لحظات', 'error');
      if (myCard.isActive === false) return toast('⚠️ بطاقتك موقوفة — تواصل مع الدعم', 'error');
      // الدفع بالبطاقة مرتبط بجوال حساب العميل — الخادم يرفض غير ذلك
      const digits = (s: string) => (s || '').replace(/\D/g, '');
      if (digits(form.customerPhone) !== digits(user.phone || ''))
        return toast('⚠️ الدفع بالبطاقة يتطلب أن يكون جوال الطلب هو جوال حسابك المسجل', 'error');
      if (Number(myCard.balance) < finalTotal)
        return toast(`⚠️ رصيد بطاقتك (${Number(myCard.balance).toLocaleString()}) لا يكفي — اشحنها من صفحة بطاقتك`, 'error');
    }
    setSending(true);
    setDoneCard(false); setCardPaid(false); setCardError(''); setOtpRequired(false); setOtp('');
    try {
      const r = await api(`/v1/orders/${store.slug}`, {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.productId, qty: i.qty, variantId: i.variantId })),
          ...form,
          // 📍 يُرسل فقط إذا اختار العميل مشاركة موقعه ونجح التحديد
          ...(shareLoc && loc ? { customerLat: loc.lat, customerLng: loc.lng } : {}),
          customerId: user?.id,
          couponCode: coupon?.code,
          // 💳 طرق المتجر لها الأولوية — ثم بوابات المنصة، ثم الدفع عند الاستلام
          paymentMethod: payMethod === 'yzcard' ? 'card'
            : payMethod.startsWith('sm:') ? payMethod.replace('sm:', 'store:')
            : payMethod === 'cash' ? 'cash'
            : `gateway:${selectedGateway?.name || payMethod}`,
          deliveryMethodId: deliveryId || undefined,
        }),
      });
      clearCart(store.slug);
      setDone(r);
      setCheckout(false);
      if (payMethod === 'yzcard') {
        // 💳 الدفع الفوري: خصم من العميل + إيداع في محفظة البائع
        setDoneCard(true);
        payOrderWithCard(r.order.id, Number(r.order.total));
        toast(`🎉 تم إرسال طلبك ${r.order.number} — جاري الدفع من بطاقتك`);
      } else {
        toast(`🎉 تم إرسال طلبك ${r.order.number}`);
      }
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  const count = cartCount(cart);
  const total = cartTotal(cart);
  // 💳 طرق المتجر الخاصة (إن ضبطها البائع) لها الأولوية على بوابات المنصة
  const storeMethods: any[] = store.paymentMethods || [];
  const hasStorePay = storeMethods.length > 0;
  const selectedStoreMethod = payMethod.startsWith('sm:') ? storeMethods.find(m => `sm:${m.id}` === payMethod) : null;
  const selectedGateway = gateways.find(g => g.id === payMethod);
  const gatewayFee = selectedGateway?.fee || selectedStoreMethod?.fee || 0;
  // 🚚 طريقة التوصيل المختارة من طرق المتجر
  const deliveryMethods: any[] = store.deliveryMethods || [];
  const selectedDelivery = deliveryMethods.find(d => d.id === deliveryId);
  const deliveryFee = selectedDelivery?.fee || 0;
  const finalTotal = (coupon ? Math.max(0, total - coupon.discount) : total) + gatewayFee + deliveryFee;
  // طريقة تتطلب إثبات تحويل: كل ما عدا النقدي وبطاقة يمن زون (خصم فوري بلا إثبات)
  const needsProof = payMethod !== 'cash' && payMethod !== 'yzcard' && payMethod !== '' && (!selectedStoreMethod || selectedStoreMethod.type !== 'cash');

  // 🎫 خيار بطاقة يمن زون — وسيلة دفع عامة تظهر مع كل الطرق
  const cardBalance = myCard ? Number(myCard.balance) : null;
  const cardEnough = cardBalance !== null && cardBalance >= finalTotal;
  const cardUnavailable = user && myCard === null; // حساب غير عميل أو تعذر الجلب
  const cardOption = (
    <label className={`block p-3 rounded-xl border cursor-pointer ${payMethod === 'yzcard' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2">
        <input type="radio" name="pay" checked={payMethod === 'yzcard'} onChange={() => setPayMethod('yzcard')} />
        <span className="font-bold text-sm flex-1">🎫 بطاقة يمن زون <span className="text-[10px] text-teal-600 font-extrabold">— دفع فوري من رصيدك</span></span>
        {user && cardBalance !== null && (
          <span className={`text-[11px] font-extrabold ${cardEnough ? 'text-teal-600' : 'text-red-500'}`}>
            {cardBalance.toLocaleString()} ر.ي
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
            <p className="text-teal-700 font-bold">✅ سيُخصم {finalTotal.toLocaleString()} ر.ي من رصيدك فور تأكيد الطلب ويُضاف لمحفظة البائع مباشرة — بلا إثبات تحويل</p>
          )}
        </div>
      )}
    </label>
  );

  // 📤 رفع إثبات الدفع
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
          // طريقة المتجر تُرسل بمعرفها الخاص، وبوابة المنصة بمعرفها
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

  // 🎟️ التحقق من الكوبون
  async function applyCoupon() {
    if (!couponCode.trim()) return;
    try {
      const r = await api('/v1/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode.trim(), storeSlug: store.slug, total }),
      });
      setCoupon(r);
      toast(`🎟️ ${r.label} — وفّرت ${r.discount.toLocaleString()} ر.ي`);
    } catch (e: any) {
      setCoupon(null);
      toast(e.message, 'error');
    }
  }

  return (
    <>
      {/* زر السلة العائم */}
      {count > 0 && !open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full text-white font-extrabold shadow-2xl anim-bounce-in anim-pulse-glow"
          style={{ background: primary }}>
          🛒 السلة
          <span className="bg-white text-gray-900 w-6 h-6 rounded-full text-sm font-black flex items-center justify-center">{count}</span>
        </button>
      )}

      {/* السلة المنزلقة */}
      {open && (
        <div className="fixed inset-0 z-[70]" onClick={() => { setOpen(false); setDone(null); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col anim-slide-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-black text-lg">🛒 سلة المشتريات</h2>
              <button onClick={() => { setOpen(false); setDone(null); }} className="w-9 h-9 rounded-full bg-gray-100">✕</button>
            </div>

            {done ? (
              // نجاح الطلب + تأكيد واتساب
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl mb-4 anim-float">🎉</div>
                <h3 className="font-black text-xl mb-1">تم استلام طلبك!</h3>
                <p className="text-gray-500 text-sm mb-1">رقم الطلب: <span className="font-black text-purple-600" dir="ltr">{done.order.number}</span></p>
                <p className="text-gray-400 text-xs mb-6">سيظهر الطلب في لوحة تحكمك — ولتأكيد أسرع أرسله لواتساب البائع</p>
                {doneCard && (
                  <div className="w-full bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-3 text-right">
                    {cardPaying && <p className="font-extrabold text-sm text-teal-700">⏳ جاري الخصم من بطاقتك وإيداع المبلغ في محفظة البائع...</p>}
                    {cardPaid && (
                      <p className="font-extrabold text-sm text-emerald-600">✅ تم الدفع من بطاقتك — أُضيف {Number(done.order.total).toLocaleString()} ر.ي لمحفظة البائع وطلبك قيد التجهيز</p>
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
                    className="w-full py-4 rounded-2xl bg-green-500 text-white font-extrabold text-lg shadow-xl anim-pulse-glow mb-3">
                    💬 تأكيد الطلب عبر واتساب
                  </a>
                )}
                <a href={`/track?number=${encodeURIComponent(done.order.number)}&phone=${encodeURIComponent(form.customerPhone)}`}
                  className="w-full py-3 rounded-2xl border-2 font-extrabold text-sm mb-3 flex items-center justify-center gap-1"
                  style={{ borderColor: primary, color: primary }}>
                  🔍 تتبع حالة طلبك
                </a>
                <button onClick={() => { setDone(null); setOpen(false); }}
                  className="text-sm text-gray-400 font-bold">متابعة التسوق ←</button>
              </div>
            ) : !checkout ? (
              // محتوى السلة
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                      <div className="text-5xl mb-3">🛒</div>
                      السلة فارغة — أضف منتجات من المتجر
                    </div>
                  )}
                  {cart.map(i => (
                    <div key={i.productId + (i.variantId || '')} className="flex gap-3 items-center bg-gray-50 rounded-2xl p-3">
                      <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-2xl"
                        style={i.image ? { background: `url(${API}${i.image}) center/cover` } : { background: 'linear-gradient(135deg,#ede9fe,#ccfbf1)' }}>
                        {!i.image && '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{i.name}</div>
                        {i.variant && <div className="text-[11px] font-bold" style={{ color: primary }}>🎨 {i.variant}</div>}
                        <div className="text-sm font-black" style={{ color: primary }}>
                          {fmt(i.price * i.qty)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCart(updateQty(store.slug, i.productId, i.qty - 1, i.variantId))}
                          className="w-7 h-7 rounded-full bg-white shadow font-black">−</button>
                        <span className="w-7 text-center font-bold text-sm">{i.qty}</span>
                        <button onClick={() => setCart(updateQty(store.slug, i.productId, i.qty + 1, i.variantId))}
                          className="w-7 h-7 rounded-full bg-white shadow font-black">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                {cart.length > 0 && (
                  <div className="p-4 border-t space-y-3">
                    <div className="flex justify-between font-black text-lg">
                      <span>الإجمالي</span>
                      <span style={{ color: primary }}>{fmt(total)}</span>
                    </div>

                    {/* 🔗 اشترِ مع صديق — مشاركة السلة برابط */}
                    <button onClick={async () => {
                      const payload = btoa(unescape(encodeURIComponent(JSON.stringify(
                        cart.map(i => ({ i: i.productId, q: i.qty }))
                      ))));
                      const link = `${window.location.origin}/store/${store.slug}?cart=${payload}`;
                      const text = `🛒 سلة جاهزة لك في ${store.name} — أكمل طلبك من الرابط:\n${link}`;
                      try {
                        await navigator.clipboard.writeText(text);
                        toast('🔗 نُسخ رابط السلة — أرسله لصديقك ويستلمها جاهزة!');
                      } catch { toast('⚠️ انسخ يدوياً', 'error'); }
                    }}
                      className="w-full py-2.5 rounded-2xl font-extrabold text-sm bg-teal-50 text-teal-700 border border-teal-200 transition-all hover:bg-teal-100">
                      🔗 اشترِ مع صديق — شارك السلة برابط
                    </button>

                    <button onClick={() => {
                        // تهيئة الاختيارات من طرق المتجر عند فتح إتمام الطلب
                        const sms: any[] = store.paymentMethods || [];
                        if (sms.length) {
                          const firstCash = sms.find(m => m.type === 'cash');
                          setPayMethod(firstCash ? 'cash' : `sm:${sms[0].id}`);
                        }
                        const dms: any[] = store.deliveryMethods || [];
                        if (dms.length) setDeliveryId(dms[0].id);
                        setCheckout(true);
                      }}
                      disabled={!!store.pausedAt}
                      className="w-full py-4 rounded-2xl text-white font-extrabold text-lg shadow-xl disabled:opacity-50 disabled:grayscale"
                      style={{ background: store.pausedAt ? '#b45309' : primary }}>
                      {store.pausedAt ? '⏸️ مغلق مؤقتاً — لا يستقبل طلبات' : 'إتمام الطلب ←'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              // نموذج إتمام الطلب
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <h3 className="font-black">📝 بيانات التوصيل</h3>
                <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
                  placeholder="الاسم الكامل *"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="رقم الجوال *" dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="العنوان (المحافظة — الحي)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />

                {/* 📍 مشاركة الموقع — اختياري بقرار العميل */}
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
                          <p className="text-teal-700">✅ تُحِدّ موقعك بدقة ±{loc.acc}م — يصل رابطه للبائع ومنه للسائق</p>
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
                  placeholder="ملاحظات للبائع (اختياري)" rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                {/* 🎟️ حقل الكوبون */}
                <div className="flex gap-2">
                  <input value={couponCode} onChange={e => setCouponCode(e.target.value)}
                    placeholder="كوبون الخصم 🎟️" dir="ltr"
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
                <div className="bg-gray-50 rounded-2xl p-3 text-sm">
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
                  <div className="flex justify-between font-black text-lg">
                    <span>الإجمالي النهائي</span>
                    <span style={{ color: primary }}>{fmt(finalTotal)}</span>
                  </div>
                </div>

                {/* 🚚 طريقة التوصيل — طرق المتجر الخاصة */}
                {deliveryMethods.length > 0 && (
                  <>
                    <h3 className="font-black pt-1">🚚 طريقة التوصيل</h3>
                    <div className="space-y-2">
                      {deliveryMethods.map(d => (
                        <label key={d.id} className={`block p-3 rounded-xl border cursor-pointer ${deliveryId === d.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-2">
                            <input type="radio" name="delivery" checked={deliveryId === d.id} onChange={() => setDeliveryId(d.id)} />
                            <span className="font-bold text-sm flex-1">{d.label}</span>
                            <span className="text-xs font-extrabold" style={{ color: primary }}>{d.fee > 0 ? `+${d.fee.toLocaleString()} ر.ي` : 'مجاني'}</span>
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
                  </>
                )}

                {/* 💳 طريقة الدفع — طرق المتجر أولاً، وإلا بوابات المنصة */}
                <h3 className="font-black pt-1">💳 طريقة الدفع</h3>
                <div className="space-y-2">
                  {hasStorePay ? (
                    <>
                    {storeMethods.map(m => {
                      const key = m.type === 'cash' ? 'cash' : `sm:${m.id}`;
                      const icon = m.type === 'cash' ? '💵' : m.type === 'wallet' ? '📱' : m.type === 'bank' ? '🏦' : '💸';
                      return (
                        <label key={m.id} className={`block p-3 rounded-xl border cursor-pointer ${payMethod === key ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
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
                              <p className="text-amber-600 mt-1">⚠️ حوّل {finalTotal.toLocaleString()} ر.ي ثم ارفع الإثبات بعد تأكيد الطلب</p>
                            </div>
                          )}
                        </label>
                      );
                    })}
                    {cardOption}
                    </>
                  ) : (
                    <>
                      <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer ${payMethod === 'cash' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                        <input type="radio" name="pay" checked={payMethod === 'cash'} onChange={() => setPayMethod('cash')} />
                        <span className="font-bold text-sm">💵 الدفع عند الاستلام</span>
                      </label>
                      {gateways.map(g => (
                        <label key={g.id} className={`block p-3 rounded-xl border cursor-pointer ${payMethod === g.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-2">
                            <input type="radio" name="pay" checked={payMethod === g.id} onChange={() => setPayMethod(g.id)} />
                            <span className="font-bold text-sm">{g.provider === 'bank' ? '🏦' : g.provider === 'wallet' ? '📱' : '💳'} {g.name}</span>
                            {g.fee > 0 && <span className="text-xs text-gray-400">+{g.fee} رسوم</span>}
                          </div>
                          {payMethod === g.id && (
                            <div className="mt-2 text-xs bg-white rounded-lg p-2 border border-gray-100">
                              {g.accountInfo && <p className="font-bold">📌 {g.accountInfo}</p>}
                              {g.instructions && <p className="text-gray-500 mt-1">{g.instructions}</p>}
                              <p className="text-amber-600 mt-1">⚠️ حوّل {finalTotal.toLocaleString()} ر.ي ثم ارفع الإثبات بعد تأكيد الطلب</p>
                            </div>
                          )}
                        </label>
                      ))}
                      {cardOption}
                    </>
                  )}
                </div>
                <button onClick={submitOrder} disabled={sending}
                  className="w-full py-4 rounded-2xl text-white font-extrabold text-lg shadow-xl disabled:opacity-40"
                  style={{ background: primary }}>
                  {sending ? '⏳ جاري الإرسال...' : '✅ تأكيد الطلب'}
                </button>
                <button onClick={() => setCheckout(false)} className="w-full text-sm text-gray-400 font-bold">→ رجوع للسلة</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
