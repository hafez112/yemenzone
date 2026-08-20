'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/Toast';
import { imgUrl } from '@/lib/api';

// 🗂️ دليل المتاجر — فلاتر ذكية + فرز + عدّادات حقيقية من الخادم
const API = process.env.NEXT_PUBLIC_API_URL || '';

const SORTS = [
  { id: '',        label: '✨ الأبرز' },
  { id: 'rating',  label: '⭐ الأعلى تقييماً' },
  { id: 'popular', label: '🔥 الأكثر زيارة' },
  { id: 'oldest',  label: '🕰️ الأقدم' },
];

export default function DirectoryClient() {
  const [data, setData] = useState<any>(null);
  const [gov, setGov] = useState('');
  const [type, setType] = useState('');
  const [verified, setVerified] = useState(false);
  const [sort, setSort] = useState('');
  const [q, setQ] = useState('');
  const [qLive, setQLive] = useState(''); // قيمة مؤجلة للبحث أثناء الكتابة
  const [loading, setLoading] = useState(true);

  // تأخير بسيط لبحث الاسم حتى لا نضغط الخادم مع كل حرف
  useEffect(() => {
    const t = setTimeout(() => setQLive(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (gov) params.set('governorate', gov);
    if (type) params.set('type', type);
    if (verified) params.set('verified', '1');
    if (sort) params.set('sort', sort);
    if (qLive) params.set('q', qLive);
    fetch(`${API}/api/v1/directory?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast('تعذر تحميل الدليل', 'error'))
      .finally(() => setLoading(false));
  }, [gov, type, verified, sort, qLive]);

  const facets = data?.facets;
  const stores: any[] = useMemo(() => data?.stores || [], [data]);

  return (
    <div className="page">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <span className="section-chip">🗂️</span>
          <h1 className="f-2xl font-black">دليل المتاجر</h1>
        </div>
        <p className="f-sm text-gray-500 mb-4">
          {data ? `${data.total} متجر نشط` : 'جارٍ التحميل...'} — كل المتاجر في مكان واحد
        </p>

        {/* البحث */}
        <div className="glass rounded-3xl p-2 mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 ابحث باسم متجر أو مدينة أو كلمة مفتاحية..."
            className="!mb-0 w-full bg-transparent outline-none px-3 py-2 text-sm"
          />
        </div>

        {/* فلاتر النوع */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: 'none' }}>
          <FilterChip active={!type} onClick={() => setType('')} label={`الكل`} />
          {facets?.types?.filter((t: any) => t.count > 0).map((t: any) => (
            <FilterChip key={t.id} active={type === t.id} onClick={() => setType(type === t.id ? '' : t.id)}
              label={`${t.icon} ${t.nameAr} (${t.count})`} />
          ))}
        </div>

        {/* فلاتر المحافظة + موثق + الفرز */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 items-center" style={{ scrollbarWidth: 'none' }}>
          <FilterChip active={verified} onClick={() => setVerified(!verified)} label="🎖️ الموثقة فقط" />
          <span className="w-px h-6 bg-gray-200 shrink-0" />
          {facets?.governorates?.slice(0, 12).map((g: any) => (
            <FilterChip key={g.name} active={gov === g.name} onClick={() => setGov(gov === g.name ? '' : g.name)}
              label={`📍 ${g.name} (${g.count})`} />
          ))}
          <span className="w-px h-6 bg-gray-200 shrink-0" />
          {SORTS.map((s) => (
            <FilterChip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)} label={s.label} />
          ))}
        </div>

        {/* النتائج */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="rounded-3xl skeleton h-52" />)}
          </div>
        ) : stores.length === 0 ? (
          <div className="glass rounded-3xl text-center py-12">
            <div className="text-4xl mb-2">🔍</div>
            <b>لا توجد متاجر مطابقة</b>
            <p className="text-sm text-gray-500 mt-1">جرّب إزالة بعض الفلاتر أو كلمة بحث مختلفة</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
            {stores.map((s) => (
              <Link key={s.id} href={`/store/${s.slug}`}
                className="glass card-glow card-hover rounded-3xl overflow-hidden block">
                <div className="h-24 relative overflow-hidden">
                  <div className="absolute inset-0 zoom-bg"
                    style={{ background: s.cover ? `url(${imgUrl(s.cover)}) center/cover` : 'linear-gradient(135deg, var(--primary-soft), color-mix(in srgb, var(--secondary) 18%, white))' }} />
                  {s.isFeatured && (
                    <span className="absolute top-2 right-2 z-10 text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>⭐ متميز</span>
                  )}
                </div>
                <div className="p-3 pt-0 -mt-6 relative">
                  <div className="w-12 h-12 rounded-2xl border-2 border-white shadow-md mb-1.5"
                    style={{ background: s.logo ? `url(${imgUrl(s.logo)}) center/cover` : 'var(--primary)' }} />
                  <div className="flex items-center gap-1">
                    <b className="text-sm truncate">{s.name}</b>
                    {s.isVerified && <span className="verified-badge shrink-0" title="متجر موثق">✓</span>}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate">
                    {s.type?.icon} {s.type?.nameAr} {s.governorate ? `· 📍${s.governorate}` : ''}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                    <span className="font-bold stars-gold">
                      ★ {s.ratingAvg > 0 ? s.ratingAvg.toFixed(1) : 'جديد'}
                      {s.ratingCount > 0 && <span className="text-gray-400 font-normal"> ({s.ratingCount})</span>}
                    </span>
                    <span className="text-gray-400">📦 {s.productsCount}</span>
                    <span className="text-gray-400">❤️ {s.likesCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 🔘 رقاقة فلتر حديثة — من نظام التصميم الموحد
function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`chip-filter shrink-0 ${active ? 'on' : ''}`}>
      {label}
    </button>
  );
}
