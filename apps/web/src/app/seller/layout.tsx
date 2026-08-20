'use client';
import SellerTopBar from '@/components/seller/SellerTopBar';
import SellerBottomNav from '@/components/seller/SellerBottomNav';

// 🏪 إطار لوحة البائع — شريط علوي خاص + شريط سفلي ثابت في كل صفحات اللوحة
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SellerTopBar />
      {children}
      <SellerBottomNav />
    </>
  );
}
