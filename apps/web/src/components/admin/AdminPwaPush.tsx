'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '../Toast';

// 📱 بطاقة تطبيق لوحة تحكم المنصة — تثبيت فوري (مانيفست الإدارة مربوط تلقائياً)
// + إشعارات فورية تصل للمدير حتى واللوحة مغلقة تماماً
export default function AdminPwaPush() {
  const [installEvt, setInstallEvt] = useState<any>(null);
  const [pushState, setPushState] = useState<'loading' | 'on' | 'off' | 'denied' | 'unsupported'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onInstall = (e: any) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', onInstall);
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setPushState('unsupported'); return; }
      if (Notification.permission === 'denied') { setPushState('denied'); return; }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setPushState(sub ? 'on' : 'off');
      } catch { setPushState('off'); }
    })();
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  const b64ToUint8 = (base64: string) => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  };

  async function install() {
    if (installEvt) {
      installEvt.prompt();
      await installEvt.userChoice;
      setInstallEvt(null);
      toast('📱 لوحة الإدارة صارت تطبيقاً مستقلاً على جهازك');
    } else {
      toast('📱 من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»', 'success');
    }
  }

  async function enablePush() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushState('denied'); toast('⚠️ رُفض الإذن — فعّله من إعدادات المتصفح', 'error'); setBusy(false); return; }
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        await navigator.serviceWorker.register('/sw.js');
        reg = await navigator.serviceWorker.ready;
      }
      const { publicKey } = await api('/push/vapid');
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) });
      await api('/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
      setPushState('on');
      toast('🔔 فُعّلت إشعارات الإدارة — تصلك التنبيهات الحرجة حتى واللوحة مغلقة');
    } catch (e: any) { toast(e.message || 'تعذر تفعيل الإشعارات', 'error'); }
    setBusy(false);
  }

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full opacity-15 anim-blob" style={{ background: 'var(--primary)' }} />
      <div className="relative flex items-center gap-3 flex-wrap">
        <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 glow-soft"
          style={{ background: 'linear-gradient(135deg, var(--primary), #4f46e5)' }}>📱</span>
        <div className="flex-1 min-w-[190px]">
          <div className="font-extrabold text-sm">تطبيق لوحة تحكم المنصة</div>
          <div className="text-[11px] text-slate-400">
            {pushState === 'on'
              ? '✅ الإشعارات مفعّلة — تصلك طلبات التطبيقات والتوثيق والشكاوى فوراً حتى واللوحة مغلقة'
              : 'ثبّت اللوحة كتطبيق مستقل وفعّل إشعاراتها الفورية'}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={install}
            className="text-[11px] font-extrabold px-4 py-2.5 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg, #059669, #0D9488)' }}>
            📲 ثبّت اللوحة
          </button>
          {pushState === 'off' && (
            <button onClick={enablePush} disabled={busy}
              className="text-[11px] font-extrabold px-4 py-2.5 rounded-full text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, var(--primary), #4f46e5)' }}>
              {busy ? '⏳...' : '🔔 فعّل الإشعارات'}
            </button>
          )}
          {pushState === 'on' && (
            <span className="text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 px-3 py-2 rounded-full">🔔 الإشعارات تعمل ✓</span>
          )}
          {pushState === 'denied' && (
            <span className="text-[10px] font-extrabold bg-red-500/15 text-red-400 px-3 py-2 rounded-full">⚠️ الإذن مرفوض من المتصفح</span>
          )}
        </div>
      </div>
    </div>
  );
}
