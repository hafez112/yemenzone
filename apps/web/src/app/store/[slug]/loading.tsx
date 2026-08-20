// ⏳ هيكل فوري لواجهة المتجر — يظهر لحظياً بينما تُبث الصفحة من الخادم
export default function Loading() {
  return (
    <div dir="rtl" className="pb-24">
      {/* الغلاف */}
      <div className="skeleton h-44 md:h-64 w-full rounded-b-3xl" />
      {/* الشعار والاسم */}
      <div className="px-4 -mt-10">
        <div className="flex items-end gap-3">
          <div className="skeleton w-20 h-20 rounded-2xl shrink-0 ring-4 ring-white" />
          <div className="flex-1 space-y-2 pb-1">
            <div className="skeleton h-6 w-2/3 rounded-xl" />
            <div className="skeleton h-4 w-1/3 rounded-lg" />
          </div>
        </div>
      </div>
      {/* شريط الأصناف */}
      <div className="flex gap-2 px-4 mt-5 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-20 rounded-full shrink-0" />
        ))}
      </div>
      {/* شبكة العناصر */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 mt-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="skeleton h-36 w-full" />
            <div className="p-3 space-y-2">
              <div className="skeleton h-4 w-5/6 rounded-lg" />
              <div className="skeleton h-5 w-1/2 rounded-lg" />
              <div className="skeleton h-9 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
