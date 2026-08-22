'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import SellerSidebar from '@/components/SellerSidebar';
import SupportCenter from '@/components/SupportCenter';

// 🎧 دعم البائع — مراسلة إدارة المنصة من لوحة المتجر
export default function SellerSupportPage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => router.push('/seller/setup'));
  }, []);

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">🎧 الدعم الفني</h1>
          <p className="text-sm text-gray-500 mb-4">راسل إدارة المنصة مباشرة — استفسارات، مشاكل، واقتراحات تطوّر متجرك والمنصة 💡</p>
          <SupportCenter base="/seller/support" />
        </div>
      </div>
    </main>
  );
}
