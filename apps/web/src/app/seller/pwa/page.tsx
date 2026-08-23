'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SellerSidebar from '@/components/SellerSidebar';
import { api, getUser } from '@/lib/api';
import { toast } from '@/components/Toast';
import { kindInfo } from '@/lib/activity';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 📱 تطبيق متجري (PWA) — خدمة مدفوعة تحوّل المتجر إلى تطبيق حقيقي باسمه وشعاره
export default function SellerPwaPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [iconOk, setIconOk] = useState(true);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/seller/subscription').then(setData).catch(() => router.push('/seller/setup'));
  }, []);

  if (!data) return null;
  const { store, features } = data;
  const on = !!features?.pwa;
  const kn = kindInfo(store);
  const primary = store?.themeJson?.primary || '#6C3DF5';
  const iconUrl = `${API}/api/v1/pwa/store-icon/${store.slug}/192`;
  const storeUrl = `https://yemenzone1.com/store/${store.slug}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(storeUrl); toast('✅ نُسخ رابط تطبيقك — أرسله لزبائنك'); }
    catch { toast('⚠️ تعذّر النسخ', 'error'); }
  };

  return (
    <main className="min-h-screen pt-20 pb-24 px-3 bg-gradient-to-br from-purple-50 to-teal-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <SellerSidebar store={{ ...store, features }} />
        <div className="flex-1 min-w-0 space-y-4">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-black">📱 تطبيق {kn.yours === 'متجرك' ? 'متجري' : kn.pageWord}</h1>
            <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">💎 خدمة مدفوعة مرتبطة بنشاطك</span>
          </div>

          {!on ? (
            /* 🔒 شاشة القفل — الخدمة مدفوعة */
            <div className="glass rounded-3xl p-10 text-center max-w-md mx-auto anim-bounce-in">
              <div className="text-6xl mb-4">📱</div>
              <h2 className="text-xl font-black mb-2">حوّل {kn.yours} إلى تطبيق حقيقي 💎</h2>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                زبائنك يثبّتون {kn.yours} على جوالاتهم كتطبيق مستقل — باسمك وشعارك ولونك —
                يفتح من الشاشة الرئيسية بلا متصفح، وبانر «حمّل التطبيق» يظهر لزوارك تلقائياً.
              </p>
              <div className="text-right text-xs font-bold text-gray-600 space-y-1.5 mb-5 bg-white/60 rounded-2xl p-4">
                <div>✅ أيقونة على شاشة جوال الزبون بشعارك</div>
                <div>✅ يفتح بملء الشاشة كتطبيق مستقل</div>
                <div>✅ بانر تحميل ذكي يظهر للزوار تلقائياً</div>
                <div>✅ يعمل على أندرويد وآيفون</div>
              </div>
              <Link href="/seller/subscription"
                className="btn-primary inline-block text-white font-extrabold px-8 py-3.5 rounded-full">
                💎 رقِّ خطتك لتفعيلها
              </Link>
            </div>
          ) : (
            <>
              {/* 📱 معاينة التطبيق كما سيراه الزبون */}
              <div className="glass rounded-3xl p-5">
                <h2 className="font-black mb-4">تطبيقك جاهز 🎉 — هكذا يظهر على جوال زبائنك:</h2>
                <div className="flex flex-col md:flex-row items-center gap-5">
                  {/* محاكاة أيقونة الشاشة الرئيسية */}
                  <div className="rounded-[2rem] bg-slate-900 p-4 shadow-2xl shrink-0">
                    <div className="grid grid-cols-3 gap-3 w-40">
                      {['📷', '📞', '🗺️', '🎵', '📧', '⚙️'].map((e, i) => (
                        <span key={i} className="w-11 h-11 rounded-2xl bg-slate-700 grid place-items-center text-lg">{e}</span>
                      ))}
                      <div className="flex flex-col items-center gap-1">
                        {iconOk ? (
                          <img src={iconUrl} alt="" onError={() => setIconOk(false)}
                            className="w-11 h-11 rounded-2xl object-cover shadow-lg" />
                        ) : (
                          <span className="w-11 h-11 rounded-2xl grid place-items-center text-lg font-black text-white shadow-lg"
                            style={{ background: primary }}>{store.name?.[0]}</span>
                        )}
                      </div>
                      {['📁', '🎮', '💬'].map((e, i) => (
                        <span key={i} className="w-11 h-11 rounded-2xl bg-slate-700 grid place-items-center text-lg">{e}</span>
                      ))}
                    </div>
                    <p className="text-center text-[10px] text-white/80 font-bold mt-2 truncate max-w-40">{store.name}</p>
                  </div>
                  <div className="flex-1 min-w-0 text-center md:text-right">
                    <b className="text-lg">{store.name}</b>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      الاسم: <b>{store.name}</b> · اللون: <span className="inline-block w-3 h-3 rounded-full align-middle" style={{ background: primary }} /> · الشعار: شعار {kn.yours} الحالي
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">تغيّر الاسم أو الشعار أو اللون من «الإعدادات» ويتحدث التطبيق تلقائياً</p>
                    <span className="inline-block mt-2 text-[10px] font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">✅ الخدمة مفعّلة لنشاطك</span>
                  </div>
                </div>
              </div>

              {/* 🔗 رابط التطبيق للمشاركة */}
              <div className="glass rounded-3xl p-4">
                <h3 className="font-black text-sm mb-2">🔗 رابط تطبيقك — أرسله لزبائنك</h3>
                <div className="flex gap-2">
                  <input dir="ltr" readOnly value={storeUrl}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-purple-200 text-xs font-bold bg-white outline-none" />
                  <button onClick={copy} className="btn-primary px-5 py-2.5 rounded-xl text-white text-xs font-extrabold">📋 نسخ</button>
                </div>
                <p className="text-[11px] text-gray-500 font-bold mt-2 leading-relaxed">
                  عند فتح الرابط من الجوال يظهر للزائر بانر «📱 حمّل تطبيق {store.name}» —
                  بضغطة واحدة يُثبَّت على شاشته الرئيسية بشعارك ولونك.
                </p>
              </div>

              {/* 📲 كيف يثبّته الزبون */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="glass rounded-3xl p-4">
                  <h3 className="font-black text-sm mb-2">🤖 زبونك على أندرويد</h3>
                  <ol className="text-xs font-bold text-gray-600 space-y-1.5 leading-relaxed">
                    <li>1️⃣ يفتح رابط نشاطك من كروم</li>
                    <li>2️⃣ يظهر له بانر «حمّل التطبيق» تلقائياً</li>
                    <li>3️⃣ يضغط «تثبيت التطبيق مجاناً» — وانتهى ✅</li>
                  </ol>
                </div>
                <div className="glass rounded-3xl p-4">
                  <h3 className="font-black text-sm mb-2">🍏 زبونك على آيفون</h3>
                  <ol className="text-xs font-bold text-gray-600 space-y-1.5 leading-relaxed">
                    <li>1️⃣ يفتح رابط نشاطك من سفاري</li>
                    <li>2️⃣ يضغط زر المشاركة ⎋ أسفل الشاشة</li>
                    <li>3️⃣ يختار «إضافة إلى الشاشة الرئيسية» ➕ — وانتهى ✅</li>
                  </ol>
                </div>
              </div>

              {/* 💡 نصائح لزيادة التحميلات */}
              <div className="rounded-3xl p-4 text-white"
                style={{ background: `linear-gradient(135deg, ${primary}, #0f172a)` }}>
                <h3 className="font-black text-sm mb-2">💡 نصائح ليحمّل زبائنك تطبيقك أكثر</h3>
                <ul className="text-[11px] font-bold space-y-1.5 opacity-90 leading-relaxed">
                  <li>• اذكر في حالات واتساب: «حمّل تطبيقنا وتسوّق أسرع» مع الرابط</li>
                  <li>• أضف الرابط في بايو انستقرام وتيليجرام نشاطك</li>
                  <li>• اطبع QR للرابط وعلّقه في واجهة نشاطك (من أدوات التاجر ← صانع QR)</li>
                  <li>• قدّم كوبون خصم لأول طلب من التطبيق</li>
                </ul>
              </div>
            </>
          )}

        </div>
      </div>
    </main>
  );
}
