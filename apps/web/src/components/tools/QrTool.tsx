'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { fileToDataUrl } from './pdfHelper';

// 📱 مولّد QR فني — تدرجات ونقاط فنية وشعار في المنتصف (qr-code-styling)
export default function QrTool() {
  const [type, setType] = useState<'text' | 'link' | 'wa' | 'wifi' | 'phone'>('link');
  const [val, setVal] = useState('');
  const [pass, setPass] = useState('');
  const [color, setColor] = useState('#7C3AED');
  const [bg, setBg] = useState('#FFFFFF');
  const [dots, setDots] = useState<'square' | 'rounded' | 'extra-rounded' | 'dots' | 'classy' | 'classy-rounded'>('extra-rounded');
  const [logo, setLogo] = useState('');
  const [size, setSize] = useState(320);
  const boxRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<any>(null);

  const buildData = () => {
    const v = val.trim();
    if (!v) return '';
    switch (type) {
      case 'link': return /^https?:\/\//i.test(v) ? v : `https://${v}`;
      case 'wa': { const p = v.replace(/[^0-9]/g, ''); return `https://wa.me/${p.startsWith('967') ? p : '967' + p.replace(/^0/, '')}`; }
      case 'phone': return `tel:${v.replace(/[^0-9+]/g, '')}`;
      case 'wifi': return `WIFI:T:WPA;S:${v};P:${pass};;`;
      default: return v;
    }
  };

  useEffect(() => {
    const data = buildData() || 'https://yemenzone1.com';
    let cancelled = false;
    (async () => {
      const { default: QRCodeStyling } = await import('qr-code-styling');
      if (cancelled) return;
      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling({
          width: size, height: size, data, margin: 8,
          dotsOptions: { color, type: dots },
          backgroundOptions: { color: bg },
          cornersSquareOptions: { type: 'extra-rounded', color },
          cornersDotOptions: { color },
          imageOptions: { crossOrigin: 'anonymous', margin: 6, imageSize: 0.35 },
          image: logo || undefined,
        });
        qrRef.current.append(boxRef.current);
      } else {
        qrRef.current.update({
          width: size, height: size, data,
          dotsOptions: { color, type: dots },
          backgroundOptions: { color: bg },
          cornersSquareOptions: { type: 'extra-rounded', color },
          cornersDotOptions: { color },
          image: logo || undefined,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [val, pass, type, color, bg, dots, logo, size]);

  const download = (ext: 'png' | 'svg' | 'jpeg') => {
    if (!buildData()) { toast('✍️ أدخل المحتوى أولاً', 'error'); return; }
    qrRef.current?.download({ name: 'yemenzone-qr', extension: ext });
    toast(`✅ تم تنزيل QR بصيغة ${ext.toUpperCase()}`);
  };

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-purple-400 placeholder:text-white/30';
  const TYPES = [
    { id: 'link', icon: '🔗', label: 'رابط', ph: 'example.com' },
    { id: 'wa', icon: '💬', label: 'واتساب', ph: '777123456' },
    { id: 'phone', icon: '📞', label: 'اتصال', ph: '777123456' },
    { id: 'wifi', icon: '📶', label: 'واي فاي', ph: 'اسم الشبكة' },
    { id: 'text', icon: '📝', label: 'نص', ph: 'أي نص تريده' },
  ] as const;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {TYPES.map((t) => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${type === t.id ? 'bg-gradient-to-l from-purple-600 to-fuchsia-600 shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={TYPES.find((t) => t.id === type)!.ph} className={inp} dir={type === 'text' ? 'rtl' : 'ltr'} />
          {type === 'wifi' && <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="كلمة مرور الشبكة" className={`${inp} mt-2`} dir="ltr" />}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h3 className="font-extrabold text-sm">🎨 التخصيص الفني</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-white/60">لون الرمز
              <div className="flex gap-2 mt-1 items-center">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" />
                <div className="flex gap-1">{['#7C3AED', '#0F172A', '#059669', '#DC2626', '#2563EB', '#D97706'].map((c) => (
                  <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full border-2 border-white/20" style={{ background: c }} />))}</div>
              </div>
            </label>
            <label className="text-xs font-bold text-white/60">لون الخلفية
              <div className="flex gap-2 mt-1 items-center">
                <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" />
              </div>
            </label>
          </div>
          <div>
            <span className="text-xs font-bold text-white/60 block mb-1.5">نمط النقاط</span>
            <div className="flex flex-wrap gap-2">
              {([['extra-rounded', '⬤ ناعم'], ['rounded', '◉ دائري'], ['dots', '⋯ نقاط'], ['classy-rounded', '◆ كلاسيكي'], ['square', '◼ مربع']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setDots(v as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${dots === v ? 'bg-purple-600' : 'bg-white/10 text-white/70'}`}>{l}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="w-14 h-14 rounded-xl bg-white/10 border border-dashed border-white/25 grid place-items-center overflow-hidden hover:border-purple-400 transition-colors">
              {logo ? <img src={logo} className="w-full h-full object-cover" alt="" /> : '🖼️'}
            </span>
            <span className="text-xs font-bold text-white/70">شعارك في المنتصف (اختياري){logo && <button onClick={(e) => { e.preventDefault(); setLogo(''); }} className="text-red-400 mr-2">إزالة ✕</button>}</span>
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setLogo(await fileToDataUrl(f)); toast('✅ أُضيف الشعار'); } }} />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <div ref={boxRef} className="inline-block rounded-2xl overflow-hidden shadow-2xl mx-auto" />
          <div className="mt-4">
            <input type="range" min={220} max={600} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-purple-500" />
            <p className="text-[11px] text-white/50 mt-1">الدقة: {size}×{size} بكسل — كبّرها للطباعة عالية الجودة</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button onClick={() => download('png')} className="py-2.5 rounded-xl bg-gradient-to-l from-purple-600 to-fuchsia-600 font-bold text-sm">⬇️ PNG</button>
            <button onClick={() => download('svg')} className="py-2.5 rounded-xl bg-white/10 font-bold text-sm hover:bg-white/20">⬇️ SVG</button>
            <button onClick={() => download('jpeg')} className="py-2.5 rounded-xl bg-white/10 font-bold text-sm hover:bg-white/20">⬇️ JPG</button>
          </div>
        </div>
        <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-4 text-xs text-white/70 leading-relaxed">
          💡 <b>للمطاعم:</b> اصنع QR لمنيو متجرك في يمن زون والصقه على الطاولات — الزبون يمسحه فيطلب مباشرة. <a href="/auth/seller-register" className="text-purple-300 font-bold underline">افتح مطعمك مجاناً</a>
        </div>
      </div>
    </div>
  );
}
