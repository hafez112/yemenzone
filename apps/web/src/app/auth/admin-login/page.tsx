'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';
import { toast } from '@/components/Toast';
import CaptchaBox from '@/components/CaptchaBox';

// دخول الإدارة — صفحة منفصلة بالبريد الإلكتروني — /auth/admin-login
export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [need2fa, setNeed2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ id: '', answer: '' });
  const [capKey, setCapKey] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ email, password, totp: totp || undefined, captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
      });
      saveSession(data, 'admin');
      toast('مرحباً بك في لوحة الإدارة 🛡️');
      router.push('/admin');
    } catch (err: any) {
      // 🔐 الحساب محمي بالمصادقة الثنائية — أظهر حقل الرمز
      if (String(err.message).includes('2FA_REQUIRED')) {
        setNeed2fa(true);
        toast('🔐 هذا الحساب محمي — أدخل رمز المصادقة من تطبيقك', 'error');
      } else toast(err.message, 'error');
      setCapKey(k => k + 1);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--dark)' }}>
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 rounded-3xl shadow-2xl p-6 border border-white/10">
        <div className="text-center text-4xl mb-3">🛡️</div>
        <h1 className="text-2xl font-extrabold text-center mb-1 text-white">لوحة الإدارة</h1>
        <p className="text-center text-gray-400 text-sm mb-6">دخول مدراء المنصة فقط — منطقة محمية</p>
        <form onSubmit={submit} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="البريد الإلكتروني" dir="ltr"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400 outline-none" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="كلمة المرور"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400 outline-none" />
          {need2fa && (
            <div className="anim-bounce-in">
              <input value={totp} onChange={e => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))} required
                placeholder="● ● ● ● ● ●" dir="ltr" inputMode="numeric" autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-teal-400/50 text-white text-center text-2xl tracking-[.6em] font-black placeholder-gray-500 focus:border-teal-300 outline-none" />
              <p className="text-center text-teal-300/80 text-xs mt-2">🔐 أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة</p>
            </div>
          )}
          <CaptchaBox key={capKey} scope="login" onChange={(id, answer) => setCaptcha({ id, answer })} />
          <button disabled={loading}
            className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}>
            {loading ? '⏳ جاري التحقق...' : need2fa ? '✅ تحقق وادخل' : '🔐 دخول آمن'}
          </button>
        </form>
      </div>
    </main>
  );
}
