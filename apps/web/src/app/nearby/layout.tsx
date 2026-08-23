import type { Metadata } from 'next';

// 📍 ميتا صفحة «قريب منك» — المتاجر والخدمات الأقرب لموقع الزائر
export const metadata: Metadata = {
  title: 'قريب منك — متاجر وخدمات ومطاعم حول موقعك',
  description: 'اكتشف المتاجر والمطاعم والفنادق والخدمات الأقرب إليك في محافظتك — مسافات دقيقة واتجاهات مباشرة عبر يمن زون.',
  keywords: ['قريب مني', 'متاجر قريبة', 'مطاعم قريبة', 'خدمات قريبة', 'صنعاء', 'عدن', 'تعز', 'يمن زون'],
  alternates: { canonical: '/nearby' },
};

export default function NearbyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
