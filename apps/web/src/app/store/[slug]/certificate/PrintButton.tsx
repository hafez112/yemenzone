'use client';

// 🖨️ زر طباعة الشهادة — مكوّن عميل منفصل لأن معالجات الأحداث غير مسموحة في مكوّنات الخادم
export default function PrintButton() {
  return (
    <button onClick={() => window.print()}
      className="btn-primary px-6 py-3 rounded-full text-white font-extrabold shadow-xl">
      🖨️ طباعة الشهادة
    </button>
  );
}
