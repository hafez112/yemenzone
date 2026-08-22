'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { loadCurrencies } from '@/lib/currency';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🖼️ بطاقة مشاركة المنتج — من رابط بالمنصة أو يدوياً → تصميم احترافي PNG للحالات والقروبات
interface CardData {
  img: HTMLImageElement | null;
  name: string;
  price: string;
  salePrice: string;
  currency: string;
  store: string;
  link: string;
}

const TEMPLATES = [
  { id: 'dark', label: '🌙 داكن فاخر', bg1: '#0f0a1e', bg2: '#1e1b4b', text: '#ffffff', sub: 'rgba(255,255,255,.65)', accent: '#FBBF24', chip: 'rgba(255,255,255,.1)' },
  { id: 'light', label: '☀️ فاتح أنيق', bg1: '#faf7f2', bg2: '#f3ead9', text: '#1f2937', sub: 'rgba(31,41,55,.6)', accent: '#B45309', chip: 'rgba(31,41,55,.07)' },
  { id: 'fire', label: '🔥 عرض ناري', bg1: '#7f1d1d', bg2: '#dc2626', text: '#ffffff', sub: 'rgba(255,255,255,.75)', accent: '#FDE047', chip: 'rgba(255,255,255,.14)' },
];

const CARD_SIZES = [
  { id: 'sq', label: '⬛ مربع', w: 1080, h: 1080, tag: 'حالة واتساب · منشور' },
  { id: 'st', label: '📱 ستوري', w: 1080, h: 1920, tag: 'ستوري · ريلز' },
];

// 💱 رموز العملات من عملات الإدارة — تُحمّل مرة وتُحدَّث دورياً
let CUR_SYMS: Record<string, string> = { YER: 'ر.ي' };
loadCurrencies().then((list) => {
  CUR_SYMS = Object.fromEntries(list.map((c) => [c.code, c.symbol]));
}).catch(() => {});
const curLabel = (c: string) => CUR_SYMS[String(c || 'YER').toUpperCase()] || c || 'ر.ي';

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 2): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function coverDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height, tr = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > tr) { sw = img.height * tr; sx = (img.width - sw) / 2; } else { sh = img.width / tr; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// 🎨 رسم البطاقة كاملة
async function drawCard(cv: HTMLCanvasElement, d: CardData, tpl: (typeof TEMPLATES)[0], W: number, H: number) {
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.direction = 'rtl';

  // الخلفية
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, tpl.bg1); g.addColorStop(1, tpl.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // زخارف خافتة
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = tpl.text;
  ctx.beginPath(); ctx.arc(W * 0.1, H * 0.06, W * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.92, H * 0.94, W * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  const pad = W * 0.06;
  const imgH = tpl.id === 'fire' ? H * 0.46 : H * (H > W ? 0.5 : 0.48);

  // 🖼️ صورة المنتج
  ctx.save();
  ctx.beginPath(); ctx.roundRect(pad, pad, W - 2 * pad, imgH, W * 0.035); ctx.clip();
  if (d.img) {
    coverDraw(ctx, d.img, pad, pad, W - 2 * pad, imgH);
  } else {
    const ig = ctx.createLinearGradient(pad, pad, W - pad, pad + imgH);
    ig.addColorStop(0, tpl.chip); ig.addColorStop(1, tpl.bg2);
    ctx.fillStyle = ig; ctx.fillRect(pad, pad, W - 2 * pad, imgH);
    ctx.font = `${W * 0.18}px Cairo, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🛍️', W / 2, pad + imgH / 2);
  }
  ctx.restore();
  // إطار ناعم للصورة
  ctx.strokeStyle = tpl.chip; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(pad, pad, W - 2 * pad, imgH, W * 0.035); ctx.stroke();

  // 🔥 شارة الخصم
  const price = Number(d.price) || 0;
  const sale = Number(d.salePrice) || 0;
  const hasDisc = sale > 0 && sale < price;
  if (hasDisc) {
    const pct = Math.round((1 - sale / price) * 100);
    ctx.save();
    ctx.translate(W - pad - W * 0.02, pad + W * 0.02);
    ctx.rotate(-0.08);
    const bw = W * 0.22, bh = W * 0.085;
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = tpl.id === 'light' ? '#DC2626' : '#FBBF24';
    ctx.beginPath(); ctx.roundRect(-bw, -bh / 2, bw, bh, bh / 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = tpl.id === 'light' ? '#ffffff' : '#111827';
    ctx.font = `900 ${W * 0.038}px Cairo, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`خصم ${pct}% 🔥`, -bw / 2, 2);
    ctx.restore();
  }

  // ✍️ الاسم
  let y = pad + imgH + H * 0.035;
  const nameSize = W * (H > W ? 0.056 : 0.05);
  ctx.fillStyle = tpl.text;
  ctx.font = `900 ${nameSize}px Cairo, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const lines = d.name.trim() ? wrapText(ctx, d.name.trim(), W - 2 * pad) : ['اسم المنتج'];
  for (const ln of lines) { y += nameSize * 1.25; ctx.fillText(ln, W / 2, y); }

  // 💰 السعر
  y += H * 0.02;
  const mainPrice = hasDisc ? sale : price;
  const priceTxt = `${mainPrice.toLocaleString()} ${curLabel(d.currency)}`;
  const priceSize = W * (H > W ? 0.095 : 0.085);
  ctx.font = `900 ${priceSize}px Cairo, sans-serif`;
  const pw = ctx.measureText(priceTxt).width;
  let oldW = 0;
  const oldTxt = hasDisc ? `${price.toLocaleString()}` : '';
  if (hasDisc) { ctx.font = `700 ${priceSize * 0.45}px Cairo, sans-serif`; oldW = ctx.measureText(oldTxt).width; }
  const totalW = pw + (hasDisc ? oldW + W * 0.03 : 0);
  let px = W / 2 - totalW / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = tpl.accent;
  ctx.font = `900 ${priceSize}px Cairo, sans-serif`;
  ctx.fillText(priceTxt, px, y + priceSize * 0.8);
  if (hasDisc) {
    px += pw + W * 0.03;
    ctx.fillStyle = tpl.sub;
    ctx.font = `700 ${priceSize * 0.45}px Cairo, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(oldTxt, px, y + priceSize * 0.72);
    ctx.strokeStyle = tpl.sub; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px - 4, y + priceSize * 0.5); ctx.lineTo(px + oldW + 4, y + priceSize * 0.42); ctx.stroke();
  }

  // 🏪 المتجر
  if (d.store.trim()) {
    y += priceSize * 0.95 + H * 0.018;
    ctx.font = `800 ${W * 0.032}px Cairo, sans-serif`;
    const st = `🏪 ${d.store.trim()}`;
    ctx.textAlign = 'center';
    const sw = ctx.measureText(st).width + W * 0.05;
    ctx.fillStyle = tpl.chip;
    ctx.beginPath(); ctx.roundRect(W / 2 - sw / 2, y - W * 0.03, sw, W * 0.055, W * 0.028); ctx.fill();
    ctx.fillStyle = tpl.text;
    ctx.textBaseline = 'middle';
    ctx.fillText(st, W / 2, y);
  }

  // 📱 QR + الرابط — أسفل البطاقة
  const qrSize = W * 0.17;
  const qrX = pad, qrY = H - pad - qrSize;
  try {
    const { default: QRCodeStyling } = await import('qr-code-styling');
    const qr = new QRCodeStyling({
      width: 300, height: 300, data: d.link || 'https://yemenzone1.com', margin: 2,
      dotsOptions: { color: '#111827', type: 'rounded' },
      backgroundOptions: { color: '#ffffff' },
      cornersSquareOptions: { type: 'extra-rounded', color: '#111827' },
    });
    const blob = await qr.getRawData('png');
    if (blob) {
      const bmp = await createImageBitmap(blob as Blob);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 18); ctx.fill();
      ctx.drawImage(bmp, qrX, qrY, qrSize, qrSize);
    }
  } catch { /* QR اختياري — لا يُفشل البطاقة */ }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = tpl.text;
  ctx.font = `900 ${W * 0.034}px Cairo, sans-serif`;
  ctx.fillText('امسح للطلب 📲', qrX + qrSize + W * 0.04, qrY + qrSize * 0.42);
  ctx.fillStyle = tpl.sub;
  ctx.font = `700 ${W * 0.026}px Cairo, sans-serif`;
  const shortLink = (d.link || 'yemenzone1.com').replace(/^https?:\/\//, '').slice(0, 38);
  ctx.fillText(shortLink, qrX + qrSize + W * 0.04, qrY + qrSize * 0.72, W - qrX - qrSize - W * 0.04 - pad);

  // ⚡ ختم المنصة
  ctx.textAlign = 'right';
  ctx.fillStyle = tpl.sub;
  ctx.font = `800 ${W * 0.026}px Cairo, sans-serif`;
  ctx.fillText('⚡ يمن زون', W - pad, H - pad + W * 0.01);
}

export default function ShareCardTool() {
  const [curs, setCurs] = useState<{ code: string; name: string; symbol: string }[]>([]);
  const [data, setData] = useState<CardData>({ img: null, name: '', price: '', salePrice: '', currency: 'YER', store: '', link: '' });
  const [urlInput, setUrlInput] = useState('');
  const [tpl, setTpl] = useState(TEMPLATES[0]);
  const [sz, setSz] = useState(CARD_SIZES[0]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadCurrencies().then((list) => {
      setCurs(list);
      const def = list.find((c) => c.isDefault);
      if (def) setData((d) => (d.currency === 'YER' ? { ...d, currency: def.code } : d));
    }).catch(() => {});
  }, []);

  const redraw = useCallback(() => {
    const cv = cvRef.current;
    if (cv) drawCard(cv, data, tpl, sz.w, sz.h);
  }, [data, tpl, sz]);

  useEffect(() => { redraw(); }, [redraw]);

  // 🔗 تعبئة تلقائية من ?url= (قادمة من صفحات المنتجات أو «بع برابط واحد»)
  useEffect(() => {
    const u = new URLSearchParams(location.search).get('url');
    if (u) { setUrlInput(u); loadFromUrl(u); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadImg = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });

  // 🔍 تحليل الرابط: /store/:slug/product/:id أو /q/:slug
  const loadFromUrl = async (raw: string) => {
    const u = String(raw || '').trim();
    if (!u) { toast('الصق رابط المنتج أولاً', 'error'); return; }
    setLoading(true);
    try {
      const qs = u.match(/\/q\/([a-z0-9]+)/i);
      const sp = u.match(/\/store\/([\w-]+)\/product\/([\w-]+)/i);
      if (qs) {
        const r = await fetch(`${API}/api/v1/tools/quick-sell/${qs[1]}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'الصفحة غير موجودة');
        const img = d.images?.[0] ? await loadImg(`${API}${d.images[0]}`) : null;
        setData({
          img, name: d.name, price: String(Number(d.price)), salePrice: '', currency: d.currency || 'YER',
          store: '', link: `${location.origin}/q/${d.slug}`,
        });
      } else if (sp) {
        const r = await fetch(`${API}/api/v1/storefront/${sp[1]}/product/${sp[2]}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'المنتج غير موجود');
        const p = d.product, st = d.store;
        const img = p.images?.[0] ? await loadImg(`${API}${p.images[0]}`) : null;
        setData({
          img, name: p.name, price: String(Number(p.price)), salePrice: p.salePrice ? String(Number(p.salePrice)) : '',
          currency: p.currency || 'YER', store: st?.name || '', link: `${location.origin}/store/${sp[1]}/product/${sp[2]}`,
        });
      } else throw new Error('الرابط غير معروف — الصق رابط منتج من يمن زون أو صفحة «بع برابط واحد»');
      toast('✨ تعبّأت البطاقة من الرابط — عدّل ما تشاء');
    } catch (e: any) { toast(e.message, 'error'); }
    setLoading(false);
  };

  // 🖼️ رفع صورة يدوياً (داخل المتصفح فقط)
  const uploadImg = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('ملفات الصور فقط', 'error'); return; }
    const rd = new FileReader();
    rd.onload = async () => {
      const im = await loadImg(String(rd.result));
      if (im) { setData((d) => ({ ...d, img: im })); toast('🖼️ أُضيفت صورة المنتج'); }
    };
    rd.readAsDataURL(f);
  };

  const upd = (patch: Partial<CardData>) => setData((d) => ({ ...d, ...patch }));

  // 💾 تصدير PNG
  const download = async () => {
    if (!data.name.trim()) { toast('✍️ أدخل اسم المنتج أولاً', 'error'); return; }
    setBusy(true);
    try {
      const cv = document.createElement('canvas');
      await drawCard(cv, data, tpl, sz.w, sz.h);
      const a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = `بطاقة-${data.name.trim().slice(0, 20)}-${sz.w}x${sz.h}.png`;
      a.click();
      toast('🖼️ حُفظت البطاقة PNG — شاركها في حالتك وقروباتك');
    } catch {
      toast('تعذّر التصدير — صورة الرابط محمية بالمتصفح، ارفعها يدوياً بزر «صورة من جهازك»', 'error');
    }
    setBusy(false);
  };

  // 📤 مشاركة مباشرة (الأجهزة الداعمة)
  const share = async () => {
    if (!data.name.trim()) { toast('✍️ أدخل اسم المنتج أولاً', 'error'); return; }
    try {
      const cv = document.createElement('canvas');
      await drawCard(cv, data, tpl, sz.w, sz.h);
      const blob: Blob | null = await new Promise((r) => cv.toBlob(r, 'image/png'));
      if (!blob) throw new Error('x');
      const file = new File([blob], 'بطاقة-منتج.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: data.name });
        toast('📤 تمت المشاركة');
      } else { toast('جهازك لا يدعم المشاركة المباشرة — استخدم زر التنزيل', 'error'); }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast('تعذّرت المشاركة — جرّب التنزيل', 'error');
    }
  };

  const inp = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-indigo-400/60 focus:outline-none transition-colors';
  const chip = (on: boolean) =>
    `px-3 py-2 rounded-xl text-xs font-bold border transition-all ${on ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/25' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`;

  return (
    <div className="space-y-5">
      {/* 🔗 التعبئة من رابط */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-extrabold text-sm mb-2">🔗 عبّئها تلقائياً من رابط منتج</h3>
        <div className="flex gap-2">
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="الصق رابط منتج من يمن زون أو صفحة /q/..." className={inp} dir="ltr" style={{ textAlign: 'left' }} />
          <button onClick={() => loadFromUrl(urlInput)} disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-indigo-500 font-extrabold text-sm shrink-0 hover:bg-indigo-400 transition-colors disabled:opacity-50">
            {loading ? '⏳' : '✨ جلب'}
          </button>
        </div>
        <p className="text-[11px] text-white/50 mt-2">يدعم روابط منتجات المتاجر وروابط «بع برابط واحد» — الاسم والسعر والصورة والمتجر تُملأ تلقائياً</p>
      </div>

      {/* 🎥 المعاينة */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="grid place-items-center bg-black/40 rounded-xl p-3">
          <canvas ref={cvRef} className="rounded-xl max-w-full h-auto shadow-2xl" style={{ maxHeight: 480 }} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {CARD_SIZES.map((s) => (
            <button key={s.id} onClick={() => setSz(s)} className={chip(sz.id === s.id)}>
              {s.label} <span className="opacity-60 text-[10px]">· {s.tag}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => setTpl(t)} className={chip(tpl.id === t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ✍️ المحتوى */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm">✍️ محتوى البطاقة</h3>
          <label className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-extrabold cursor-pointer transition-colors">
            📷 صورة من جهازك
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImg(e.target.files?.[0] || null)} />
          </label>
        </div>
        <input value={data.name} onChange={(e) => upd({ name: e.target.value })} placeholder="اسم المنتج" className={inp} maxLength={60} />
        <div className="flex gap-2">
          <input value={data.price} onChange={(e) => upd({ price: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="السعر" className={inp + ' flex-1'} />
          <input value={data.salePrice} onChange={(e) => upd({ salePrice: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="سعر الخصم (اختياري)" className={inp + ' flex-1'} />
          <select value={data.currency} onChange={(e) => upd({ currency: e.target.value })} className={inp + ' !w-auto shrink-0 bg-night'}>
            {curs.map((c) => <option key={c.code} value={c.code}>{c.name} — {c.symbol}</option>)}
          </select>
        </div>
        <input value={data.store} onChange={(e) => upd({ store: e.target.value })} placeholder="اسم المتجر أو البائع (اختياري)" className={inp} maxLength={40} />
        <input value={data.link} onChange={(e) => upd({ link: e.target.value })} placeholder="رابط الطلب للـ QR — يُملأ تلقائياً من الجلب" className={inp} dir="ltr" style={{ textAlign: 'left' }} />
      </div>

      {/* 🚀 التصدير */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={download} disabled={busy}
          className="py-3.5 rounded-2xl bg-gradient-to-l from-indigo-500 to-blue-600 font-black text-sm shadow-xl shadow-indigo-500/25 hover:scale-[1.01] transition-all disabled:opacity-50">
          {busy ? '⏳...' : '💾 تنزيل PNG'}
        </button>
        <button onClick={share}
          className="py-3.5 rounded-2xl bg-white/10 border border-white/15 font-black text-sm hover:bg-white/20 transition-colors">
          📤 مشاركة مباشرة
        </button>
      </div>

      {/* 💡 أفكار */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-extrabold text-sm mb-2">💡 أين تنشر بطاقتك؟</h3>
        <ul className="text-xs text-white/70 space-y-1.5 leading-relaxed">
          <li>📱 حالة واتساب بمقاس <b>الستوري</b> — الـ QR يمسحه المشاهد من جوال آخر.</li>
          <li>⬛ المقاس <b>المربع</b> مثالي لقروبات واتساب ومنشورات فيسبوك وانستغرام.</li>
          <li>🔥 عندك خصم؟ اختر قالب «عرض ناري» وأدخل سعر الخصم لتظهر شارته تلقائياً.</li>
        </ul>
      </div>
    </div>
  );
}
