'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';

// 💬 مولّد رابط واتساب — رسالة جاهزة + رابط قصير + QR
const TEMPLATES = [
  { id: 'order', icon: '🛒', label: 'طلب منتج', msg: 'السلام عليكم 🌹\nأريد طلب: [اسم المنتج]\nالكمية: 1\nالعنوان: ' },
  { id: 'inquiry', icon: '❓', label: 'استفسار', msg: 'السلام عليكم 🌹\nأستفسر عن: \nهل هو متوفر حالياً؟' },
  { id: 'greeting', icon: '👋', label: 'ترحيب', msg: 'السلام عليكم ورحمة الله 🌹' },
  { id: 'custom', icon: '✍️', label: 'رسالتي', msg: '' },
] as const;

export default function WhatsappTool() {
  const [phone, setPhone] = useState('');
  const [tpl, setTpl] = useState<string>('order');
  const [msg, setMsg] = useState<string>(TEMPLATES[0].msg);
  const [link, setLink] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);
  const qr = useRef<any>(null);

  useEffect(() => {
    const p = phone.replace(/[^0-9]/g, '');
    const intl = p ? (p.startsWith('967') ? p : '967' + p.replace(/^0/, '')) : '';
    setLink(intl ? `https://wa.me/${intl}${msg.trim() ? `?text=${encodeURIComponent(msg)}` : ''}` : '');
  }, [phone, msg]);

  useEffect(() => {
    if (!link) { if (qrRef.current) qrRef.current.innerHTML = ''; qr.current = null; return; }
    (async () => {
      const { default: QRCodeStyling } = await import('qr-code-styling');
      const opts = {
        width: 200, height: 200, data: link, margin: 4,
        dotsOptions: { color: '#16A34A', type: 'extra-rounded' as const },
        backgroundOptions: { color: '#ffffff' },
      };
      if (!qr.current) { qr.current = new QRCodeStyling(opts); if (qrRef.current) { qrRef.current.innerHTML = ''; qr.current.append(qrRef.current); } }
      else qr.current.update(opts);
    })();
  }, [link]);

  const copy = () => {
    if (!link) { toast('📱 أدخل الرقم أولاً', 'error'); return; }
    navigator.clipboard.writeText(link).then(() => toast('📋 نُسخ الرابط — الصقه في حالتك أو إعلانك')).catch(() => toast('تعذّر النسخ', 'error'));
  };

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-green-400 placeholder:text-white/30';

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-white/60 block mb-1.5">📱 رقم الواتساب (بكود اليمن أو بدونه)</span>
          <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="777123456" className={`${inp} text-center text-lg font-black`} dir="ltr" />
        </label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => { setTpl(t.id); if (t.id !== 'custom') setMsg(t.msg); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${tpl === t.id ? 'bg-gradient-to-l from-green-600 to-emerald-600 shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <textarea value={msg} onChange={(e) => { setMsg(e.target.value); setTpl('custom'); }} rows={4} placeholder="اكتب رسالتك التي ستصلك جاهزة..." className={inp} />
      </div>

      {link && (
        <div className="rounded-3xl border border-green-400/30 bg-green-400/5 p-5 text-center space-y-4">
          <div>
            <p className="text-xs font-bold text-white/60 mb-2">🔗 رابطك الجاهز</p>
            <p className="text-xs bg-black/30 rounded-xl p-3 break-all text-green-300 font-mono" dir="ltr">{link}</p>
          </div>
          <div ref={qrRef} className="inline-block rounded-2xl overflow-hidden shadow-lg mx-auto" />
          <div className="grid grid-cols-3 gap-2">
            <button onClick={copy} className="py-2.5 rounded-xl bg-gradient-to-l from-green-600 to-emerald-600 font-bold text-sm">📋 نسخ الرابط</button>
            <button onClick={() => qr.current?.download({ name: 'wa-link', extension: 'png' })} className="py-2.5 rounded-xl bg-white/10 font-bold text-sm hover:bg-white/20">⬇️ QR</button>
            <a href={link} target="_blank" rel="noreferrer" className="py-2.5 rounded-xl bg-white/10 font-bold text-sm hover:bg-white/20 grid place-items-center">🧪 تجربة</a>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-green-400/20 bg-green-400/5 p-4 text-xs text-white/70 leading-relaxed">
        💡 <b>فكرة قوية:</b> ضع الرابط في حالة واتساب أو بروفايل إنستقرام — من ينقره تفتح محادثتك ومعه رسالة الطلب جاهزة، فيرسلها بضغطة واحدة. أو اختصر كل ذلك: <a href="/auth/seller-register" className="text-green-300 font-bold underline">افتح متجراً في يمن زون</a> واستقبل طلبات مرتبة تلقائياً 🚀
      </div>
    </div>
  );
}
