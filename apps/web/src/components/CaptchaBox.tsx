'use client';
import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🤖 «لست روبوت» — كابتشا محلية بالكامل (بلا خوادم خارجية)
// تجلب نطاقها من إعدادات الدرع: إن عطّلته الإدارة لا تعرض شيئاً وتمرر قيماً فارغة
export default function CaptchaBox({ scope, onChange }: {
  scope: 'login' | 'register' | 'otp' | 'complaint' | 'return';
  onChange: (id: string, answer: string) => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [captcha, setCaptcha] = useState<{ id: string; svg: string } | null>(null);
  const [answer, setAnswer] = useState('');
  const [err, setErr] = useState(false);

  const load = useCallback(() => {
    fetch(`${API}/api/v1/captcha`)
      .then((r) => r.json())
      .then((d) => { if (d.id) setCaptcha(d); })
      .catch(() => setErr(true));
    setAnswer('');
    onChange('', '');
  }, []);

  useEffect(() => {
    fetch(`${API}/api/v1/shield/public`)
      .then((r) => r.json())
      .then((d) => {
        const on = !!d?.captcha?.[scope];
        setEnabled(on);
        if (on) load();
      })
      .catch(() => setEnabled(false)); // تعذر الفحص = لا نعطّل المستخدم
  }, [scope]);

  if (!enabled) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-extrabold text-gray-500 flex-1">🤖 تحقق أنك لست روبوت — كم الناتج؟</span>
        <button type="button" onClick={load} title="تحديث"
          className="w-8 h-8 rounded-full bg-white border border-gray-200 text-sm hover:bg-gray-100 transition-all">↻</button>
      </div>
      <div className="flex items-center gap-2" dir="ltr">
        <div className="rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 min-h-[56px] flex items-center justify-center min-w-[180px]">
          {captcha
            ? <span dangerouslySetInnerHTML={{ __html: captcha.svg }} />
            : <span className="text-xs text-gray-400 px-3">{err ? '⚠️ تعذر التحميل — ↻' : '⏳...'}</span>}
        </div>
        <input value={answer} inputMode="numeric" dir="ltr"
          onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 3); setAnswer(v); onChange(captcha?.id || '', v); }}
          placeholder="الناتج"
          className="w-24 px-3 py-3 rounded-xl border border-gray-200 text-center font-black text-lg outline-none focus:border-purple-400 bg-white" />
      </div>
    </div>
  );
}
