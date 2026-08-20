'use client';
import Script from 'next/script';

// 📊 Google Analytics — يُحقن فقط عند ضبط المعرف من إعدادات الإدارة
export default function GaTracker({ gaId }: { gaId: string }) {
  if (!/^G-[A-Z0-9]+$/i.test(gaId)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
      </Script>
    </>
  );
}
