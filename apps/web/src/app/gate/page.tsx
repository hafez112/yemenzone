'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/Toast';

// 🛡️ بوابة لوحة تحكم المنصة — لا تُفتح إلا بالرمز السري أو الرابط الخاص
function GateInner() {
  const router = useRouter();
  const params = useSearchParams();
  const back = params.get('back') || '/admin';
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  async function unlock() {
    if (!key.trim()) return toast('⚠️ أدخل الرمز السري', 'error');
    setBusy(true);
    try {
      const res = await fetch('/gate/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'الرمز غير صحيح');
      toast('✅ فُتحت البوابة — أهلاً بك');
      router.push(back);
      router.refresh();
    } catch (e: any) { toast('🚫 ' + e.message, 'error'); }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-night flex items-center justify-center px-4 relative overflow-hidden">
      {/* توهجات خلفية */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-25 anim-blob" style={{ background: '#6C3DF5' }} />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-20 anim-blob" style={{ background: '#22D3EE', animationDelay: '2s' }} />
      <div className="absolute inset-0 bg-grid opacity-20" />

      <div className="relative w-full max-w-sm">
        <div className="glass-strong rounded-[2rem] p-8 text-center anim-fade-up">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center text-4xl glow-soft anim-soft-pulse"
            style={{ background: 'linear-gradient(135deg, #6C3DF5, #22D3EE)' }}>
            🛡️
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">بوابة الإدارة</h1>
          <p className="text-xs text-gray-500 mb-6">منطقة محمية — لوحة تحكم المنصة لا تُفتح إلا بالرمز السري</p>

          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && unlock()}
            placeholder="الرمز السري"
            dir="ltr"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 outline-none text-center text-lg tracking-widest mb-3 focus:border-purple-400 transition-colors"
          />
          <button onClick={unlock} disabled={busy}
            className="btn-shine w-full py-3.5 rounded-2xl text-white font-extrabold disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6C3DF5, #4F46E5)' }}>
            {busy ? '⏳ جارٍ الفحص...' : '🔓 فتح البوابة'}
          </button>

          <a href="/" className="block mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            → العودة للمنصة
          </a>
        </div>
        <p className="text-center text-[10px] text-white/40 mt-4">محاولات الدخول مسجلة ومراقبة 🔒</p>
      </div>
    </main>
  );
}

export default function GatePage() {
  return <Suspense><GateInner /></Suspense>;
}
