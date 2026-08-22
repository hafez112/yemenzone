'use client';
import { useEffect } from 'react';

// 🎞️ محرك احتياطي للشرائط المتحركة (المتاجر/الخدمات المميزة)
// على الأجهزة المفعّل فيها «إزالة الحركات» يقتل النظام حركات CSS كلها فيتجمد الشريط —
// هنا نقوده بـ requestAnimationFrame (لا يتأثر بذلك الإعداد) فيبقى المحتوى يتحرك ويُرى كاملاً.
// الأجهزة العادية لا يمسّها هذا المكوّن إطلاقاً (تبقى حركة CSS الأصلية).
export default function MotionFallback() {
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tracks = new Set<HTMLElement>();
    const paused = new WeakSet<HTMLElement>();
    let raf = 0;

    const pause = (t: HTMLElement) => () => paused.add(t);
    const resume = (t: HTMLElement) => () => paused.delete(t);

    const bind = (t: HTMLElement) => {
      if (tracks.has(t)) return;
      tracks.add(t);
      t.dataset.mqX = t.dataset.mqX || '';
      t.addEventListener('mouseenter', pause(t));
      t.addEventListener('mouseleave', resume(t));
      t.addEventListener('touchstart', pause(t), { passive: true });
      t.addEventListener('touchend', resume(t), { passive: true });
    };

    const scan = () => document.querySelectorAll<HTMLElement>('.marquee-track').forEach(bind);
    scan();
    // الأقسام تُحمَّل غير متزامنة — راقب إضافة أي شريط جديد للصفحة
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    const SPEED = 0.5; // بكسل لكل إطار — يعادل تقريباً سرعة حركة CSS الأصلية
    const drive = () => {
      tracks.forEach((t) => {
        if (!t.isConnected) { tracks.delete(t); return; }
        if (paused.has(t)) return;
        const half = t.scrollWidth / 2;
        if (half <= 0) return;
        let x = t.dataset.mqX === '' || t.dataset.mqX === undefined ? half : parseFloat(t.dataset.mqX!);
        x -= SPEED;                        // نفس اتجاه حركة CSS الأصلية (+50% → 0)
        if (x <= 0) x = half;              // التفاف سلس — المحتوى مكرر مرتين
        t.dataset.mqX = String(x);
        t.style.transform = `translateX(${x}px)`;
      });
      raf = requestAnimationFrame(drive);
    };
    raf = requestAnimationFrame(drive);

    return () => { cancelAnimationFrame(raf); mo.disconnect(); };
  }, []);

  return null;
}
