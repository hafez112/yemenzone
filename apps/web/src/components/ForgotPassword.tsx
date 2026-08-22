'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import CaptchaBox from '@/components/CaptchaBox';

// 🔑 استعادة كلمة المرور — 3 خطوات: الجوال ← رمز التحقق ← كلمة مرور جديدة
// تعمل للعميل والبائع — تظهر داخل صفحة الدخول عند الضغط على «نسيت كلمة المرور؟»
export default function ForgotPassword({ userType, onClose }: { userType: 'customer' | 'seller'; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState({ id: '', answer: '' });
  const [capKey, setCapKey] = useState(0);

  const grad = userType === 'seller'
    ? 'linear-gradient(135deg, var(--primary), #9D6BFF)'
    : 'linear-gradient(135deg, var(--secondary), #00BFA5)';

  // الخطوة 1: إرسال رمز التحقق للجوال
  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, userType, purpose: 'reset', captchaId: captcha.id || undefined, captchaAnswer: captcha.answer || undefined }),
      });
      if (r.otpRequired) {
        setStep(2);
        toast('📩 أرسلنا رمز التحقق إلى جوالك');
        if (r.devCode) toast(`🔑 وضع المحاكاة — الرمز: ${r.devCode}`);
      } else {
        toast(r.message || 'استعادة كلمة المرور غير متاحة حالياً', 'error');
      }
    } catch (err: any) { toast(err.message, 'error'); setCapKey(k => k + 1); }
    setLoading(false);
  }

  // الخطوة 2: التحقق من الرمز
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code, userType, purpose: 'reset' }),
      });
      setResetToken(r.resetToken);
      setStep(3);
      toast('✅ تم التحقق — عيّن كلمة مرور جديدة');
    } catch (err: any) { toast(err.message, 'error'); }
    setLoading(false);
  }

  // الخطوة 3: تعيين كلمة المرور الجديدة
  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast('⚠️ كلمتا المرور غير متطابقتين', 'error'); return; }
    if (!/^(?=.*[A-Za-z\u0600-\u06FF])(?=.*\d).{8,}$/.test(password)) {
      toast('كلمة المرور: 8 أحرف على الأقل تجمع أحرفاً وأرقاماً', 'error'); return;
    }
    setLoading(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ phone, userType, resetToken, password }),
      });
      toast('🎉 غيّرنا كلمة مرورك — سجّل دخولك الآن');
      onClose();
    } catch (err: any) { toast(err.message, 'error'); }
    setLoading(false);
  }

  const inp = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 outline-none';

  return (
    <div className="space-y-4">
      {/* مؤشر الخطوات */}
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {['📱 الجوال', '📩 الرمز', '🔑 كلمة جديدة'].map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${step > i ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{s}</span>
            {i < 2 && <span className="text-gray-300 text-xs">←</span>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={sendCode} className="space-y-4">
          <p className="text-xs font-bold text-gray-500 text-center">أدخل رقم جوالك المسجل — سنرسل لك رمز تحقق</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="رقم الجوال" dir="ltr" className={inp} />
          <CaptchaBox key={capKey} scope="login" onChange={(id, answer) => setCaptcha({ id, answer })} />
          <button disabled={loading} className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50" style={{ background: grad }}>
            {loading ? '⏳...' : '📩 إرسال رمز التحقق'}
          </button>
          <button type="button" onClick={onClose} className="w-full text-sm text-gray-400">← رجوع لتسجيل الدخول</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-xs font-bold text-gray-500 text-center">أدخل الرمز المكون من 6 أرقام المرسل إلى <span dir="ltr" className="font-black">{phone}</span></p>
          <input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} placeholder="6 أرقام" dir="ltr"
            className={inp + ' text-center text-2xl tracking-widest'} />
          <button disabled={loading} className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50" style={{ background: grad }}>
            {loading ? '⏳...' : '✅ تحقق'}
          </button>
          <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-400">← تغيير الرقم أو إعادة الإرسال</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={resetPassword} className="space-y-4">
          <p className="text-xs font-bold text-gray-500 text-center">كلمة مرور قوية: 8 أحرف على الأقل تجمع أحرفاً وأرقاماً</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="كلمة المرور الجديدة" className={inp} />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="تأكيد كلمة المرور" className={inp} />
          <button disabled={loading} className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50" style={{ background: grad }}>
            {loading ? '⏳...' : '🔑 تعيين كلمة المرور'}
          </button>
        </form>
      )}
    </div>
  );
}
