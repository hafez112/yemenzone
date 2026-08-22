'use client';
import { useEffect, useRef, useState } from 'react';

// 🔊 مدير جينجل الافتتاح — يعزف مرة واحدة عند أول تفاعل للزائر (سياسة المتصفحات)
// ثم يبقى زر صغير أنيق لإعادة العزف أو الكتم — يتذكر الاختيار خلال الجلسة
export default function LaunchSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<'idle' | 'played' | 'muted'>('idle');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const a = new Audio('/ads/launch-jingle.mp3');
    a.volume = 0.55;
    a.preload = 'none';
    audioRef.current = a;
    if (sessionStorage.getItem('yz_jingle_muted') === '1') setState('muted');

    const play = () => {
      if (sessionStorage.getItem('yz_jingle_played') === '1' || sessionStorage.getItem('yz_jingle_muted') === '1') {
        cleanup(); setVisible(true); return;
      }
      a.play().then(() => {
        sessionStorage.setItem('yz_jingle_played', '1');
        setState('played');
      }).catch(() => { /* رُفض العزف التلقائي — يبقى الزر */ })
        .finally(() => { cleanup(); setVisible(true); });
    };
    const onGesture = () => play();
    const cleanup = () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('scroll', onGesture);
    };
    window.addEventListener('pointerdown', onGesture, { once: false });
    window.addEventListener('scroll', onGesture, { once: false, passive: true });
    // مهلة: إن لم يتفاعل الزائر أظهر الزر فحسب
    const t = setTimeout(() => { cleanup(); setVisible(true); }, 15000);
    a.addEventListener('ended', () => setState((s) => (s === 'muted' ? 'muted' : 'played')));
    return () => { clearTimeout(t); cleanup(); a.pause(); };
  }, []);

  if (!visible) return null;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (state === 'muted') {
      sessionStorage.removeItem('yz_jingle_muted');
      a.currentTime = 0;
      a.play().catch(() => {});
      setState('played');
    } else {
      a.pause();
      sessionStorage.setItem('yz_jingle_muted', '1');
      setState('muted');
    }
  };

  return (
    <button onClick={toggle} aria-label={state === 'muted' ? 'تشغيل الصوت' : 'كتم الصوت'}
      title={state === 'muted' ? '🎵 اسمع جينجل يمن زون' : '🔇 كتم الصوت'}
      className={`fixed bottom-20 left-3 z-[60] w-11 h-11 rounded-full grid place-items-center text-lg shadow-xl border backdrop-blur transition-all anim-bounce-in ${
        state === 'muted'
          ? 'bg-white/80 border-gray-200 grayscale'
          : 'bg-gradient-to-br from-purple-600 to-fuchsia-600 border-white/30 text-white anim-pulse-glow'
      }`}>
      {state === 'muted' ? '🔇' : '🎵'}
    </button>
  );
}
