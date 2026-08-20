'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';

// 🎬 صانع الإعلانات المتحركة — يحوّل الصور والنصوص إلى GIF إعلاني بمقاسات البنرات العالمية
// المحرك: gifenc (توليد GIF حقيقي داخل المتصفح — لا يغادر أي شيء جهازك)

interface Slide {
  id: number;
  img: HTMLImageElement | null;
  title: string;
  sub: string;
  cta: string;
  c1: string;
  c2: string;
}

// 📐 مقاسات الإعلانات والبنرات المعتمدة عالمياً (IAB) + مقاسات التواصل
const SIZES = [
  { w: 300, h: 250, label: 'بانر متوسط', tag: 'الأشهر عالمياً' },
  { w: 336, h: 280, label: 'بانر كبير', tag: 'IAB' },
  { w: 728, h: 90, label: 'بانر علوي', tag: 'Leaderboard' },
  { w: 300, h: 600, label: 'نصف صفحة', tag: 'IAB' },
  { w: 160, h: 600, label: 'عمودي', tag: 'Skyscraper' },
  { w: 600, h: 600, label: 'مربع', tag: 'واتساب · انستغرام' },
  { w: 540, h: 960, label: 'ستوري', tag: '9:16' },
  { w: 1200, h: 628, label: 'منشور', tag: 'فيسبوك · إكس' },
];

const TRANSITIONS = [
  { id: 'fade', label: '🌫️ تلاشي' },
  { id: 'slide', label: '⬅️ انزلاق' },
  { id: 'zoom', label: '🔍 تقريب' },
  { id: 'rise', label: '🎈 صعود' },
];

// 🎨 لوحات ألوان للشرائح النصية
const PALETTES: [string, string][] = [
  ['#7C3AED', '#EC4899'], ['#0F172A', '#334155'], ['#DC2626', '#F59E0B'], ['#059669', '#34D399'],
  ['#1D4ED8', '#06B6D4'], ['#78350F', '#D97706'], ['#9D174D', '#F472B6'], ['#16A34A', '#84CC16'],
];

const QUALITIES = [
  { id: 1, label: 'دقيق 100%', hint: 'للمنصات الإعلانية' },
  { id: 0.75, label: 'متوسط 75%', hint: 'حجم أخف' },
  { id: 0.5, label: 'خفيف 50%', hint: 'للواتساب' },
];

let uid = 1;
const mkSlide = (patch: Partial<Slide> = {}): Slide => {
  const p = PALETTES[(uid - 1) % PALETTES.length];
  return { id: uid++, img: null, title: '', sub: '', cta: '', c1: p[0], c2: p[1], ...patch };
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeBack = (t: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// ✂️ تغليف النص لأسطر حسب العرض
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

// 🖼️ رسم صورة بملء الإطار (cover) مع تقريب Ken Burns
function coverDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, zoom = 1) {
  const ir = img.width / img.height, tr = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > tr) { sw = img.height * tr; sx = (img.width - sw) / 2; } else { sh = img.width / tr; sy = (img.height - sh) / 2; }
  const zw = sw / zoom, zh = sh / zoom;
  sx += (sw - zw) / 2; sy += (sh - zh) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, sx, sy, zw, zh, x, y, w, h);
  ctx.restore();
}

// 🎞️ رسم شريحة كاملة — p: التقدم داخلها (0..1) — o: تحويلات الانتقال
function drawSlide(ctx: CanvasRenderingContext2D, s: Slide, W: number, H: number, p: number,
  o: { alpha?: number; dx?: number; dy?: number; scale?: number } = {}) {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  const sc = o.scale ?? 1;
  ctx.translate((o.dx ?? 0) + W / 2, (o.dy ?? 0) + H / 2);
  ctx.scale(sc, sc);
  ctx.translate(-W / 2, -H / 2);

  const row = W / H >= 2.2; // بانر عريض → تخطيط أفقي
  const minD = Math.min(W, H);

  // الخلفية: تدرج دائماً + الصورة فوقه
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, s.c1); g.addColorStop(1, s.c2);
  ctx.fillStyle = g;
  ctx.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);

  if (s.img) {
    const zoom = 1 + 0.07 * p; // 🎥 حركة Ken Burns هادئة
    if (row) coverDraw(ctx, s.img, 0, 0, W * 0.42, H, zoom);
    else {
      coverDraw(ctx, s.img, 0, 0, W, H, zoom);
      ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(0, 0, W, H);
      const dg = ctx.createLinearGradient(0, H * 0.4, 0, H);
      dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = dg; ctx.fillRect(0, H * 0.4, W, H * 0.6);
    }
  } else {
    // زخارف دوائر شفافة للشريحة النصية
    ctx.globalAlpha *= 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(W * 0.15, H * 0.2, minD * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.88, H * 0.85, minD * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = o.alpha ?? 1;
  }

  // ✍️ النصوص بدخول متدرج
  ctx.direction = 'rtl';
  ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = minD * 0.02; ctx.shadowOffsetY = minD * 0.008;

  const e1 = easeOut(clamp01(p / 0.22));
  const e2 = easeOut(clamp01((p - 0.1) / 0.22));
  const e3 = easeBack(clamp01((p - 0.2) / 0.2));

  if (row) {
    const pad = W * 0.03;
    const textW = s.img ? W * 0.5 : W * 0.94;
    const xR = W - pad;
    const tSize = Math.max(13, H * 0.3);
    const sSize = Math.max(10, H * 0.19);
    const cSize = Math.max(10, H * 0.2);
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';

    ctx.font = `900 ${tSize}px Cairo, sans-serif`;
    const tLines = s.title.trim() ? wrapText(ctx, s.title.trim(), textW) : [];
    ctx.font = `700 ${sSize}px Cairo, sans-serif`;
    const sLines = s.sub.trim() ? wrapText(ctx, s.sub.trim(), textW).slice(0, 1) : [];
    const cta = s.cta.trim();
    ctx.font = `900 ${cSize}px Cairo, sans-serif`;
    const ctaW = cta ? ctx.measureText(cta).width + cSize * 1.6 : 0;

    const gap1 = H * 0.07, gap2 = H * 0.12;
    const totalH = tLines.length * tSize * 1.15 + (sLines.length ? gap1 + sSize * 1.2 : 0) + (cta ? gap2 + cSize * 1.7 : 0);
    let y = (H - totalH) / 2 + tSize * 0.9;

    // العنوان
    ctx.save(); ctx.globalAlpha *= e1; ctx.translate((1 - e1) * W * 0.04, 0);
    ctx.fillStyle = '#ffffff'; ctx.font = `900 ${tSize}px Cairo, sans-serif`;
    for (const ln of tLines) { ctx.fillText(ln, xR, y); y += tSize * 1.15; }
    ctx.restore();
    // النص الفرعي
    if (sLines.length) {
      y += gap1;
      ctx.save(); ctx.globalAlpha *= e2 * 0.9;
      ctx.fillStyle = '#ffffff'; ctx.font = `700 ${sSize}px Cairo, sans-serif`;
      for (const ln of sLines) { ctx.fillText(ln, xR, y); y += sSize * 1.2; }
      ctx.restore();
    }
    // زر CTA
    if (cta) {
      y += gap2;
      ctx.save(); ctx.globalAlpha *= clamp01(e3);
      const cxC = xR - ctaW / 2, cyC = y + cSize * 0.75;
      ctx.translate(cxC, cyC); ctx.scale(Math.max(0.01, e3), Math.max(0.01, e3)); ctx.translate(-cxC, -cyC);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath(); ctx.roundRect(xR - ctaW, y, ctaW, cSize * 1.7, cSize * 0.85); ctx.fill();
      ctx.fillStyle = '#111827'; ctx.font = `900 ${cSize}px Cairo, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(cta, cxC, y + cSize * 1.18);
      ctx.restore();
    }
  } else {
    // 📱 تخطيط عمودي (مربع/ستوري/بانر متوسط)
    const tSize = Math.max(15, Math.min(H * 0.09, W * 0.1));
    const sSize = Math.max(12, Math.min(H * 0.05, W * 0.06));
    const cSize = Math.max(12, Math.min(H * 0.05, W * 0.062));
    const maxTW = W * 0.86;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

    ctx.font = `900 ${tSize}px Cairo, sans-serif`;
    const tLines = s.title.trim() ? wrapText(ctx, s.title.trim(), maxTW) : [];
    ctx.font = `700 ${sSize}px Cairo, sans-serif`;
    const sLines = s.sub.trim() ? wrapText(ctx, s.sub.trim(), maxTW).slice(0, 2) : [];
    const cta = s.cta.trim();
    ctx.font = `900 ${cSize}px Cairo, sans-serif`;
    const ctaW = cta ? ctx.measureText(cta).width + cSize * 2 : 0;

    const gap1 = H * 0.025, gap2 = H * 0.045;
    const totalH = tLines.length * tSize * 1.25 + (sLines.length ? gap1 + sLines.length * sSize * 1.4 : 0) + (cta ? gap2 + cSize * 2 : 0);
    let y = H * 0.88 - totalH + tSize;
    const cx = W / 2;

    ctx.save(); ctx.globalAlpha *= e1; ctx.translate(0, (1 - e1) * H * 0.05);
    ctx.fillStyle = '#ffffff'; ctx.font = `900 ${tSize}px Cairo, sans-serif`;
    for (const ln of tLines) { ctx.fillText(ln, cx, y); y += tSize * 1.25; }
    ctx.restore();
    if (sLines.length) {
      y += gap1;
      ctx.save(); ctx.globalAlpha *= e2 * 0.92; ctx.translate(0, (1 - e2) * H * 0.03);
      ctx.fillStyle = '#ffffff'; ctx.font = `700 ${sSize}px Cairo, sans-serif`;
      for (const ln of sLines) { ctx.fillText(ln, cx, y); y += sSize * 1.4; }
      ctx.restore();
    }
    if (cta) {
      y += gap2;
      ctx.save(); ctx.globalAlpha *= clamp01(e3);
      const cyC = y + cSize;
      ctx.translate(cx, cyC); ctx.scale(Math.max(0.01, e3), Math.max(0.01, e3)); ctx.translate(-cx, -cyC);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath(); ctx.roundRect(cx - ctaW / 2, y, ctaW, cSize * 2, cSize); ctx.fill();
      ctx.fillStyle = '#111827'; ctx.font = `900 ${cSize}px Cairo, sans-serif`;
      ctx.fillText(cta, cx, y + cSize * 1.4);
      ctx.restore();
    }
  }
  ctx.restore();
}

// 🎬 رسم إطار كامل من الإعلان في زمن t (ثوانٍ)
function drawFrame(ctx: CanvasRenderingContext2D, slides: Slide[], W: number, H: number, t: number,
  cfg: { slideMs: number; trans: string; badge: string; bar: boolean }) {
  ctx.clearRect(0, 0, W, H);
  if (!slides.length) return;
  const total = slides.length * cfg.slideMs;
  const tms = ((t * 1000) % total + total) % total;
  const idx = Math.floor(tms / cfg.slideMs) % slides.length;
  const p = (tms % cfg.slideMs) / cfg.slideMs;
  const cur = slides[idx];
  const nxt = slides[(idx + 1) % slides.length];

  const TW = 0.35; // نافذة الانتقال: آخر 35٪ من الشريحة
  if (slides.length > 1 && p > 1 - TW) {
    const e = easeOut((p - (1 - TW)) / TW);
    if (cfg.trans === 'slide') {
      drawSlide(ctx, cur, W, H, p, { dx: e * W * 0.4, alpha: 1 - e * 0.5 });
      drawSlide(ctx, nxt, W, H, 0, { dx: -(1 - e) * W });
    } else if (cfg.trans === 'zoom') {
      drawSlide(ctx, cur, W, H, p, { scale: 1 - e * 0.08, alpha: 1 - e * 0.4 });
      drawSlide(ctx, nxt, W, H, 0, { scale: 1 + (1 - e) * 0.25, alpha: e });
    } else if (cfg.trans === 'rise') {
      drawSlide(ctx, cur, W, H, p, { dy: -e * H * 0.15, alpha: 1 - e * 0.5 });
      drawSlide(ctx, nxt, W, H, 0, { dy: (1 - e) * H * 0.3, alpha: e });
    } else {
      drawSlide(ctx, cur, W, H, p);
      drawSlide(ctx, nxt, W, H, 0, { alpha: e });
    }
  } else {
    drawSlide(ctx, cur, W, H, p);
  }

  const minD = Math.min(W, H);
  // 🏷️ شارة نابضة (مثل: خصم 30٪)
  if (cfg.badge.trim()) {
    const bSize = Math.max(11, minD * 0.11);
    const pulse = 1 + 0.07 * Math.sin(t * 5);
    ctx.save();
    ctx.font = `900 ${bSize}px Cairo, sans-serif`;
    const bw = ctx.measureText(cfg.badge.trim()).width + bSize * 1.8;
    const bx = W * 0.04 + bw / 2, by = H * 0.06 + bSize;
    ctx.translate(bx, by); ctx.rotate(-0.12); ctx.scale(pulse, pulse);
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = bSize * 0.5; ctx.shadowOffsetY = bSize * 0.15;
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.roundRect(-bw / 2, -bSize * 0.95, bw, bSize * 1.9, bSize * 0.6); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillText(cfg.badge.trim(), 0, bSize * 0.05);
    ctx.restore();
  }
  // ▬ شريط تقدم سفلي
  if (cfg.bar) {
    const bh = Math.max(3, H * 0.012);
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.fillRect(0, H - bh, W, bh);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(W * (1 - tms / total), H - bh, W * (tms / total), bh);
  }
}

export default function GifAdTool() {
  const [slides, setSlides] = useState<Slide[]>([mkSlide()]);
  const [selId, setSelId] = useState<number>(1);
  const [size, setSize] = useState(SIZES[0]);
  const [trans, setTrans] = useState('fade');
  const [slideMs, setSlideMs] = useState(2000);
  const [badge, setBadge] = useState('');
  const [bar, setBar] = useState(true);
  const [quality, setQuality] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const t0Ref = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const sel = slides.find((s) => s.id === selId) || slides[0];
  const cfg = { slideMs, trans, badge, bar };
  const framesEst = Math.min(160, Math.max(4, Math.round(slideMs / 66)) * slides.length);
  const totalSec = ((slideMs * slides.length) / 1000).toFixed(1);

  // ▶️ المعاينة الحية
  useEffect(() => {
    const cv = previewRef.current;
    if (!cv) return;
    const pScale = Math.min(1, 640 / size.w);
    cv.width = Math.max(8, Math.round(size.w * pScale));
    cv.height = Math.max(8, Math.round(size.h * pScale));
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    if (!playing) {
      drawFrame(ctx, slides, cv.width, cv.height, slideMs * 0.001 * 0.5, cfg);
      return;
    }
    const loop = (now: number) => {
      if (!t0Ref.current) t0Ref.current = now;
      drawFrame(ctx, slides, cv.width, cv.height, (now - t0Ref.current) / 1000, cfg);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); t0Ref.current = 0; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, size, trans, slideMs, badge, bar, playing]);

  // 🖼️ إضافة صور كشرائح (تُصغّر تلقائياً للأداء)
  const addImages = (files: FileList | null) => {
    if (!files || !files.length) return;
    let added = 0;
    Array.from(files).slice(0, 8).forEach((f) => {
      if (!f.type.startsWith('image/')) return;
      added++;
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, 1600 / Math.max(img.width, img.height));
        const finish = (finalImg: HTMLImageElement) => {
          setSlides((ss) => {
            const ns = mkSlide({ img: finalImg });
            setSelId(ns.id);
            return [...ss, ns];
          });
          URL.revokeObjectURL(url);
        };
        if (r < 1) {
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
          const im2 = new Image();
          im2.onload = () => finish(im2);
          im2.src = c.toDataURL('image/jpeg', 0.9);
        } else finish(img);
      };
      img.onerror = () => { URL.revokeObjectURL(url); toast('تعذّرت قراءة إحدى الصور', 'error'); };
      img.src = url;
    });
    if (added) toast(`🖼️ أُضيفت ${added} ${added === 1 ? 'صورة' : 'صور'} كشرائح جديدة`);
    if (fileRef.current) fileRef.current.value = '';
  };

  const addTextSlide = () => {
    const ns = mkSlide();
    setSlides((ss) => [...ss, ns]);
    setSelId(ns.id);
    toast('➕ أُضيفت شريحة نصية — اكتب نصوصها من الأسفل');
  };

  const update = (id: number, patch: Partial<Slide>) =>
    setSlides((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const move = (id: number, dir: -1 | 1) => {
    setSlides((ss) => {
      const i = ss.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ss.length) return ss;
      const arr = [...ss];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
    toast(dir < 0 ? '⬆️ قُدّمت الشريحة' : '⬇️ أُخّرت الشريحة');
  };

  const removeSlide = (id: number) => {
    if (slides.length <= 1) { toast('لا يمكن حذف آخر شريحة', 'error'); return; }
    setSlides((ss) => {
      const rest = ss.filter((s) => s.id !== id);
      if (selId === id) setSelId(rest[0].id);
      return rest;
    });
    toast('🗑️ حُذفت الشريحة');
  };

  // 📸 تنزيل الإطار الحالي PNG
  const savePng = () => {
    const cv = previewRef.current;
    if (!cv) return;
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = `اعلان-${size.w}x${size.h}.png`;
    a.click();
    toast('📸 حُفظت نسخة PNG من الإطار الحالي');
  };

  // 🎬 تصدير GIF حقيقي عبر gifenc
  const exportGif = async () => {
    if (!slides.length) { toast('أضف شريحة واحدة على الأقل', 'error'); return; }
    if (slides.every((s) => !s.img && !s.title.trim() && !s.sub.trim() && !s.cta.trim())) {
      toast('✍️ أضف صورة أو نصاً لشريحتك أولاً', 'error'); return;
    }
    setBusy(true); setProg(0); setPlaying(false);
    try {
      const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
      const W = Math.max(8, Math.round(size.w * quality));
      const H = Math.max(8, Math.round(size.h * quality));
      let frameMs = 66;
      let fps = Math.max(4, Math.round(slideMs / frameMs));
      let totalFrames = fps * slides.length;
      if (totalFrames > 160) {
        frameMs = Math.ceil((slideMs * slides.length) / 160);
        fps = Math.max(3, Math.round(slideMs / frameMs));
        totalFrames = fps * slides.length;
      }
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d')!;
      const gif = GIFEncoder();
      for (let f = 0; f < totalFrames; f++) {
        drawFrame(ctx, slides, W, H, (f * frameMs) / 1000, cfg);
        const { data } = ctx.getImageData(0, 0, W, H);
        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, W, H, { palette, delay: frameMs, first: f === 0, repeat: 0 });
        setProg(Math.round(((f + 1) / totalFrames) * 100));
        if (f % 8 === 7) await new Promise((r) => setTimeout(r, 0));
      }
      gif.finish();
      const bytes = gif.bytes();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `اعلان-متحرك-${W}x${H}.gif`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(`🎬 جاهز! إعلان GIF متحرك — ${totalFrames} إطاراً · ${(blob.size / 1024).toFixed(0)}KB`);
    } catch {
      toast('تعذّر إنشاء GIF — جرّب مقاساً أصغر أو جودة أخف', 'error');
    }
    setBusy(false);
  };

  const inp = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/60 focus:outline-none transition-colors';
  const chip = (on: boolean) =>
    `px-3 py-2 rounded-xl text-xs font-bold border transition-all ${on ? 'bg-amber-400 text-gray-900 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`;

  return (
    <div className="space-y-5">
      {/* 🎥 المعاينة الحية */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm">🎥 معاينة حية</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/50 font-bold">{size.w}×{size.h} · {framesEst} إطار · {totalSec}ث</span>
            <button onClick={() => { setPlaying(!playing); toast(playing ? '⏸️ توقفت المعاينة' : '▶️ استؤنفت المعاينة'); }}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center text-sm transition-colors">
              {playing ? '⏸️' : '▶️'}
            </button>
            <button onClick={savePng} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center text-sm transition-colors" title="حفظ الإطار الحالي PNG">📸</button>
          </div>
        </div>
        <div className="grid place-items-center bg-black/40 rounded-xl p-3 overflow-hidden">
          <canvas ref={previewRef} className="rounded-lg max-w-full h-auto shadow-2xl" style={{ maxHeight: 420 }} />
        </div>
        {busy && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-l from-amber-400 to-pink-500 transition-all duration-150" style={{ width: `${prog}%` }} />
            </div>
            <p className="text-[11px] text-white/60 mt-1 text-center font-bold">⏳ يُعالج الإطار {prog}% — لا تغلق الصفحة</p>
          </div>
        )}
      </div>

      {/* 🎞️ الشرائح */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm">🎞️ شرائح الإعلان ({slides.length})</h3>
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-amber-400 text-gray-900 text-xs font-extrabold hover:bg-amber-300 transition-colors">🖼️ + صور</button>
            <button onClick={addTextSlide} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-extrabold transition-colors">🔤 + نصوص</button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {slides.map((s, i) => (
            <button key={s.id} onClick={() => setSelId(s.id)}
              className={`shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 grid place-items-center text-xs font-extrabold transition-all relative ${sel.id === s.id ? 'border-amber-400 scale-105' : 'border-white/10 opacity-70'}`}
              style={{ background: s.img ? undefined : `linear-gradient(135deg, ${s.c1}, ${s.c2})` }}>
              {s.img && <img src={s.img.src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <span className="relative z-10 bg-black/50 rounded-full w-6 h-6 grid place-items-center">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* ✍️ تحرير الشريحة المحددة */}
        {sel && (
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white/60">✍️ الشريحة {slides.findIndex((s) => s.id === sel.id) + 1}</p>
              <div className="flex gap-1.5">
                <button onClick={() => move(sel.id, -1)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition-colors">▲</button>
                <button onClick={() => move(sel.id, 1)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition-colors">▼</button>
                <button onClick={() => removeSlide(sel.id)} className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-xs transition-colors">🗑️</button>
              </div>
            </div>
            <input value={sel.title} onChange={(e) => update(sel.id, { title: e.target.value })} placeholder="العنوان الرئيسي — مثال: تشكيلة العيد وصلت" className={inp} maxLength={60} />
            <input value={sel.sub} onChange={(e) => update(sel.id, { sub: e.target.value })} placeholder="نص فرعي — مثال: توصيل مجاني داخل صنعاء" className={inp} maxLength={80} />
            <input value={sel.cta} onChange={(e) => update(sel.id, { cta: e.target.value })} placeholder="نص الزر — مثال: اطلب الآن 🛒" className={inp} maxLength={20} />
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-white/50 font-bold">🎨 الخلفية:</span>
              {PALETTES.map((p, i) => (
                <button key={i} onClick={() => { update(sel.id, { c1: p[0], c2: p[1] }); toast('🎨 تغيّرت ألوان الشريحة'); }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${sel.c1 === p[0] && sel.c2 === p[1] ? 'border-white scale-110' : 'border-white/20'}`}
                  style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 📐 المقاس والحركة */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
        <div>
          <h3 className="font-extrabold text-sm mb-2">📐 مقاس الإعلان</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SIZES.map((s) => (
              <button key={`${s.w}x${s.h}`} onClick={() => setSize(s)} className={chip(size.w === s.w && size.h === s.h)}>
                <span className="block text-[13px]">{s.w}×{s.h}</span>
                <span className="block text-[10px] opacity-70 mt-0.5">{s.label}{s.tag ? ` · ${s.tag}` : ''}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-extrabold text-sm mb-2">✨ الانتقال بين الشرائح</h3>
          <div className="flex flex-wrap gap-2">
            {TRANSITIONS.map((t) => (
              <button key={t.id} onClick={() => setTrans(t.id)} className={chip(trans === t.id)}>{t.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-extrabold text-sm">⏱️ مدة الشريحة</h3>
            <span className="text-xs font-bold text-amber-300">{(slideMs / 1000).toFixed(1)} ثانية</span>
          </div>
          <input type="range" min={800} max={4000} step={100} value={slideMs} onChange={(e) => setSlideMs(+e.target.value)} className="w-full accent-amber-400" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <h3 className="font-extrabold text-sm mb-2">🏷️ شارة نابضة (اختياري)</h3>
            <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="مثال: خصم 30٪ 🔥" className={inp} maxLength={16} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={bar} onChange={(e) => { setBar(e.target.checked); toast(e.target.checked ? '▬ ظهر شريط التقدم' : '▬ أُخفي شريط التقدم'); }} className="w-4 h-4 accent-amber-400" />
              <span className="text-xs font-bold text-white/70">شريط تقدم سفلي يحثّ على المشاهدة</span>
            </label>
          </div>
        </div>
      </div>

      {/* 🚀 التصدير */}
      <div className="rounded-2xl border border-amber-400/30 p-4" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,.12), rgba(236,72,153,.08))' }}>
        <h3 className="font-extrabold text-sm mb-2">🚀 تصدير الإعلان GIF</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {QUALITIES.map((q) => (
            <button key={q.id} onClick={() => setQuality(q.id)} className={chip(quality === q.id)}>
              {q.label} <span className="opacity-60 text-[10px]">· {q.hint}</span>
            </button>
          ))}
        </div>
        <button onClick={exportGif} disabled={busy}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-amber-400 to-pink-500 text-gray-900 font-extrabold text-base shadow-xl shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:scale-100">
          {busy ? `⏳ جارٍ التوليد... ${prog}%` : '🎬 ولّد إعلاني المتحرك الآن'}
        </button>
        <p className="text-[11px] text-white/50 mt-2 text-center">يُولّد داخل متصفحك بالكامل — صورك ونصوصك لا تغادر جهازك أبداً 🔒</p>
      </div>

      {/* 💡 أفكار احترافية */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-extrabold text-sm mb-2">💡 أفكار تجعل إعلانك أقوى</h3>
        <ul className="text-xs text-white/70 space-y-1.5 leading-relaxed">
          <li>🥇 الشريحة الأولى = صورة منتجك الأقوى، الثانية = العرض، الثالثة = زر الطلب.</li>
          <li>📱 مقاس <b>600×600</b> مثالي لحالة واتساب ومنشور انستغرام، و<b>728×90</b> لأعلى المواقع.</li>
          <li>🏷️ الشارة النابضة («خصم 30٪») ترفع النقرات — اكتبها قصيرة.</li>
          <li>⚡ 2-3 شرائح بمدة ثانيتين = إعلان خفيف سريع التحميل لا يملّه الزبون.</li>
        </ul>
      </div>
    </div>
  );
}
