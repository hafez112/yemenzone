import type { Metadata } from 'next';

// 🛠️ ميتا صفحة الخدمات — احجز خدمة موثوقة في محافظتك
export const metadata: Metadata = {
  title: 'الخدمات — احجز خدمات موثوقة في كل المحافظات',
  description: 'ابحث واحجز خدمات يمنية موثوقة: صيانة، نقل، تصميم، تعليم وأكثر — مقدمو خدمة موثقون في كل المحافظات عبر يمن زون.',
  keywords: ['خدمات يمنية', 'حجز خدمات', 'صيانة', 'خدمات صنعاء', 'خدمات عدن', 'مقدمو خدمات', 'يمن زون'],
  alternates: { canonical: '/services' },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
