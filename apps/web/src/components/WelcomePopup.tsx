'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { imgUrl } from '@/lib/api';

// ═══ 💬 رسالة المنصة المنبثقة — تظهر للزائر عند دخول المنصة مع صوت تنبيه اختياري ═══
// يديرها المدير من لوحة التحكم (/admin/popups): العنوان، النص، الصورة، الزر، الصوت، التكرار، الجدولة

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🔊 نغمة تنبيه قصيرة لطيفة (٣ نغمات صاعدة) — تُولَّد برمجياً فلا حاجة لملف صوتي
export function playPopupChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    const notes = [523.25, 659.25, 783.99]; // دو – مي – صول
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(1, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.36);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch { /* الصوت غير متاح — نتجاهل بصمت */ }
}

// 🗓️ هل تظهر الرسالة الآن حسب سياسة التكرار؟
function shouldShow(id: string, frequency: string): boolean {
  const key = `yz_popup_${id}`;
  try {
    if (frequency === 'always') return true;
    if (frequency === 'session') return !sessionStorage.getItem(key);
    const seen = Number(localStorage.getItem(key) || 0);
    if (!seen) return true;
    if (frequency === 'once') return false;
    if (frequency === 'daily') {
      const day = 24 * 60 * 60 * 1000;
      return Date.now() - seen >= day;
    }
    return false;
  } catch { return true; }
}

function markSeen(id: string, frequency: string) {
  const key = `yz_popup_${id}`;
  try {
    if (frequency === 'session') sessionStorage.setItem(key, '1');
    else localStorage.setItem(key, String(Date.now()));
  } catch { /* تجاهل */ }
}

export default function WelcomePopup() {
  const pathname = usePathname() || '/';
  const [popup, setPopup] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const playedRef = useRef(false);

  // لا تظهر في لوحات التحكم وصفحات الدخول — للزوار والعملاء فقط
  const excluded = /^\/(admin|seller|auth|driver)/.test(pathname);

  useEffect(() => {
    if (excluded || !API) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/v1/popup`, { cache: 'no-store' });
        if (!res.ok) return;
        const d = await res.json();
        const p = d?.popup;
        if (!p || cancelled) return;
        if (!shouldShow(p.id, p.frequency)) return;
        setPopup(p);
        // ⏱️ تأخير بسيط كي يكتمل تحميل الصفحة ثم تظهر الرسالة بهدوء
        setTimeout(() => { if (!cancelled) setVisible(true); }, 900);
      } catch { /* الشبكة مشغولة — بلا إزعاج للزائر */ }
    })();
    return () => { cancelled = true; };
  }, [excluded]);

  // 🔊 تشغيل الصوت عند الظهور — والمتصفحات قد تمنع التشغيل التلقائي قبل أول لمسة،
  // لذا نعيد المحاولة مع أول تفاعل من المستخدم طالما الرسالة ظاهرة
  useEffect(() => {
    if (!visible || !popup?.sound || playedRef.current) return;
    playPopupChime();
    playedRef.current = true;
    const retry = () => {
      if (playedRef.current === false) return;
      document.removeEventListener('pointerdown', retry);
    };
    // إن حجب المتصفح الصوت تلقائياً فسيظهر خطأ داخلي صامت؛ اللمسة الأولى تكفي عادةً
    document.addEventListener('pointerdown', retry, { once: true });
    return () => document.removeEventListener('pointerdown', retry);
  }, [visible, popup]);

  if (!popup || !visible) return null;

  const close = () => {
    markSeen(popup.id, popup.frequency);
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-[fadeIn_.25s_ease]"
      onClick={close} role="dialog" aria-modal="true" aria-label={popup.title}>
      <div className="w-full max-w-sm rounded-[1.75rem] bg-white shadow-2xl overflow-hidden border border-gray-100 animate-[popIn_.3s_ease]"
        onClick={e => e.stopPropagation()}>
        {popup.image && (
          <div className="relative">
            <img src={imgUrl(popup.image)} alt={popup.title} className="w-full aspect-[16/8] object-cover" />
            <button onClick={close} aria-label="إغلاق"
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/45 text-white text-lg font-bold grid place-items-center active:scale-90 transition">✕</button>
          </div>
        )}
        <div className="p-5 sm:p-6 text-center">
          {!popup.image && (
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl grid place-items-center text-3xl"
              style={{ background: 'linear-gradient(135deg,#6C3DF5,#22d3ee)' }}>
              <span className="drop-shadow">💬</span>
            </div>
          )}
          <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-7">{popup.title}</h3>
          <p className="mt-2 text-sm leading-7 text-gray-600 whitespace-pre-line">{popup.body}</p>
          <div className="mt-4 flex flex-col gap-2">
            {popup.btnText && popup.btnLink && (
              <a href={popup.btnLink} onClick={close}
                className="w-full py-3 rounded-2xl text-white text-sm font-extrabold active:scale-[.98] transition text-center"
                style={{ background: 'linear-gradient(135deg,#6C3DF5,#8b5cf6)' }}>
                {popup.btnText}
              </a>
            )}
            <button onClick={close}
              className={`w-full py-3 rounded-2xl text-sm font-bold active:scale-[.98] transition ${popup.btnText && popup.btnLink ? 'bg-gray-100 text-gray-600' : 'text-white'}`}
              style={popup.btnText && popup.btnLink ? undefined : { background: 'linear-gradient(135deg,#6C3DF5,#8b5cf6)' }}>
              {popup.btnText && popup.btnLink ? 'إغلاق' : 'حسناً، فهمت'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
