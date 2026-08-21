'use client';
import { useEffect } from 'react';
import { toast } from '@/components/Toast';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 📱 جسر التطبيق الأصلي (Capacitor) + 🎨 استوديو تصميم التطبيق
// يعمل فقط داخل تطبيق أندرويد المغلِّف — المتصفح لا يتأثر إطلاقاً
// يقرأ إعدادات «التطبيق» من /api/v1/theme (يضبطها المدير من /admin/design ← تبويب التطبيق)
export default function NativeApp() {
  useEffect(() => {
    const Cap = (window as any).Capacitor;
    if (!Cap?.isNativePlatform?.()) return; // متصفح عادي — لا شيء

    const root = document.documentElement;
    root.classList.add('native-app');

    // شريط الحالة: أيقونات داكنة (ترويسة المنصة فاتحة)
    const StatusBar = Cap.Plugins?.StatusBar;
    StatusBar?.setStyle?.({ style: 'DARK' })?.catch?.(() => {});

    // ↩️ زر رجوع الجوال: أغلق القوائم/المنبثقات أولاً، ثم ارجع صفحة، وإلا اخرج من التطبيق
    const App = Cap.Plugins?.App;
    let sub: any;
    App?.addListener?.('backButton', () => {
      if ((window as any).__yzCloseOverlays?.()) return;
      if (window.location.pathname !== '/') window.history.back();
      else App.exitApp?.();
    })?.then?.((s: any) => { sub = s; });

    const cleanups: (() => void)[] = [];

    // 🎨 جلب إعدادات استوديو التطبيق وتطبيقها فوراً
    fetch(`${API}/api/v1/theme`).then(r => r.json()).then(t => {
      const app = t?.app || {};

      // سمات التصميم — تقرأها قواعد CSS الخاصة بالتطبيق في globals.css
      root.dataset.appDensity = app.density || 'compact';        // كثافة الهوامش: compact | cozy
      root.dataset.appHeader = app.headerStyle || 'glass';       // الترويسة: glass | solid | tinted
      root.dataset.appHero = app.heroHeight || 'compact';        // قسم البطل: compact | full
      root.dataset.appFloatnav = app.floatingNav === false ? 'off' : 'on';
      root.dataset.appAnnounce = app.showAnnouncement === false ? 'off' : 'on';
      root.dataset.appCurrency = app.showCurrency === false ? 'off' : 'on';
      root.dataset.appCta = app.showCta === false ? 'off' : 'on';

      // 🎨 لون وانحناء خاصان بالتطبيق — يغطيان ألوان المنصة داخل التطبيق فقط
      const applyBrand = () => {
        if (app.primaryColor) root.style.setProperty('--primary', app.primaryColor);
        if (app.radius) root.style.setProperty('--radius', app.radius);
      };
      applyBrand();
      // TopBar يجلب ثيم المنصة ويطبقه — نعيد فرض لون التطبيق بعده ليبقى الغلاف بهوية التطبيق
      const reapply = () => applyBrand();
      window.addEventListener('yz-theme-applied', reapply);
      cleanups.push(() => window.removeEventListener('yz-theme-applied', reapply));

      // 🖌️ CSS مخصص للتطبيق من لوحة التحكم
      if (app.customCss && typeof app.customCss === 'string') {
        const st = document.createElement('style');
        st.id = 'yz-app-css';
        st.textContent = app.customCss;
        document.head.appendChild(st);
        cleanups.push(() => st.remove());
      }

      // 🔄 السحب للأسفل للتحديث — لمسة التطبيقات الأصلية
      if (app.pullToRefresh !== false) {
        let startY = 0, pulling = false, ind: HTMLDivElement | null = null;
        const onStart = (e: TouchEvent) => {
          if (window.scrollY <= 0 && e.touches[0]) { startY = e.touches[0].clientY; pulling = true; }
        };
        const onMove = (e: TouchEvent) => {
          if (!pulling || ind || window.scrollY > 0) return;
          if (e.touches[0].clientY - startY > 65) {
            ind = document.createElement('div');
            ind.className = 'yz-ptr';
            ind.innerHTML = '<span>🔄</span>';
            document.body.appendChild(ind);
          }
        };
        const onEnd = () => {
          if (ind) { toast('🔄 جارٍ تحديث المحتوى…'); setTimeout(() => location.reload(), 250); }
          pulling = false;
        };
        window.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('touchend', onEnd);
        cleanups.push(() => {
          window.removeEventListener('touchstart', onStart);
          window.removeEventListener('touchmove', onMove);
          window.removeEventListener('touchend', onEnd);
        });
      }

      // 📳 اهتزاز لمسي خفيف عند لمس الروابط والأزرار — إحساس التطبيقات الفاخرة
      if (app.haptics !== false && (navigator as any).vibrate) {
        const buzz = (e: Event) => {
          const el = (e.target as HTMLElement)?.closest?.('a,button');
          if (el) (navigator as any).vibrate(6);
        };
        document.addEventListener('click', buzz);
        cleanups.push(() => document.removeEventListener('click', buzz));
      }
    }).catch(() => {});

    return () => { sub?.remove?.(); cleanups.forEach(fn => fn()); };
  }, []);
  return null;
}
