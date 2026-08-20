'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import SellerSidebar from '@/components/SellerSidebar';
import { kindInfo } from '@/lib/activity';

// 📱 مشاركة صفحتي — QR مضمون المسح + روابط مشاركة جاهزة (بدون خوادم خارجية)
export default function SellerSharePage() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [target, setTarget] = useState<'store' | string>('store'); // store أو productId
  const [qrReady, setQrReady] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrInst = useRef<any>(null);

  useEffect(() => {
    if (!getUser()) { router.push('/auth/login'); return; }
    api('/stores/my').then(s => {
      setStore(s);
      // 🧬 اختيار منتجات للمشاركة — متاجر المنتجات فقط
      if ((s.type?.kind || 'products') === 'products') api('/seller/products').then(setProducts).catch(() => {});
    }).catch(() => router.push('/seller/setup'));
  }, []);

  const storeUrl = store ? `${typeof window !== 'undefined' ? window.location.origin : ''}/store/${store.slug}` : '';
  const currentProduct = products.find((p) => p.id === target);
  const targetUrl = target === 'store' ? storeUrl : `${storeUrl}/product/${target}`;
  const kn = kindInfo(store);
  const shareText = store
    ? target === 'store'
      ? `${kn.icon} ${kn.cta} — ${kn.noun} ${store.name} عبر منصة يمن زون:\n${storeUrl}`
      : `🛍️ ${currentProduct?.name} — من متجر ${store.name}:\n${targetUrl}`
    : '';
  const primary = (store?.themeJson as any)?.primary || '#6C3DF5';

  // توليد/تحديث QR عند تغيير الهدف
  // 🛡️ ضمان المسح: الشعار يُجلب كبيانات محلية (data URL) — إن فشل جلبه يُولَّد الرمز بدونه
  //    (تضمينه برابط خارجي مع crossOrigin كان يُنتج رمزاً تالفاً لا تستطيع الكاميرا قراءته)
  useEffect(() => {
    if (!store || !targetUrl || !qrRef.current) return;
    let cancelled = false;
    (async () => {
      const QRCodeStyling = (await import('qr-code-styling')).default;

      let image: string | undefined;
      const logo = target === 'store' ? store.logo : currentProduct?.images?.[0];
      if (logo) {
        try {
          const res = await fetch(imgUrl(logo));
          if (!res.ok) throw new Error('img');
          const blob = await res.blob();
          image = await new Promise<string>((ok, no) => {
            const fr = new FileReader();
            fr.onload = () => ok(fr.result as string);
            fr.onerror = no;
            fr.readAsDataURL(blob);
          });
        } catch { image = undefined; } // الرمز أهم من الشعار — نكمل بدونه
      }
      if (cancelled || !qrRef.current) return;

      const opts: any = {
        width: 1024, height: 1024, margin: 40,
        data: encodeURI(targetUrl), // 🛡️ ترميز آمن — يمنع تلف الروابط المحتوية على حروف غير لاتينية
        qrOptions: { errorCorrectionLevel: 'H' }, // تحمّل عالٍ — يسمح بشعار في المنتصف
        imageOptions: { margin: 24, imageSize: 0.4, hideBackgroundDots: true },
        dotsOptions: {
          type: 'extra-rounded',
          gradient: { type: 'linear', rotation: 0.8, colorStops: [{ offset: 0, color: primary }, { offset: 1, color: '#0d9488' }] },
        },
        cornersSquareOptions: { type: 'extra-rounded', color: primary },
        cornersDotOptions: { type: 'dot', color: '#0d9488' },
        backgroundOptions: { color: '#ffffff' },
      };
      if (image) opts.image = image;

      if (!qrInst.current) {
        qrInst.current = new QRCodeStyling(opts);
        qrRef.current.innerHTML = '';
        qrInst.current.append(qrRef.current);
      } else {
        qrInst.current.update(opts);
      }
      setQrReady(true);
    })();
    return () => { cancelled = true; };
  }, [store, target, targetUrl]);

  const download = async () => {
    if (!qrInst.current) return;
    const name = target === 'store' ? `qr-${store.slug}` : `qr-product-${target}`;
    await qrInst.current.download({ name, extension: 'png' });
    toast('⬇️ نُزّل رمز QR بجودة الطباعة (1024px)');
  };

  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch { toast('⚠️ تعذر النسخ — انسخ يدوياً', 'error'); }
  };

  if (!store) return <div className="page"><div className="card text-center py-10">⏳ جارٍ التحميل…</div></div>;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row gap-4">
        <SellerSidebar store={store} />
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-black mb-1">📱 مشاركة {kn.yours}</h1>
          <p className="text-sm text-gray-500 mb-4">اطبع الرمز في مقرّك، أو شارك الرابط أينما كان عملاؤك</p>

          <div className="grid md:grid-cols-2 gap-3">
            {/* ═══ QR ببطاقة فنية بلون المتجر ═══ */}
            <div className="card text-center">
              <h2 className="font-black mb-2">🔳 رمز QR بلون {kn.yours}</h2>

              {/* اختيار الهدف — المنتجات لمتاجر المنتجات فقط */}
              <select className="input mb-3" value={target} onChange={(e) => { setTarget(e.target.value); setQrReady(false); }}>
                <option value="store">{kn.icon} {kn.noun === 'متجر' ? 'المتجر كاملاً' : `${kn.pageWord} كاملاً`}</option>
                {products.map((p) => <option key={p.id} value={p.id}>📦 {p.name}</option>)}
              </select>

              {/* إطار البطاقة — تدرج بلون المتجر */}
              <div className="mx-auto w-60 rounded-[2rem] p-2 shadow-xl"
                style={{ background: `linear-gradient(135deg, ${primary}, #0d9488)` }}>
                <div className="rounded-3xl bg-white p-3">
                  <div className="h-48 flex items-center justify-center overflow-hidden rounded-2xl">
                    <div ref={qrRef} className="[&>canvas]:!w-44 [&>canvas]:!h-44 [&>img]:!w-44 [&>img]:!h-44" />
                  </div>
                  <div className="mt-2 font-black text-sm text-gray-800 truncate">{store.name}</div>
                  <div className="text-[9px] text-gray-400" dir="ltr">{targetUrl}</div>
                </div>
              </div>

              {/* حالة الرمز + فحص الرابط */}
              <div className="mt-3 text-[11px] font-bold">
                {qrReady
                  ? <span className="text-emerald-600">✅ الرمز جاهز — امسحه بكاميرا جوالك للتأكد قبل الطباعة</span>
                  : <span className="text-gray-400">⏳ يُولَّد الرمز…</span>}
              </div>
              <a href={targetUrl} target="_blank"
                className="inline-block mt-1 text-[11px] font-bold text-purple-600 hover:underline">
                🧪 افتح الرابط للتأكد أنه يصل لمتجرك ←
              </a>

              <button className="btn w-full mt-3" onClick={download}>⬇️ تنزيل PNG للطباعة</button>
              <p className="text-[10px] text-gray-400 mt-2">💡 اطبعه على الطاولات، الأكياس، الفواتير، أو باب المحل — الزبون يمسحه ويصل لمتجرك مباشرة</p>
            </div>

            {/* ═══ روابط المشاركة ═══ */}
            <div className="card">
              <h2 className="font-black mb-3">🔗 شارك الرابط</h2>

              <div className="p-3 rounded-2xl bg-gray-50 text-xs text-gray-600 mb-3 whitespace-pre-line">{shareText}</div>

              <div className="space-y-2">
                <button className="btn w-full justify-center" onClick={() => copy(shareText, '📋 نُسخ النص مع الرابط')}>
                  📋 نسخ النص والرابط
                </button>
                <a className="btn w-full justify-center !bg-[#25D366] !text-white" target="_blank"
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>
                  💬 مشاركة عبر واتساب
                </a>
                <a className="btn w-full justify-center !bg-[#229ED9] !text-white" target="_blank"
                  href={`https://t.me/share/url?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(shareText.split('\n')[0])}`}>
                  ✈️ مشاركة عبر تيليجرام
                </a>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button className="btn ghost w-full justify-center" onClick={() => (navigator as any).share({ title: store.name, text: shareText, url: targetUrl }).catch(() => {})}>
                    📤 مشاركة عبر تطبيقات الجهاز
                  </button>
                )}
              </div>

              <div className="mt-4 p-3 rounded-2xl bg-purple-50 border border-purple-100">
                <b className="text-xs" style={{ color: 'var(--primary)' }}>🤖 نصيحة النمو</b>
                <p className="text-xs text-gray-600 mt-1">
                  {store._count?.orders === 0
                    ? 'أرسل رابط متجرك لـ 10 من معارفك الآن — أول 5 طلبات ترفع درجتك الذكية وتقدّمك في نتائج المنصة 🚀'
                    : 'زبائنك يثقون بك — أرسل لهم عرضاً من صفحة «حملاتي» 📣 ليصلهم تنبيه مباشر'}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
