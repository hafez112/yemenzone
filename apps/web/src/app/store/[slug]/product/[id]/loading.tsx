// ⏳ هيكل فوري لصفحة العنصر — معرض صور + معلومات أثناء بث الصفحة
export default function Loading() {
  return (
    <div dir="rtl" className="pb-24 px-4 pt-4 max-w-5xl mx-auto">
      {/* مسار التنقل */}
      <div className="skeleton h-4 w-40 rounded-lg mb-4" />
      <div className="grid md:grid-cols-2 gap-6">
        {/* المعرض */}
        <div>
          <div className="skeleton h-72 md:h-96 w-full rounded-3xl" />
          <div className="flex gap-2 mt-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton w-16 h-16 rounded-xl" />
            ))}
          </div>
        </div>
        {/* المعلومات */}
        <div className="space-y-3">
          <div className="skeleton h-8 w-4/5 rounded-xl" />
          <div className="skeleton h-4 w-1/3 rounded-lg" />
          <div className="skeleton h-10 w-1/2 rounded-2xl" />
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="flex gap-2">
            <div className="skeleton h-12 flex-1 rounded-xl" />
            <div className="skeleton h-12 w-12 rounded-xl" />
          </div>
        </div>
      </div>
      {/* عناصر مشابهة */}
      <div className="skeleton h-6 w-40 rounded-xl mt-10 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="skeleton h-32 w-full" />
            <div className="p-3 space-y-2">
              <div className="skeleton h-4 w-5/6 rounded-lg" />
              <div className="skeleton h-5 w-1/2 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
