'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';

// 🤝 إحالة التجار — ادعُ تجاراً تعرفهم واكسب مع كل متجر جديد ينضم برابطك
export default function SellerInvitePage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [data, setData] = useState<{ code: string; count: number; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(setStore).catch(() => {});
    api('/stores/my/referral')
      .then(setData)
      .catch((e) => toast(e.message || 'تعذّر التحميل', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const link = data ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/seller-register?ref=${data.code}` : '';

  const copy = () => {
    navigator.clipboard.writeText(link)
      .then(() => toast('📋 نُسخ رابط الدعوة — أرسله للتجار الذين تعرفهم'))
      .catch(() => toast('تعذّر النسخ', 'error'));
  };

  const shareWa = () => {
    const text = `🚀 انضم إلى منصة يمن زون وأنشئ متجرك الإلكتروني مجاناً — منتجات لا محدودة وطلبات واتساب ولوحة تحكم كاملة.\nسجّل من رابط دعوتي:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    toast('📤 اختر التاجر الذي تريد دعوته');
  };

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0 space-y-5">
          {/* 🎯 الترويسة */}
          <div className="rounded-3xl p-6 text-center text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#6C3DF5 55%,#EC4899)' }}>
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10 anim-blob" />
            <div className="relative">
              <div className="text-4xl mb-2">🤝</div>
              <h1 className="text-2xl font-black mb-1">ادعُ التجار واكسب</h1>
              <p className="text-sm text-white/85">شارك رابط دعوتك مع أي تاجر تعرفه — عند تسجيله يُحسب انضمامه بفضلك ويُخطر حسابك فوراً</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">⏳ جارٍ تحميل رابط دعوتك...</div>
          ) : data ? (
            <>
              {/* 🔗 رابط الدعوة */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="font-extrabold text-sm text-gray-800 mb-3">🔗 رابط دعوتك الخاص</h2>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-3" dir="ltr">
                  <span className="flex-1 text-xs text-purple-600 font-mono truncate text-left">{link}</span>
                  <button onClick={copy} className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-extrabold shrink-0">📋 نسخ</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={shareWa} className="py-3 rounded-2xl bg-green-500 text-white font-extrabold text-sm hover:bg-green-400 transition-colors">📤 شارك عبر واتساب</button>
                  <button onClick={() => {
                    if (navigator.share) navigator.share({ title: 'انضم إلى يمن زون', url: link }).then(() => toast('📤 تمت المشاركة')).catch(() => {});
                    else copy();
                  }} className="py-3 rounded-2xl bg-gray-100 text-gray-700 font-extrabold text-sm hover:bg-gray-200 transition-colors">📲 مشاركة</button>
                </div>
              </div>

              {/* 📊 إحصائياتي */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                  <div className="text-3xl font-black text-purple-600">{data.count}</div>
                  <div className="text-xs text-gray-500 font-bold mt-1">🤝 تاجر انضم برابطك</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                  <div className="text-3xl font-black text-teal-600" dir="ltr">{data.code}</div>
                  <div className="text-xs text-gray-500 font-bold mt-1">🔑 رمز دعوتك</div>
                </div>
              </div>

              {/* 📜 آخر المنضمين */}
              {data.recent.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 className="font-extrabold text-sm text-gray-800 mb-3">📜 آخر التجار المنضمين بدعوتك</h2>
                  <div className="space-y-2">
                    {data.recent.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 grid place-items-center font-black text-sm shrink-0">
                          {(r.name || '؟').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{r.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {r.stores?.[0]?.name ? `🏪 ${r.stores[0].name} · ` : ''}
                            {new Date(r.createdAt).toLocaleDateString('ar-YE')}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">✅ انضم</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 💡 كيف تنجح دعوتك */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="font-extrabold text-sm text-gray-800 mb-2">💡 لمن ترسل رابطك؟</h2>
                <ul className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
                  <li>🏬 أصحاب المحلات في حيّك الذين لا يملكون متجراً إلكترونياً بعد.</li>
                  <li>📱 البائعون في قروبات واتساب وفيسبوك — كلهم يحتاجون صفحة منتجات منظمة.</li>
                  <li>🤝 كل من يبيع «برابط واحد» أو في سوق المستعمل — أرشده للترقية لمتجر كامل.</li>
                </ul>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
