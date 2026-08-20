'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';
import { toast } from '@/components/Toast';
import CaptchaBox from '@/components/CaptchaBox';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// تسجيل حساب عميل جديد — /auth/customer-register (يدعم ?ref= رمز الدعوة)
export default function CustomerRegister() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [refCode, setRefCode] = useState('');
  const [refName, setRefName] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ id: '', answer: '' });
  const [capKey, setCapKey] = useState(0);

  // التقاط رمز الدعوة من الرابط ?ref=
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setRefCode(ref);
  }, []);

  // التحقق الحي من رمز الدعوة
  useEffect(() => {
    const c = refCode.trim();
    if (!c) { setRefName(null); return; }
    const t = setTimeout(() => {
      fetch(`${API}/api/v1/referral/check?code=${encodeURIComponent(c)}`)
        .then((r) => r.json())
        .then((d) => setRefName(d.valid ? d.name : ''))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [refCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: form.phone, userType: 'customer', purpose: 'register', captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
      });
      if (r.otpRequired) {
        setOtpStep(true);
        toast('أدخل رمز التحقق المرسل 📩');
      } else {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ ...form, userType: 'customer', refCode: refCode.trim() || undefined, captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
        });
        saveSession(data, 'customer');
        toast(refName ? `تم إنشاء حسابك — وصلتك نقاط هدية ${refName} 🎁` : 'تم إنشاء حسابك بنجاح 🎉');
        router.push('/customer?tab=points');
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
        body: JSON.stringify({
          phone: form.phone, code, userType: 'customer', purpose: 'register',
          name: form.name, refCode: refCode.trim() || undefined,
        }),
      });
      saveSession(data, 'customer');
      toast(refName ? `تم إنشاء حسابك — وصلتك نقاط هدية ${refName} 🎁` : 'تم إنشاء حسابك بنجاح 🎉');
      router.push('/customer?tab=points');
    } catch (err: any) { toast(err.message, 'error'); setCapKey(k => k + 1); }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-purple-50 px-4 pt-20 pb-24">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl p-6 border border-white/40">
        <h1 className="text-2xl font-extrabold text-center mb-1 text-teal-600">حساب عميل جديد</h1>
        <p className="text-center text-gray-500 text-sm mb-6">سجّل مجاناً وابدأ التسوق</p>
        {!otpStep ? (
          <form onSubmit={submit} className="space-y-4">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="الاسم الكامل"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 outline-none" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required placeholder="رقم الجوال" dir="ltr"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 outline-none" />
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="كلمة المرور (6+ أحرف)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 outline-none" />
            {/* 🎁 رمز الدعوة */}
            <div>
              <input value={refCode} onChange={e => setRefCode(e.target.value)} placeholder="🎁 رمز دعوة صديق (اختياري — نقاط هدية لك وله)" dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 outline-none" />
              {refName && (
                <div className="text-xs font-bold text-emerald-600 mt-1">✅ دعوة من {refName} — ستصلكما نقاط فور التسجيل</div>
              )}
              {refName === '' && refCode.trim() && (
                <div className="text-xs font-bold text-red-500 mt-1">❌ الرمز غير صحيح — تأكد منه أو أكمل بدونه</div>
              )}
            </div>
            <CaptchaBox key={capKey} scope="register" onChange={(id, answer) => setCaptcha({ id, answer })} />
            <button disabled={loading}
              className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--secondary), #00BFA5)' }}>
              {loading ? '⏳...' : 'إنشاء الحساب'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <input value={code} onChange={e => setCode(e.target.value)} required maxLength={6} placeholder="رمز OTP" dir="ltr"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-2xl tracking-widest focus:border-teal-400 outline-none" />
            <button disabled={loading}
              className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--secondary), #00BFA5)' }}>
              {loading ? '⏳...' : 'تأكيد'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
