'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';
import { toast } from '@/components/Toast';
import CaptchaBox from '@/components/CaptchaBox';

// دخول البائعين برقم الجوال — /auth/login
export default function SellerLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ id: '', answer: '' });
  const [capKey, setCapKey] = useState(0);
  const [otpStep, setOtpStep] = useState(false);
  const [code, setCode] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // محاولة إرسال OTP أولاً
      const r = await api('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, userType: 'seller', purpose: 'login', captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
      });
      if (r.otpRequired) {
        setOtpStep(true);
        toast('تم إرسال رمز التحقق إلى جوالك 📩');
      } else {
        // OTP معطّل → دخول بكلمة المرور
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone, password, userType: 'seller', captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
        });
        saveSession(data, 'seller');
        toast('أهلاً بعودتك 🎉');
        router.push('/seller');
      }
    } catch (err: any) { toast(err.message, 'error'); setCapKey(k => k + 1); }
    setLoading(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code, userType: 'seller', purpose: 'login' }),
      });
      saveSession(data, 'seller');
      toast('تم تسجيل الدخول بنجاح 🎉');
      router.push('/seller');
    } catch (err: any) { toast(err.message, 'error'); setCapKey(k => k + 1); }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-teal-50 px-4 pt-20 pb-24">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl p-6 border border-white/40">
        <h1 className="text-2xl font-extrabold text-center mb-1" style={{ color: 'var(--primary)' }}>دخول البائعين</h1>
        <p className="text-center text-gray-500 text-sm mb-6">سجّل دخولك برقم جوالك لإدارة متجرك</p>

        {!otpStep ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">رقم الجوال</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} required
                placeholder="77xxxxxxx" dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">كلمة المرور <span className="text-gray-400 font-normal">(إن كان OTP معطلاً)</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none" />
            </div>
            <CaptchaBox key={capKey} scope="login" onChange={(id, answer) => setCaptcha({ id, answer })} />
            <button disabled={loading}
              className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}>
              {loading ? '⏳ جاري الدخول...' : 'دخول'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">رمز التحقق OTP</label>
              <input value={code} onChange={e => setCode(e.target.value)} required maxLength={6}
                placeholder="6 أرقام" dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-2xl tracking-widest focus:border-purple-400 outline-none" />
            </div>
            <button disabled={loading}
              className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--secondary), #00BFA5)' }}>
              {loading ? '⏳ جاري التحقق...' : 'تأكيد الرمز'}
            </button>
            <button type="button" onClick={() => setOtpStep(false)} className="w-full text-sm text-gray-400">← رجوع</button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-5">
          ليس لديك متجر؟ <a href="/auth/seller-register" className="text-purple-600 font-bold">أنشئ حساب بائع</a>
        </p>
      </div>
    </main>
  );
}
