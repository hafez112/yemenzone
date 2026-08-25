'use client';
import { useEffect, useState } from 'react';
import AdminTopBar from '@/components/admin/AdminTopBar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';

// 🛡️ إطار لوحة تحكم المنصة — شريط علوي + سفلي + نظام الأنماط (نهاري افتراضي/ليلي/ملكي)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [skin, setSkin] = useState('light');

  useEffect(() => {
    setSkin(localStorage.getItem('yz_admin_skin') || 'light');
    const onSkin = (e: any) => setSkin(e.detail || 'light');
    window.addEventListener('yz-admin-skin', onSkin);
    return () => window.removeEventListener('yz-admin-skin', onSkin);
  }, []);

  return (
    <div className={`admin-root skin-${skin}`}>
      <AdminTopBar skin={skin} />
      {children}
      <AdminBottomNav />
    </div>
  );
}
