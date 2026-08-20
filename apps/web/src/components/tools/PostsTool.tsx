'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';

// 📣 منشورات السوشيال الجاهزة — قوالب مناسبات مصممة، يعبّئها التاجر وينشرها فوراً
const OCCASIONS = [
  { id: 'friday', label: 'عروض الجمعة ⚡', head: 'عروض الجمعة', emoji: '⚡', c1: '#7C3AED', c2: '#EC4899', defSub: 'خصومات اليوم فقط — لا تفوّتها' },
  { id: 'weekend', label: 'نهاية الأسبوع 🎉', head: 'عروض نهاية الأسبوع', emoji: '🎉', c1: '#0EA5E9', c2: '#6366F1', defSub: 'تخفيضات حتى نفاد الكمية' },
  { id: 'ramadan', label: 'رمضان كريم 🌙', head: 'رمضان كريم 🌙', emoji: '🌙', c1: '#065F46', c2: '#0D9488', defSub: 'عروض الشهر الفضيل على كل المنتجات' },
  { id: 'eid', label: 'عيد مبارك 🎊', head: 'عيد سعيد 🎊', emoji: '🎊', c1: '#B45309', c2: '#F59E0B', defSub: 'تشكيلة العيد وصلت — اطلبها الآن' },
  { id: 'school', label: 'العودة للمدارس 🎒', head: 'العودة للمدارس', emoji: '🎒', c1: '#1D4ED8', c2: '#06B6D4', defSub: 'كل مستلزمات الدراسة بأسعار خاصة' },
  { id: 'new', label: 'وصل حديثاً ✨', head: 'وصل حديثاً ✨', emoji: '✨', c1: '#0F172A', c2: '#475569', defSub: 'تشكيلة جديدة كلياً — تفضل بالطلب' },
  { id: 'sale', label: 'خصم خاص 🏷️', head: 'خصم خاص 🏷️', emoji: '🏷️', c1: '#DC2626', c2: '#F97316', defSub: 'لفترة محدودة — الكمية محدودة' },
  { id: 'delivery', label: 'شحن مجاني 🚚', head: 'شحن مجاني 🚚', emoji: '🚚', c1: '#16A34A', c2: '#84CC16', defSub: 'على كل الطلبات — اطلب وأنت في بيتك' },
];

const POST_SIZES = [
  { id: 'sq', label: '⬛ مربع 1080', w: 1080, h: 1080, tag: 'حالة · منشور' },
  { id: 'st', label: '📱 ستوري 1080×1920', w: 1080, h: 1920, tag: 'ستوري · ريلز' },
];

interface PostData { store: string; offer: string; sub: string; contact: string; img: HTMLImageElement | null }

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

// 🎨 رسم المنشور
function drawPost(cv: HTMLCanvasElement, d: PostData, oc: (typeof OCCASIONS)[0], W: number, H: number) {
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.direction = 'rtl';

  // الخلفية المتدرجة
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, oc.c1); g.addColorStop(1, oc.c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // زخارف عضوية
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(W * 0.12, H * 0.1, W * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.9, H * 0.85, W * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.85, H * 0.12, W * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  const pad = W * 0.07;

  // 🖼️ صورة المنتج (اختياري) — بطاقة بارزة
  let textZoneY = H * 0.16;
  let textZoneH = H * 0.62;
  if (d.img) {
    const imgH = H * 0.42;
    const ir = d.img.width / d.img.height, tr = (W - 2 * pad) / imgH;
    let sw = d.img.width, sh = d.img.height, sx = 0, sy = 0;
    if (ir > tr) { sw = d.img.height * tr; sx = (d.img.width - sw) / 2; } else { sh = d.img.width / tr; sy = (d.img.height - sh) / 2; }
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.beginPath(); ctx.roundRect(pad, pad, W - 2 * pad, imgH, W * 0.04); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.clip();
    ctx.drawImage(d.img, sx, sy, sw, sh, pad, pad, W - 2 * pad, imgH);
    ctx.restore();
    textZoneY = pad + imgH + H * 0.04;
    textZoneH = H - textZoneY - H * 0.1;
  }

  ctx.textAlign = 'center';
  const cx = W / 2;

  // العنوان المناسباتي
  ctx.textBaseline = 'alphabetic';
  const headSize = W * 0.075;
  ctx.font = `900 ${headSize}px Cairo, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  ctx.fillText(oc.head, cx, textZoneY + headSize);

  // نص العرض (الأكبر)
  const offerTxt = d.offer.trim() || 'اكتب عرضك هنا';
  const offerSize = W * 0.095;
  ctx.font = `900 ${offerSize}px Cairo, sans-serif`;
  ctx.fillStyle = '#ffffff';
  let y = textZoneY + headSize + H * 0.035;
  const oLines = wrapText(ctx, offerTxt, W - 2 * pad, 2);
  for (const ln of oLines) { y += offerSize * 1.3; ctx.fillText(ln, cx, y); }

  // النص الفرعي
  const subTxt = d.sub.trim() || oc.defSub;
  ctx.shadowColor = 'transparent';
  ctx.font = `700 ${W * 0.04}px Cairo, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  y += W * 0.045;
  for (const ln of wrapText(ctx, subTxt, W - 2 * pad, 2)) { y += W * 0.055; ctx.fillText(ln, cx, y); }

  // زر المتجر + التواصل
  const storeTxt = d.store.trim() ? `🏪 ${d.store.trim()}` : '';
  const contactTxt = d.contact.trim() ? `📱 ${d.contact.trim()}` : '';
  if (storeTxt || contactTxt) {
    ctx.font = `900 ${W * 0.038}px Cairo, sans-serif`;
    const label = [storeTxt, contactTxt].filter(Boolean).join('   ·   ');
    const bw = ctx.measureText(label).width + W * 0.09;
    const bh = W * 0.085;
    const by = Math.min(y + H * 0.025, H - pad - bh - H * 0.045);
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.beginPath(); ctx.roundRect(cx - bw / 2, by, bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = oc.c1;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, by + bh / 2 + 2, bw - W * 0.06);
    ctx.textBaseline = 'alphabetic';
  }

  // ⚡ ختم المنصة — دعاية مع كل منشور
  ctx.font = `800 ${W * 0.026}px Cairo, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ يمن زون — yemenzone1.com', cx, H - pad * 0.55);
}

export default function PostsTool() {
  const [oc, setOc] = useState(OCCASIONS[0]);
  const [sz, setSz] = useState(POST_SIZES[0]);
  const [data, setData] = useState<PostData>({ store: '', offer: '', sub: '', contact: '', img: null });
  const [busy, setBusy] = useState(false);
  const cvRef = useRef<HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    const cv = cvRef.current;
    if (cv) drawPost(cv, data, oc, sz.w, sz.h);
  }, [data, oc, sz]);

  useEffect(() => { redraw(); }, [redraw]);

  const upd = (patch: Partial<PostData>) => setData((d) => ({ ...d, ...patch }));

  const uploadImg = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('ملفات الصور فقط', 'error'); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => { upd({ img: im }); toast('🖼️ أُضيفت صورة المنتج للمنشور'); };
      im.onerror = () => toast('تعذّرت قراءة الصورة', 'error');
      im.src = String(rd.result);
    };
    rd.readAsDataURL(f);
  };

  const download = async () => {
    if (!data.offer.trim()) { toast('✍️ اكتب نص العرض أولاً — مثال: خصم 30% على كل الجوالات', 'error'); return; }
    setBusy(true);
    try {
      const cv = document.createElement('canvas');
      drawPost(cv, data, oc, sz.w, sz.h);
      const a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = `منشور-${oc.id}-${sz.w}x${sz.h}.png`;
      a.click();
      toast('📣 منشورك جاهز — انشره في حالتك وقروباتك الآن');
    } catch { toast('تعذّر التصدير', 'error'); }
    setBusy(false);
  };

  const share = async () => {
    if (!data.offer.trim()) { toast('✍️ اكتب نص العرض أولاً', 'error'); return; }
    try {
      const cv = document.createElement('canvas');
      drawPost(cv, data, oc, sz.w, sz.h);
      const blob: Blob | null = await new Promise((r) => cv.toBlob(r, 'image/png'));
      if (!blob) throw new Error('x');
      const file = new File([blob], 'منشور-عرض.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: data.offer });
        toast('📤 تمت المشاركة');
      } else toast('جهازك لا يدعم المشاركة المباشرة — نزّلها PNG', 'error');
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast('تعذّرت المشاركة — جرّب التنزيل', 'error');
    }
  };

  const inp = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-rose-400/60 focus:outline-none transition-colors';
  const chip = (on: boolean) =>
    `px-3 py-2 rounded-xl text-xs font-bold border transition-all ${on ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/25' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`;

  return (
    <div className="space-y-5">
      {/* 🎭 المناسبة */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-extrabold text-sm mb-3">🎭 اختر المناسبة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {OCCASIONS.map((o) => (
            <button key={o.id} onClick={() => setOc(o)}
              className={`p-3 rounded-xl border text-center transition-all ${oc.id === o.id ? 'border-rose-400 bg-rose-500/15 scale-[1.03]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <span className="block w-10 h-10 mx-auto rounded-xl mb-1.5" style={{ background: `linear-gradient(135deg, ${o.c1}, ${o.c2})` }} />
              <span className="text-[11px] font-bold text-white/80">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 🎥 المعاينة */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="grid place-items-center bg-black/40 rounded-xl p-3">
          <canvas ref={cvRef} className="rounded-xl max-w-full h-auto shadow-2xl" style={{ maxHeight: 460 }} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {POST_SIZES.map((s) => (
            <button key={s.id} onClick={() => setSz(s)} className={chip(sz.id === s.id)}>
              {s.label} <span className="opacity-60 text-[10px]">· {s.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ✍️ المحتوى */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm">✍️ محتوى المنشور</h3>
          <label className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-extrabold cursor-pointer transition-colors">
            📷 صورة منتج (اختياري)
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImg(e.target.files?.[0] || null)} />
          </label>
        </div>
        <input value={data.offer} onChange={(e) => upd({ offer: e.target.value })} placeholder="نص العرض — مثال: خصم 30% على كل المنتجات 🔥" className={inp} maxLength={50} />
        <input value={data.sub} onChange={(e) => upd({ sub: e.target.value })} placeholder={`نص فرعي (اختياري) — الافتراضي: ${oc.defSub}`} className={inp} maxLength={70} />
        <div className="flex gap-2">
          <input value={data.store} onChange={(e) => upd({ store: e.target.value })} placeholder="اسم متجرك" className={inp + ' flex-1'} maxLength={30} />
          <input value={data.contact} onChange={(e) => upd({ contact: e.target.value.replace(/[^0-9+]/g, '') })} inputMode="tel" placeholder="واتسابك (اختياري)" className={inp + ' flex-1'} />
        </div>
      </div>

      {/* 🚀 التصدير */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={download} disabled={busy}
          className="py-3.5 rounded-2xl bg-gradient-to-l from-rose-500 to-pink-600 font-black text-sm shadow-xl shadow-rose-500/25 hover:scale-[1.01] transition-all disabled:opacity-50">
          {busy ? '⏳...' : '💾 تنزيل PNG'}
        </button>
        <button onClick={share} className="py-3.5 rounded-2xl bg-white/10 border border-white/15 font-black text-sm hover:bg-white/20 transition-colors">
          📤 مشاركة مباشرة
        </button>
      </div>

      {/* 💡 أفكار */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-extrabold text-sm mb-2">💡 أقصى استفادة</h3>
        <ul className="text-xs text-white/70 space-y-1.5 leading-relaxed">
          <li>🗓️ انشر منشور «الجمعة» مساء الخميس — ذروة مشاهدة الحالات.</li>
          <li>🖼️ منشور بصورة منتج حقيقية يتفوق على النص وحده بأضعاف.</li>
          <li>📱 أضف رقم واتسابك — كثير من الزبائن يفضلون رسالة سريعة على الاتصال.</li>
        </ul>
      </div>
    </div>
  );
}
