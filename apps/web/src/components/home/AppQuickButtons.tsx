// 🔘 أزرار الخدمات السريعة للرئيسية — تظهر داخل تطبيق أندرويد فقط
// تُدار بالكامل من /admin/design ← تبويب «📱 التطبيق» ← بطاقة أزرار الخدمات
// تستخدم فئات Tailwind القياسية (bg-white / text-gray-700 / border-gray-100)
// حتى تتبع ثيم التطبيق المختار تلقائياً (فاتحاً كان أو داكناً)

// الأزرار الافتراضية — خدمات حقيقية قائمة في المنصة
export const DEFAULT_APP_BUTTONS = [
  { icon: '🔎', label: 'صيّاد الأسعار', href: '/tools/price-hunt', on: true },
  { icon: '⚡', label: 'بيع بسرعة', href: '/tools/quick-sell', on: true },
  { icon: '♻️', label: 'المستعمل', href: '/tools/used-market', on: true },
  { icon: '📣', label: 'الطلبات', href: '/tools/requests', on: true },
  { icon: '🎁', label: 'عروض اليوم', href: '/offers', on: true },
  { icon: '📍', label: 'القريب منك', href: '/nearby', on: true },
  { icon: '🗂️', label: 'دليل المتاجر', href: '/directory', on: true },
  { icon: '🧰', label: 'كل الخدمات', href: '/tools', on: true },
];

export default function AppQuickButtons({ buttons }: { buttons?: any[] }) {
  const src = Array.isArray(buttons) ? buttons : DEFAULT_APP_BUTTONS;
  const list = src.filter((b) => b && b.on !== false && b.label && b.href);
  if (!list.length) return null;
  return (
    <section className="yz-app-only px-3 pt-2 pb-1 max-w-6xl mx-auto" aria-label="خدمات سريعة">
      <div className="grid grid-cols-4 gap-2">
        {list.map((b, i) => (
          <a key={i} href={b.href}
            className="flex flex-col items-center gap-1 bg-white border border-gray-100 rounded-2xl py-2.5 px-1 shadow-sm transition-transform active:scale-95">
            <span className="text-xl leading-none">{b.icon || '⭐'}</span>
            <span className="text-[10px] font-bold text-gray-700 leading-tight text-center">{b.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
