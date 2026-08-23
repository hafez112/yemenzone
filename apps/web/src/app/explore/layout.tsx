import type { Metadata } from 'next';

// 🔍 ميتا صفحة الاستكشاف — تصفح كل المنتجات والعروض (الصفحة عميل، والميتا من هذا الغلاف)
export const metadata: Metadata = {
  title: 'استكشف المنتجات والعروض — تسوّق من كل المتاجر اليمنية',
  description: 'تصفّح آلاف المنتجات من متاجر يمنية موثوقة: إلكترونيات، أزياء، أغذية وتوابل وأكثر — فلاتر ذكية حسب المحافظة والسعر والتقييم في يمن زون.',
  keywords: ['تسوق أونلاين اليمن', 'منتجات يمنية', 'عروض اليمن', 'إلكترونيات', 'أزياء يمنية', 'سوق يمني', 'يمن زون'],
  alternates: { canonical: '/explore' },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
