// المميزات — شبكة Bento غير متناظرة بأسلوب 2027
const FEATURES = [
  { icon: '🛍️', t: '4 أنواع متاجر', d: 'منتجات، وحدات إيجار، فنادق، خدمات — منصة واحدة للجميع', big: true },
  { icon: '💳', t: 'بطاقات دفع يمنية', d: 'نظام بطاقات إلكترونية ومحافظ مدمج بالكامل' },
  { icon: '📱', t: 'تطبيق PWA', d: 'متجرك يعمل كتطبيق على جوال عملائك بدون متجر تطبيقات' },
  { icon: '🚚', t: 'توصيل مدمج', d: 'سائقون وشركات توصيل مربوطة بمتجرك مباشرة' },
  { icon: '💬', t: 'طلبات واتساب', d: 'طلبات عملائك تصلك على واتساب فوراً' },
  { icon: '🎨', t: 'قوالب جاهزة', d: '4 قوالب متاجر احترافية بتخصيص كامل للألوان' },
  { icon: '📊', t: 'الدرجة الذكية', d: 'ترتيب متجرك يتحسن تلقائياً مع تقييمات عملائك' },
  { icon: '🔐', t: 'حماية متكاملة', d: 'تشفير، تحقق OTP، وسجل أحداث أمني' },
];

export default function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-3 py-8">
      <div className="text-center mb-10 anim-fade-up">
        <span className="section-chip mb-3">💎</span>
        <h2 className="f-2xl font-black mb-2">لماذا <span className="grad-text">يمن زون</span>؟</h2>
        <p className="text-gray-500 f-sm">كل الأدوات التي يحتاجها تاجر يمني — في منصة واحدة</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        {FEATURES.map((f, i) => (
          <div key={f.t}
            className={`glass card-glow rounded-3xl p-5 card-hover ${f.big ? 'col-span-2 row-span-2 flex flex-col justify-center' : ''}`}>
            <div className={`${f.big ? 'w-16 h-16 text-3xl mb-3 rounded-2xl' : 'w-12 h-12 text-xl mb-2 rounded-xl'} section-chip anim-float`}
              style={{ animationDelay: `${i * 0.3}s`, width: f.big ? '4rem' : undefined, height: f.big ? '4rem' : undefined }}>
              {f.icon}
            </div>
            <h3 className={`font-extrabold mb-1 ${f.big ? 'f-xl' : 'f-base'}`}>{f.t}</h3>
            <p className={`text-gray-500 ${f.big ? 'f-sm' : 'f-xs'}`}>{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
