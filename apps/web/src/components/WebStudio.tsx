'use client';
import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🌐 استوديو الويب — يطبق إعدادات تصميم الويب على المتصفح فقط
// يقرأ إعدادات «webx» من /api/v1/theme (يضبطها المدير من /admin/design ← تبويب استوديو الويب)
// داخل تطبيق أندرويد لا يفعل شيئاً — للتطبيق استوديوه الخاص (NativeApp)
export default function WebStudio() {
  useEffect(() => {
    const Cap = (window as any).Capacitor;
    if (Cap?.isNativePlatform?.()) return; // تطبيق أصلي — إعداداته من NativeApp

    const root = document.documentElement;
    fetch(`${API}/api/v1/theme`).then(r => r.json()).then(t => {
      const w = t?.webx || {};
      // تُضبط فقط ما اختاره المدير — الفارغ يعني تصميم الموقع الحالي
      if (w.theme) root.dataset.webxTheme = w.theme;               // الثيمات الجاهزة
      if (w.fontSize) root.dataset.webxFontsize = w.fontSize;      // حجم الخط
      if (w.density) root.dataset.webxDensity = w.density;         // كثافة الهوامش
      if (w.headerStyle) root.dataset.webxHeader = w.headerStyle;  // نمط الترويسة
      if (w.navStyle) root.dataset.webxNavstyle = w.navStyle;      // شكل الشريط السفلي (جوال الويب)
      if (w.homeView) root.dataset.webxView = w.homeView;          // طريقة عرض الرئيسية
      if (w.heroHeight) root.dataset.webxHero = w.heroHeight;      // ارتفاع قسم البطل
      if (w.quickButtons) root.dataset.webxQuick = 'on';           // أزرار الخدمات في الويب
      // لون خط مخصص للويب
      if (w.textColor) {
        root.dataset.webxInk = 'custom';
        root.style.setProperty('--app-ink', w.textColor);
      }
    }).catch(() => {});
  }, []);
  return null;
}
