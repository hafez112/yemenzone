import type { Metadata } from 'next';
import InvestClient from './InvestClient';

export const metadata: Metadata = {
  title: 'استثمر في منصة يمن زون — امتلك أسهماً بصك موثق',
  description: 'اشترِ أسهماً من إسهام منصة يمن زون واحصل على صك ملكية رسمي قابل للطباعة والمشاركة. مؤشر السهم يرتفع مع نمو دخل المنصة — تابع قيمة استثمارك لحظة بلحظة.',
  keywords: ['استثمار اليمن', 'أسهم يمن زون', 'صك ملكية أسهم', 'استثمر في اليمن', 'منصة يمن زون'],
  openGraph: {
    title: 'استثمر في منصة يمن زون',
    description: 'امتلك أسهماً في أكبر منصة تجارة إلكترونية يمنية — بصك ملكية رسمي',
    type: 'website', locale: 'ar_YE',
  },
  alternates: { canonical: 'https://yemenzone1.com/invest' },
};

export default function InvestPage() {
  return <InvestClient />;
}
