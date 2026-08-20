'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/lib/api';
import { toast } from '@/components/Toast';

// صفحة إدخال رمز OTP المستقلة — /auth/verify
export default function VerifyPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code, userType: 'customer', purpose: 'login' }),
      });
      saveSession(data, 'customer');
      toast('تم التحقق بنجاح ✅');
      router.push('/customer');
    } catch (err: any) { toast(err.message, 'error'); }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-teal-50 px-4 pt-20 pb-24">
      <div className="w-full max-w-sm backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl p-6 text-center border border-white/40">
        <div className="text-5xl mb-3">📩</div>
        <h1 className="text-xl font-extrabold mb-4">أدخل رمز التحقق</h1>
        <form onSubmit={submit} className="space-y-4">
          <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="رقم الجوال" dir="ltr"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
          <input value={code} onChange={e => setCode(e.target.value)} required maxLength={6} placeholder="6 أرقام" dir="ltr"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-2xl tracking-widest outline-none" />
          <button disabled={loading}
            className="w-full py-3 rounded-xl text-white font-extrabold shadow-lg disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--primary), #9D6BFF)' }}>
            {loading ? '⏳...' : 'تأكيد'}
          </button>
        </form>
      </div>
    </main>
  );
}
