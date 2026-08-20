'use client';
import BookingDashboard from '@/components/BookingDashboard';

export default function ServicesPage() {
  return (
    <BookingDashboard
      kind="services"
      config={{
        title: 'لوحة الخدمات', icon: '🛠️',
        itemName: 'خدمة', itemPlural: 'الخدمات', bookingName: 'الطلبات الواردة',
        priceLabel: 'سعر الخدمة (ر.ي)',
        fields: [
          { key: 'category', label: 'تصنيف الخدمة', placeholder: 'مثال: صيانة / تصميم / نقل' },
          { key: 'duration', label: 'مدة التنفيذ', placeholder: 'مثال: 3 أيام / أسبوع' },
          { key: 'durationMin', label: 'مدة الجلسة (دقيقة)', type: 'number' },
          { key: 'warrantyText', label: 'نص الضمان', placeholder: 'مثال: ضمان 30 يوم على الإصلاح' },
        ],
      }}
    />
  );
}
