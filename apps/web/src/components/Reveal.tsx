'use client';
import { useEffect, useRef } from 'react';

// ظهور العناصر عند التمرير — IntersectionObserver خفيف بدون مكتبات
// 🛡️ أمان تام: المحتوى ظاهر افتراضياً؛ الإخفاء الأولي (.armed) يُضاف من JS فقط
// بعد التأكد أن الجهاز يسمح بالحركة والمراقب جاهز — فلا يختفي أي قسم أبداً
// الاستخدام: <Reveal><Card /></Reveal> أو <Reveal className="reveal-wrap">
export default function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // الجهاز طلب تقليل الحركة (إزالة الحركات في أندرويد) → لا أنيميشن، المحتوى ظاهر
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return; // متصفح قديم → المحتوى ظاهر
    el.classList.add('armed'); // الإخفاء الأولي يبدأ الآن فقط — بعد ضمان عمل المراقب
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    obs.observe(el);
    // ضمانة أخيرة: إن لم يُطلق المراقب خلال 2.5 ثانية لأي سبب — أظهر المحتوى
    const bail = setTimeout(() => el.classList.add('revealed'), 2500);
    return () => { obs.disconnect(); clearTimeout(bail); };
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
