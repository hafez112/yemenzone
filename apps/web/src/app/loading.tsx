// ⏳ هيكل فوري للرئيسية — بطل + شبكة متاجر أثناء بث الصفحة
export default function Loading() {
  return (
    <div dir="rtl" className="pb-24">
      {/* البطل */}
      <div className="px-4 pt-6 max-w-6xl mx-auto">
        <div className="skeleton h-52 md:h-72 w-full rounded-3xl" />
        {/* بحث */}
        <div className="skeleton h-12 w-full md:w-2/3 mx-auto rounded-full -mt-6 relative" />
      </div>
      {/* أقسام سريعة */}
      <div className="flex gap-3 px-4 mt-8 overflow-hidden max-w-6xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-24 w-24 rounded-2xl shrink-0" />
        ))}
      </div>
      {/* شبكة المتاجر */}
      <div className="px-4 mt-8 max-w-6xl mx-auto">
        <div className="skeleton h-7 w-44 rounded-xl mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
              <div className="skeleton h-28 w-full" />
              <div className="p-3 space-y-2">
                <div className="skeleton h-4 w-4/5 rounded-lg" />
                <div className="skeleton h-4 w-1/2 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
