'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';

// 🔔 بطاقة تفعيل إشعارات الويب — تصل للمستخدم حتى والمتصفح مغلق
export default function PushSubscribe() {
  const [state, setState] = useState<'loading' | 'on' | 'off' | 'denied' | 'unsupported'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState('unsupported'); return;
      }
      if (Notification.permission === 'denied') { setState('denied'); return; }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setState(sub ? 'on' : 'off');
      } catch { setState('off'); }
    })();
  }, []);

  const b64ToUint8 = (base64: string) => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  };

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState('denied'); toast('⚠️ رُفض الإذن — فعّله من إعدادات المتصفح', 'error'); setBusy(false); return; }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        await navigator.serviceWorker.register('/sw.js');
        reg = await navigator.serviceWorker.ready;
      }
      const { publicKey } = await api('/push/vapid');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToUint8(publicKey),
      });
      await api('/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
      setState('on');
      toast('🔔 فُعّلت الإشعارات — ستصلك تحديثات طلباتك فوراً حتى والتطبيق مغلق');
    } catch (e: any) { toast(e.message || 'تعذر تفعيل الإشعارات', 'error'); }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe();
      }
      setState('off');
      toast('🔕 عُطّلت الإشعارات على هذا الجهاز');
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (state === 'loading') return null;
  if (state === 'unsupported') return null;
  if (state === 'denied') return (
    <div className="glass rounded-3xl p-4 text-center">
      <p className="text-xs text-gray-500">🔕 الإشعارات محظورة من المتصفح — فعّلها من إعدادات الموقع (🔒 بجانب الرابط)</p>
    </div>
  );

  return (
    <div className={`rounded-3xl p-4 relative overflow-hidden ${state === 'on' ? 'glass' : ''}`}
      style={state !== 'on' ? { background: 'linear-gradient(135deg, #6C3DF5, #00B3A4)' } : {}}>
      {state !== 'on' && <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/15 anim-bobble" />}
      <div className="flex items-center gap-3 relative">
        <span className="text-2xl">{state === 'on' ? '🔔' : '🔕'}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-black text-sm ${state === 'on' ? '' : 'text-white'}`}>
            {state === 'on' ? 'الإشعارات مفعّلة على هذا الجهاز ✅' : 'فعّل الإشعارات الفورية'}
          </div>
          <div className={`text-[11px] ${state === 'on' ? 'text-gray-400' : 'text-white/85'}`}>
            {state === 'on' ? 'تصلك تحديثات طلباتك ورسائل المتاجر لحظياً' : 'تحديثات طلبك ورسائل المتاجر — حتى والتطبيق مغلق'}
          </div>
        </div>
        <button onClick={state === 'on' ? disable : enable} disabled={busy}
          className={`shrink-0 text-xs font-extrabold px-4 py-2 rounded-full shadow disabled:opacity-40 ${
            state === 'on' ? 'bg-gray-100 text-gray-500' : 'bg-white text-purple-700'
          }`}>
          {busy ? '⏳…' : state === 'on' ? 'إيقاف' : '🔔 تفعيل'}
        </button>
      </div>
    </div>
  );
}
