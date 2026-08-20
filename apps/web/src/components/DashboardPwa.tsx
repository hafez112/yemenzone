'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from './Toast';

const APP_INFO: Record<string, { icon: string; label: string }> = {
  seller:   { icon: '🏪', label: 'لوحة البائع' },
  driver:   { icon: '🛵', label: 'لوحة السائق' },
  customer: { icon: '👤', label: 'لوحة حسابك' },
};

// 📱 بطاقة تطبيق الويب التقدمي للوحات — يطلب المستخدم، تعتمد الإدارة، يظهر زر التثبيت
export default function DashboardPwa({ app }: { app: 'seller' | 'driver' | 'customer' }) {
  const [state, setState] = useState<any>(null);
  const [installEvt, setInstallEvt] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [pushState, setPushState] = useState<'loading' | 'on' | 'off' | 'denied' | 'unsupported'>('loading');
  const [pushBusy, setPushBusy] = useState(false);
  const info = APP_INFO[app];

  const load = () => api('/pwa/my').then(setState).catch(() => setState({ request: null, approved: false }));
  useEffect(() => { load(); }, []);

  // ✅ عند الاعتماد: استبدال/حقن مانيفست اللوحة + التقاط حدث التثبيت
  useEffect(() => {
    if (!state?.approved) return;
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (link) {
      if (!link.href.includes('/pwa-manifest/')) link.href = `/pwa-manifest/${app}`;
    } else {
      // 🔧 إصلاح المسار: لا مانيفست موروثاً في اللوحات — نحقن مانيفست اللوحة من الصفر
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = `/pwa-manifest/${app}`;
      document.head.appendChild(link);
    }
    const onInstall = (e: any) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, [state?.approved, app]);

  // 🔔 فحص حالة الإشعارات الحالية
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushState('unsupported'); return;
      }
      if (Notification.permission === 'denied') { setPushState('denied'); return; }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setPushState(sub ? 'on' : 'off');
      } catch { setPushState('off'); }
    })();
  }, []);

  const b64ToUint8 = (base64: string) => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  };

  // 🔔 تفعيل إشعارات اللوحة — تصل حتى والتطبيق مغلق تماماً
  async function enablePush() {
    setPushBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushState('denied'); toast('⚠️ رُفض الإذن — فعّله من إعدادات المتصفح', 'error'); setPushBusy(false); return; }
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        await navigator.serviceWorker.register('/sw.js');
        reg = await navigator.serviceWorker.ready;
      }
      const { publicKey } = await api('/push/vapid');
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) });
      await api('/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
      setPushState('on');
      toast('🔔 فُعّلت الإشعارات — تصلك التنبيهات فوراً حتى والتطبيق مغلق');
    } catch (e: any) { toast(e.message || 'تعذر تفعيل الإشعارات', 'error'); }
    setPushBusy(false);
  }

  async function requestPwa() {
    setBusy(true);
    try {
      const r = await api('/pwa/request', { method: 'POST', body: JSON.stringify({}) });
      toast(r.message || '✅ أُرسل طلبك');
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(false);
  }

  async function install() {
    if (installEvt) {
      installEvt.prompt();
      await installEvt.userChoice;
      setInstallEvt(null);
      toast('📱 رائع! لوحتك صارت تطبيقاً على جوالك');
    } else {
      toast('📱 من قائمة المتصفح ⋮ اختر «إضافة إلى الشاشة الرئيسية»', 'success');
    }
  }

  if (!state) return null;
  const req = state.request;

  return (
    <div className="glass rounded-3xl p-4 relative overflow-hidden">
      <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full opacity-15 anim-blob" style={{ background: 'var(--primary)' }} />
      <div className="relative flex items-center gap-3 flex-wrap">
        <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 glow-soft"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary, #00E5C7))' }}>
          📱
        </span>
        <div className="flex-1 min-w-[180px]">
          <div className="font-extrabold text-sm">تطبيق {info.label}</div>
          <div className="text-[11px] text-gray-500">
            {!req && 'ركّب لوحتك كتطبيق مستقل على جوالك — باعتماد الإدارة'}
            {req?.status === 'pending' && '⏳ طلبك قيد مراجعة الإدارة — سيُفعّل التثبيت فور الموافقة'}
            {req?.status === 'rejected' && `❌ اعتذرت الإدارة هذه المرة${req.note ? `: ${req.note}` : ''} — يمكنك إعادة الطلب`}
            {state.approved && '✅ اعتمدت الإدارة تطبيقك — ثبّته الآن وافتحه من أيقونته مباشرة'}
          </div>
        </div>

        {!req && (
          <button onClick={requestPwa} disabled={busy}
            className="btn-primary text-white text-xs font-extrabold px-4 py-2.5 rounded-full disabled:opacity-40 shrink-0">
            {busy ? '⏳...' : '📱 اطلب التطبيق'}
          </button>
        )}
        {req?.status === 'pending' && (
          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-700 px-3 py-2 rounded-full shrink-0 anim-soft-pulse">⏳ قيد المراجعة</span>
        )}
        {req?.status === 'rejected' && (
          <button onClick={requestPwa} disabled={busy}
            className="text-xs font-extrabold px-4 py-2.5 rounded-full bg-white border border-gray-200 disabled:opacity-40 shrink-0">
            {busy ? '⏳...' : '🔁 أعد الطلب'}
          </button>
        )}
        {state.approved && (
          <button onClick={install}
            className="btn-shine text-white text-xs font-extrabold px-5 py-2.5 rounded-full shrink-0 anim-soft-pulse"
            style={{ background: 'linear-gradient(135deg, #059669, #0D9488)' }}>
            📲 ثبّت لوحتك كتطبيق
          </button>
        )}
      </div>

      {/* 🔔 إشعارات اللوحة الفورية — تصل حتى والتطبيق مغلق */}
      {pushState !== 'unsupported' && pushState !== 'loading' && (
        <div className="relative mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${pushState === 'on' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            {pushState === 'on' ? '🔔' : '🔕'}
          </span>
          <div className="flex-1 min-w-[160px]">
            <div className="font-extrabold text-xs">إشعارات {info.label} الفورية</div>
            <div className="text-[10px] text-gray-500">
              {pushState === 'on' && '✅ مفعّلة — تصلك التنبيهات فوراً حتى والتطبيق مغلق تماماً'}
              {pushState === 'off' && 'فعّلها لتصلك التنبيهات المهمة حتى وأنت خارج التطبيق'}
              {pushState === 'denied' && '⚠️ الإذن مرفوض من المتصفح — فعّله من إعدادات الموقع'}
            </div>
          </div>
          {pushState === 'off' && (
            <button onClick={enablePush} disabled={pushBusy}
              className="text-[11px] font-extrabold px-4 py-2 rounded-full text-white disabled:opacity-40 shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), #4f46e5)' }}>
              {pushBusy ? '⏳...' : '🔔 فعّل الإشعارات'}
            </button>
          )}
          {pushState === 'on' && (
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full shrink-0">مفعّلة ✓</span>
          )}
        </div>
      )}
    </div>
  );
}
