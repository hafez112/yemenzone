'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 👁️ متتبع الزوار — يسجل كل تنقل عام (يستثني لوحات التحكم تلقائياً من الخادم)
export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!API || !pathname) return;
    if (/^\/(admin|seller|driver|customer|auth)/.test(pathname)) return;
    const payload = JSON.stringify({ path: pathname, ref: document.referrer || '' });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${API}/api/v1/track`, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(`${API}/api/v1/track`, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
      }
    } catch { /* التتبع لا يعطّل التصفح أبداً */ }
  }, [pathname]);

  return null;
}
