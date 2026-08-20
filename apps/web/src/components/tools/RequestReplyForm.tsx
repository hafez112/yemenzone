'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 💬 نموذج رد التاجر على طلب — يُراجع قبل الظهور
export default function RequestReplyForm({ slug }: { slug: string }) {
  const [sellerName, setSellerName] = useState('');
  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const send = async () => {
    if (sellerName.trim().length < 2) { toast('✍️ أدخل اسمك أو اسم محلك', 'error'); return; }
    if (message.trim().length < 10) { toast('📝 اكتب عرضك بوضوح (10 أحرف على الأقل)', 'error'); return; }
    if (whatsapp.replace(/[^0-9]/g, '').length < 7) { toast('💬 أدخل رقم واتساب صحيحاً', 'error'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/v1/tools/requests/${slug}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerName: sellerName.trim(), message: message.trim(),
          price: price ? Number(price) : undefined, whatsapp: whatsapp.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'تعذّر الإرسال');
      setDone(true);
      toast('🎉 ' + (d.message || 'أُرسل ردك'));
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <p className="font-extrabold text-emerald-800 mb-1">وصل ردك للإدارة</p>
        <p className="text-xs text-emerald-600">سيظهر عرضك تحت الطلب بعد المراجعة — والطالب قد يتواصل معك واتساب</p>
      </div>
    );
  }

  const inp = 'w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-orange-400 focus:outline-none transition-colors';

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 space-y-3">
      <h3 className="font-extrabold text-sm text-gray-900">💬 عندك ما يبحث عنه؟ ردّ بعرضك</h3>
      <div className="grid grid-cols-2 gap-2">
        <input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="اسمك / اسم محلك" className={inp} maxLength={60} />
        <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="سعرك (اختياري)" className={inp} />
      </div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="عرضك: المواصفات، الحالة، التوصيل..." className={inp + ' min-h-20 resize-y'} maxLength={500} />
      <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9+]/g, ''))} inputMode="tel" placeholder="واتسابك — يتواصل معك الطالب عليه" className={inp} dir="ltr" style={{ textAlign: 'right' }} />
      <button onClick={send} disabled={busy}
        className="w-full py-3 rounded-xl bg-gradient-to-l from-orange-500 to-amber-500 text-white font-extrabold text-sm shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50">
        {busy ? '⏳ جارٍ الإرسال...' : '📤 أرسل عرضك'}
      </button>
      <p className="text-[11px] text-gray-500 text-center">يُراجع ردك قبل الظهور · 🔒 رقمك يظهر فقط للطالب عند الرد</p>
    </div>
  );
}
