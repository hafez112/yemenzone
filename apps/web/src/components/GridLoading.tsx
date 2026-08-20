// ⏳ هيكل تحميل موحّد لصفحات القوائم العامة — عنوان + شبكة بطاقات أثناء البث
export default function GridLoading({ cards = 8 }: { cards?: number }) {
  return (
    <div dir="rtl" className="px-4 pt-6 pb-24 max-w-6xl mx-auto">
      <div className="skeleton h-9 w-56 rounded-2xl mb-2" />
      <div className="skeleton h-4 w-72 rounded-lg mb-6" />
      {/* شريط تصفية */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-24 rounded-full shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="skeleton h-32 w-full" />
            <div className="p-3 space-y-2">
              <div className="skeleton h-4 w-5/6 rounded-lg" />
              <div className="skeleton h-4 w-1/2 rounded-lg" />
              <div className="skeleton h-8 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
