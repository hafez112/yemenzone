'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';
import { toast } from '@/components/Toast';
import CaptchaBox from '@/components/CaptchaBox';

// إنشاء حساب بائع جديد — /auth/seller-register (يدعم ?ref= رمز دعوة تاجر)
export default function SellerRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ id: '', answer: '' });
  const [capKey, setCapKey] = useState(0);
  const [otpStep, setOtpStep] = useState(false);
  const [code, setCode] = useState('');
  const [refCode, setRefCode] = useState('');

  // 🤝 التقاط رمز دعوة التاجر من الرابط ?ref=
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setRefCode(ref.trim());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password && !/^(?=.*[A-Za-z\u0600-\u06FF])(?=.*\d).{8,}$/.test(password)) { toast('كلمة المرور: 8 أحرف على الأقل تجمع أحرفاً وأرقاماً', 'error'); return; }
    setLoading(true);
    try {
      // محاولة إرسال OTP أولاً (إن كان مفعّلاً)
      const r = await api('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, userType: 'seller', purpose: 'register', captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
      });
      if (r.otpRequired) {
        setOtpStep(true);
        toast('تم إرسال رمز التحقق إلى جوالك 📩');
      } else {
        // OTP معطّل → تسجيل مباشر بكلمة المرور
        if (!password) { toast('أدخل كلمة المرور', 'error'); setLoading(false); return; }
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ phone, name, password, userType: 'seller', refCode: refCode.trim() || undefined, captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
        });
        saveSession(data, 'seller');
        toast('تم إنشاء حسابك بنجاح 🎉');
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
        body: JSON.stringify({ phone, code, userType: 'seller', purpose: 'register', name, refCode: refCode.trim() || undefined }),
      });
      saveSession(data, 'seller');
      toast('تم إنشاء حسابك بنجاح 🎉');
      router.push('/seller');
    } catch (err: any) { toast(err.message, 'error'); setCapKey(k => k + 1); }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-teal-50 px-4 pt-20 pb-24">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl p-6 border border-white/40">
        <h1 className="text-2xl font-extrabold text-center mb-1" style={{ color: 'var(--primary)' }}>أنشئ حساب بائع</h1>
        <p className="text-center text-gray-500 text-sm mb-6">سجّل الآن وأطلق متجرك الإلكتروني في دقائق 🚀</p>

        {refCode && (
          <div className="mb-4 rounded-xl bg-purple-50 border border-purple-100 px-4 py-2.5 text-center">
            <p className="text-xs font-bold text-purple-700">🤝 وصلتك دعوة من تاجر في يمن زون — سيُخطر بانضمامك فور تسجيلك</p>
          </div>
        )}

        {!otpStep ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">الاسم الكامل</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder="مثال: محمد الحميري"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">رقم الجوال</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} required
                placeholder="77xxxxxxx" dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">كلمة المرور <span className="text-gray-400 font-normal">(إن كان OTP معطلاً)</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none" />
            </div>
            <CaptchaBox key={capKey} scope="register" onChange={(id, answer) => setCaptcha({ id, answer })} />
            <button disabled={loading}
              className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}>
              {loading ? '⏳ جاري الإنشاء...' : 'إنشاء الحساب 🚀'}
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
              {loading ? '⏳ جاري التحقق...' : 'تأكيد وإنشاء الحساب'}
            </button>
            <button type="button" onClick={() => setOtpStep(false)} className="w-full text-sm text-gray-400">← رجوع</button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-5">
          لديك حساب بالفعل؟ <a href="/auth/login" className="text-purple-600 font-bold">سجّل الدخول</a>
        </p>
      </div>
    </main>
  );
}
