'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SellerSidebar from '@/components/SellerSidebar';
import MyInvestment from '@/components/shares/MyInvestment';
import { api, getUser } from '@/lib/api';

// 📈 استثماري في المنصة — داخل لوحة البائع: أسهمي، أرباحي، قيمتي الحالية، وصكوكي بطباعة ومشاركة داخلية
export default function SellerInvestmentPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/seller/subscription').then(setData).catch(() => router.push('/seller/setup'));
  }, []);

  if (!data) return null;
  const { store, features } = data;

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={{ ...store, features }} />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-black">📈 استثماري في المنصة</h1>
            <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-teal-100 text-teal-700">أسهمك وأرباحك وصكوكك — بمعرفة تامة</span>
          </div>
          <MyInvestment />
        </div>
      </div>
    </main>
  );
}
