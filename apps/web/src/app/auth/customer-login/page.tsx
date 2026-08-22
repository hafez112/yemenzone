'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';
import { toast } from '@/components/Toast';
import CaptchaBox from '@/components/CaptchaBox';
import ForgotPassword from '@/components/ForgotPassword';

// دخول العملاء برقم الجوال — /auth/customer-login
export default function CustomerLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ id: '', answer: '' });
  const [capKey, setCapKey] = useState(0);
  const [forgot, setForgot] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password, userType: 'customer', captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
      });
      saveSession(data, 'customer');
      toast('أهلاً بك 🎉');
      router.push('/customer');
    } catch (err: any) { toast(err.message, 'error'); setCapKey(k => k + 1); }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-purple-50 px-4 pt-20 pb-24">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl p-6 border border-white/40">
        <h1 className="text-2xl font-extrabold text-center mb-1 text-teal-600">{forgot ? '🔑 استعادة كلمة المرور' : 'دخول العملاء'}</h1>
        <p className="text-center text-gray-500 text-sm mb-6">{forgot ? 'ثلاث خطوات وتعود لحسابك' : 'تسوّق وتتبّع طلباتك بسهولة'}</p>
        {forgot ? (
          <ForgotPassword userType="customer" onClose={() => setForgot(false)} />
        ) : (
        <form onSubmit={submit} className="space-y-4">
          <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="رقم الجوال" dir="ltr"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 outline-none" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="كلمة المرور"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 outline-none" />
          <CaptchaBox key={capKey} scope="login" onChange={(id, answer) => setCaptcha({ id, answer })} />
          <button disabled={loading}
            className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--secondary), #00BFA5)' }}>
            {loading ? '⏳...' : 'دخول'}
          </button>
          <button type="button" onClick={() => setForgot(true)}
            className="w-full text-center text-sm font-bold text-teal-600 hover:underline">
            🔑 نسيت كلمة المرور؟ استعدها برمز تحقق
          </button>
        </form>
        )}
        <p className="text-center text-sm text-gray-500 mt-5">
          جديد هنا؟ <a href="/auth/customer-register" className="text-teal-600 font-bold">أنشئ حساب عميل</a>
        </p>
      </div>
    </main>
  );
}
