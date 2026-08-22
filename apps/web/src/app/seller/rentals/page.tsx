'use client';
import BookingDashboard from '@/components/BookingDashboard';

export default function RentalsPage() {
  return (
    <BookingDashboard
      kind="rentals"
      config={{
        title: 'لوحة الإيجارات', icon: '🏠',
        itemName: 'وحدة', itemPlural: 'الوحدات', bookingName: 'الحجوزات',
        priceLabel: 'السعر اليومي',
        fields: [
          { key: 'type', label: 'النوع', type: 'select', options: ['شقة', 'فيلا', 'محل تجاري', 'مكتب', 'مخزن', 'أرض', 'استراحة', 'أخرى'] },
          { key: 'address', label: 'العنوان', placeholder: 'العنوان والموقع' },
          { key: 'pricePerMonth', label: 'الإيجار الشهري (بنفس عملة الوحدة)', type: 'number' },
          { key: 'deposit', label: 'التأمين المسترد (بنفس عملة الوحدة)', type: 'number' },
          { key: 'areaM2', label: 'المساحة (م²)', type: 'number' },
          { key: 'roomsCount', label: 'عدد الغرف', type: 'number' },
        ],
      }}
    />
  );
}
