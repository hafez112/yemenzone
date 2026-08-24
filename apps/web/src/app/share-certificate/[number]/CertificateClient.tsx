'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import CertificateView from '@/components/shares/CertificateView';

// 📜 صفحة الصك العامة (تحقق بالرقم) — تعرض التصميم المشترك الملون القابل للطباعة
export default function CertificateClient({ number }: { number: string }) {
  const [c, setC] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api(`/v1/shares/certificate/${number}`).then(setC).catch((e) => setErr(e.message));
  }, [number]);

  if (err) return (
    <main className="min-h-screen grid place-items-center bg-slate-100 px-3">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <b className="text-lg">{err}</b>
        <p className="text-gray-500 text-sm mt-2">تأكد من رقم الصك — يبدأ بـ YZS-</p>
        <Link href="/invest" className="inline-block mt-4 px-6 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-extrabold">📈 صفحة الاستثمار</Link>
      </div>
    </main>
  );
  if (!c) return (
    <main className="min-h-screen grid place-items-center bg-slate-100">
      <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
    </main>
  );

  return (
    <main className="min-h-screen py-8 px-3 print:bg-white print:py-0" style={{ background: 'linear-gradient(160deg, #0f172a, #134e4a)' }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <CertificateView c={c} />

        {/* 📊 بطاقة القيمة الحية — تختفي عند الطباعة */}
        <div className="glass rounded-3xl p-4 print:hidden flex items-center justify-between flex-wrap gap-3 bg-white/90">
          <div>
            <b className="text-sm">📊 قيمة استثمارك اليوم</b>
            <p className="text-[11px] font-bold text-gray-500 mt-0.5">
              مؤشر YZX {c.yzx.toLocaleString()} · السعر الاسترشادي {c.indexPrice.toLocaleString()} ر.ي / سهم
            </p>
          </div>
          <div className="text-left">
            <div className="text-2xl font-black text-emerald-600">{c.currentValue.toLocaleString()} <span className="text-sm">ر.ي</span></div>
            <div className={`text-[10px] font-extrabold ${c.currentValue >= c.totalAmount ? 'text-emerald-500' : 'text-red-400'}`}>
              {c.currentValue >= c.totalAmount ? '▲ ربح' : '▼'} {Math.abs(c.currentValue - c.totalAmount).toLocaleString()} ر.ي عن الشراء
            </div>
          </div>
        </div>

        <div className="text-center print:hidden">
          <Link href="/invest" className="text-[11px] font-extrabold text-teal-200 underline">📈 اشترِ المزيد من الأسهم</Link>
        </div>
      </div>
    </main>
  );
}
