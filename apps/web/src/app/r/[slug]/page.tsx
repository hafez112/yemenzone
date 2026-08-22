import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SERVER_API as API, serverCurSymbol } from '@/lib/server-api';
import RequestReplyForm from '@/components/tools/RequestReplyForm';
import ReqActions from '@/components/tools/ReqActions';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yemenzone1.com';

interface Req {
  slug: string; title: string; details?: string; budget?: number | string; currency: string;
  governorate?: string; views: number; createdAt: string;
  replies: { id: string; sellerName: string; message: string; price?: number | string; whatsapp: string; createdAt: string }[];
}

async function getReq(slug: string): Promise<Req | null> {
  try {
    const r = await fetch(`${API}/api/v1/tools/requests/${slug}`, { next: { revalidate: 30 } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

const ago = (d: string) => {
  const m = Math.floor((Date.now() - +new Date(d)) / 60000);
  if (m < 60) return m <= 1 ? 'الآن' : `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  return `قبل ${Math.floor(h / 24)} يوم`;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const req = await getReq(slug);
  if (!req) return {};
  return {
    title: `مطلوب: ${req.title.slice(0, 60)}`,
    description: (req.details || `مطلوب ${req.title}${req.governorate ? ` في ${req.governorate}` : ''} — ردّ بعرضك من يمن زون`).slice(0, 160),
    alternates: { canonical: `${SITE}/r/${slug}` },
    openGraph: { title: `📢 مطلوب: ${req.title.slice(0, 50)}`, description: req.details?.slice(0, 160), url: `${SITE}/r/${slug}`, type: 'website', locale: 'ar_YE' },
    robots: { index: true, follow: true },
  };
}

// 📢 صفحة الطلب العامة — التفاصيل + عروض التجار + نموذج الرد
export default async function RequestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const req = await getReq(slug);
  if (!req) notFound();
  const curSym = await serverCurSymbol(req.currency);

  return (
    <div className="page">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* الطلب */}
        <div className="bg-white rounded-3xl border border-orange-100 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b)' }} />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">📢 طلب شراء</span>
            <span className="text-[10px] text-gray-400 font-bold">🕘 {ago(req.createdAt)}</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 leading-relaxed mb-3">{req.title}</h1>
          {req.details && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-4">{req.details}</p>}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {req.budget && (
              <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                💰 الميزانية: {Number(req.budget).toLocaleString()} {curSym}
              </span>
            )}
            {req.governorate && <span className="px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">📍 {req.governorate}</span>}
            <span className="px-3 py-1.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">👁️ {req.views} مشاهدة</span>
            <span className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">💬 {req.replies.length} {req.replies.length === 1 ? 'عرض' : 'عروض'}</span>
          </div>
          <div className="mt-4">
            <ReqActions slug={req.slug} title={req.title} />
          </div>
        </div>

        {/* 💬 عروض التجار */}
        <div>
          <h2 className="font-black text-gray-900 mb-3">💬 عروض التجار ({req.replies.length})</h2>
          {req.replies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">⏳</div>
              <p className="font-bold text-sm">لا عروض بعد — تاجر، كن أول من يرد ويكسب الزبون!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {req.replies.map((rep) => {
                const waNum = rep.whatsapp.replace(/[^0-9]/g, '');
                const waIntl = waNum.startsWith('967') ? waNum : '967' + waNum.replace(/^0/, '');
                return (
                  <div key={rep.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 grid place-items-center text-white font-black shrink-0">{rep.sellerName[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-sm text-gray-900">{rep.sellerName}</p>
                          <span className="text-[10px] text-gray-400 font-bold">🕘 {ago(rep.createdAt)}</span>
                          {rep.price && <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{Number(rep.price).toLocaleString()} {curSym}</span>}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mt-1 whitespace-pre-line">{rep.message}</p>
                        <a href={`https://wa.me/${waIntl}?text=${encodeURIComponent(`السلام عليكم 🌹 بخصوص طلبي: ${req.title.slice(0, 50)}\n${SITE}/r/${req.slug}`)}`}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2.5 px-4 py-2 rounded-full bg-green-500 text-white text-xs font-extrabold hover:bg-green-400 transition-colors">
                          💬 تواصل واتساب
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* نموذج الرد */}
        <RequestReplyForm slug={req.slug} />

        {/* روابط */}
        <div className="flex flex-wrap justify-center gap-2 pb-4">
          <Link href="/tools/requests" className="px-5 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-extrabold text-gray-700 hover:border-orange-300 transition-colors">📢 كل الطلبات</Link>
          <Link href="/auth/seller-register" className="px-5 py-2.5 rounded-full text-sm font-extrabold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #6C3DF5, #a855f7)' }}>🚀 أنشئ متجرك مجاناً</Link>
        </div>
      </div>
    </div>
  );
}
