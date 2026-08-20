'use client';
import BookingDashboard from '@/components/BookingDashboard';

export default function RoomsPage() {
  return (
    <BookingDashboard
      kind="hotel"
      config={{
        title: 'لوحة الغرف الفندقية', icon: '🏨',
        itemName: 'غرفة', itemPlural: 'الغرف', bookingName: 'الحجوزات',
        priceLabel: 'سعر الليلة (ر.ي)',
        fields: [
          { key: 'roomType', label: 'نوع الغرفة', type: 'select', options: ['مفردة', 'مزدوجة', 'ثلاثية', 'جناح', 'جناح ملكي', 'عائلية'] },
          { key: 'capacity', label: 'السعة', type: 'number', placeholder: 'عدد الضيوف' },
          { key: 'beds', label: 'عدد الأسِرّة', type: 'number' },
          { key: 'view', label: 'الإطلالة', placeholder: 'مثال: بحر / جبل / مدينة' },
          { key: 'breakfast', label: '🍳 يشمل الإفطار', type: 'checkbox' },
        ],
      }}
    />
  );
}
