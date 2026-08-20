'use client';
import StoreTopBar from './StoreTopBar';
import StoreBottomNav from './StoreBottomNav';

// 🧩 إطار المتجر الموحد — الشريط العلوي والسفلي يظهران في كل صفحات المتجر
// (الرئيسية، المنتجات، عرض المنتج، الخصوصية، الشروط، الشهادة)
export default function StoreChrome({ store, primary, children }: { store: any; primary: string; children: React.ReactNode }) {
  return (
    <>
      <StoreTopBar store={store} primary={primary} />
      {children}
      <StoreBottomNav store={store} primary={primary} />
    </>
  );
}
