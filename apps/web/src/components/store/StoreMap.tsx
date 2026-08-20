// 🗺️ خريطة موقع النشاط — OpenStreetMap مضمّنة (بدون مفاتيح API) + زر الاتجاهات
// تُستخدم أسفل صفحات المول والمتاجر التي حدّدت موقعها
export default function StoreMap({ store, primary }: { store: any; primary: string }) {
  const lat = Number(store.lat);
  const lng = Number(store.lng);
  if (!isFinite(lat) || !isFinite(lng) || (!lat && !lng)) return null;

  // نافذة عرض حول الموقع (~±0.01 درجة ≈ كيلومتر واحد)
  const d = 0.01;
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <section className="max-w-6xl mx-auto px-3 mt-10">
      <div className="flex items-end justify-between mb-3">
        <h2 className="f-xl font-black flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${primary}, #0D9488)` }}>🗺️</span>
          موقعنا على الخريطة
        </h2>
        <a href={directions} target="_blank" rel="noreferrer"
          className="f-xs font-extrabold px-3 py-1.5 rounded-full transition-all hover:scale-105 shrink-0 text-white shadow"
          style={{ background: 'linear-gradient(135deg, #0D9488, #06B6D4)' }}>
          🧭 الاتجاهات
        </a>
      </div>
      {(store.address || store.governorate) && (
        <p className="f-xs font-bold text-gray-400 mb-2 pr-11">
          📍 {[store.address, store.governorate].filter(Boolean).join(' — ')}
        </p>
      )}
      <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-xl relative">
        <iframe
          title={`خريطة موقع ${store.name}`}
          src={embed}
          loading="lazy"
          className="w-full h-64 md:h-80 block"
          style={{ border: 0 }}
        />
        {/* شارة الاسم فوق الخريطة */}
        <div className="absolute top-3 right-3 glass rounded-2xl px-4 py-2 shadow-lg pointer-events-none">
          <p className="font-black text-sm">{store.name}</p>
          <p className="text-[10px] font-bold text-gray-500">🧭 اضغط «الاتجاهات» للانطلاق إلينا</p>
        </div>
      </div>
    </section>
  );
}
