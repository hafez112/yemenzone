'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CartDrawer from '@/components/CartDrawer';
import { addToCart } from '@/lib/cart';
import { toast } from '@/components/Toast';
import { recordRecent, toggleCompare, isInCompare } from '@/lib/recent';
import { api, getUser } from '@/lib/api';
import WishlistButton from '@/components/WishlistButton';
import ProductQA from '@/components/ProductQA';
import CrossStoreReco from '@/components/CrossStoreReco';
import { useCurrency } from '@/lib/currency';
import { productKindInfo, specChips } from '@/lib/activity';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// صفحة عرض المنتج — معرض صور + تفاصيل + مشابهة بالذكاء المحلي
export default function ProductClient({ store, product, similar }: any) {
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [inCompare, setInCompare] = useState(false);
  // 🎨 خيارات المنتج (لون/مقاس/وزن بأسعار مستقلة)
  const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
  const features: any[] = Array.isArray(product.features) ? product.features : [];
  const [selColor, setSelColor] = useState<string | null>(null);
  const [selSize, setSelSize] = useState<string | null>(null);
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))] as string[];
  const sizes = [...new Set(variants.filter(v => !selColor || v.color === selColor).map(v => v.size).filter(Boolean))] as string[];
  const selectedVariant = variants.find(v =>
    (colors.length === 0 || v.color === selColor) && (sizes.length === 0 || v.size === selSize)) || null;
  const needsSelection = variants.length > 0;
  const theme = (store.themeJson as any) || {};
  const primary = theme.primary || '#6C3DF5';
  const secondary = theme.secondary || '#00E5C7';
  const isDark = store.template === 'dark';
  const basePrice = Number(product.salePrice || product.price);
  const price = selectedVariant ? Number(selectedVariant.salePrice || selectedVariant.price) : basePrice;
  const curStock = selectedVariant?.stock !== null && selectedVariant?.stock !== undefined ? selectedVariant.stock : product.stock;
  const images = product.images?.length ? product.images : [null];
  const { fmt } = useCurrency(); // 💱 عرض السعر بالعملة المختارة

  // 🕘 تسجيل في «شوهد مؤخراً» — محلياً في متصفح الزائر فقط
  useEffect(() => {
    recordRecent({
      id: product.id, name: product.name, price: Number(product.price),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      image: product.images?.[0] || null, storeSlug: store.slug, storeName: store.name,
    });
    setInCompare(isInCompare(product.id));
  }, [product.id]);

  // 🔔 أعلمني عند التوفر
  const [alertDone, setAlertDone] = useState(false);
  const [alertBusy, setAlertBusy] = useState(false);
  const subscribeStockAlert = async () => {
    const u = getUser();
    const phone = u?.phone || prompt('📱 جوالك لنعلمك فور توفره:');
    if (!phone?.trim()) return;
    setAlertBusy(true);
    try {
      await api('/v1/stock-alerts', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, phone: phone.trim() }),
      });
      setAlertDone(true);
      toast('🔔 سجلناك! سيصلك إشعار فور عودته');
    } catch (e: any) { toast(e.message, 'error'); }
    setAlertBusy(false);
  };

  // 📉 نبّهني عند نزول السعر — اشتراك بالجوال دون تسجيل
  const [priceAlertDone, setPriceAlertDone] = useState(false);
  const [priceAlertBusy, setPriceAlertBusy] = useState(false);
  const subscribePriceAlert = async () => {
    const u = getUser();
    const phone = u?.phone || prompt('📱 جوالك لنعلمك فور نزول سعر هذا المنتج:');
    if (!phone?.trim()) return;
    setPriceAlertBusy(true);
    try {
      await api('/v1/tools/price-alert', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, phone: phone.trim() }),
      });
      setPriceAlertDone(true);
      toast('📉 سجلناك! سيصلك تنبيه فور نزول السعر');
    } catch (e: any) { toast(e.message, 'error'); }
    setPriceAlertBusy(false);
  };

  // ⚖️ إضافة/إزالة من المقارنة
  const onCompare = () => {
    const r = toggleCompare({
      id: product.id, name: product.name, price: Number(product.price),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      image: product.images?.[0] || null, storeSlug: store.slug, storeName: store.name,
    });
    if (!r.added && r.count >= 4) return toast('⚖️ قائمة المقارنة ممتلئة (4 كحد أقصى)', 'error');
    setInCompare(r.added);
    toast(r.added ? `⚖️ أُضيف للمقارنة (${r.count}/4) — قارن من صفحة الاستكشاف` : 'أُزيل من المقارنة');
  };

  return (
    <main className={`min-h-screen pb-24 ${isDark ? 'text-white store-dark' : 'bg-gray-50'}`}
      style={{ '--tp': primary, '--ts': secondary,
               ...(isDark ? { background: 'linear-gradient(180deg, #0A0A14, #141428)' } : {}) } as any}>
      <div className="max-w-5xl mx-auto px-3 pt-20">
        {/* مسار التنقل */}
        <div className={`text-xs mb-4 flex items-center gap-1 flex-wrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Link href={`/store/${store.slug}`} className="hover:underline font-bold">{store.name}</Link>
          <span>←</span>
          {product.category && <><span>{product.category.name}</span><span>←</span></>}
          <span className="font-bold" style={{ color: primary }}>{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* معرض الصور — زووم ناعم + عداد + مصغرات متوهجة */}
          <div>
            <div className="card-hover rounded-3xl overflow-hidden h-80 md:h-96 relative"
              style={{ boxShadow: `0 24px 50px -20px ${primary}55, 0 8px 24px -12px rgba(0,0,0,.18)` }}>
              <div className="zoom-bg absolute inset-0"
                style={images[img] ? { background: `url(${API}${images[img]}) center/cover` }
                     : { background: `linear-gradient(135deg, ${primary}20, ${primary}40)` }} />
              {!images[img] && <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-30">📦</div>}
              {product.salePrice && (
                <span className="sale-badge absolute top-3 right-3 px-3 py-1 text-sm">
                  خصم {Math.round((1 - product.salePrice / product.price) * 100)}% 🔥
                </span>
              )}
              {images.length > 1 && (
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-extrabold text-white"
                  style={{ background: 'rgba(10,8,24,.55)', backdropFilter: 'blur(6px)' }}>
                  {img + 1} / {images.length}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-2">
                {images.map((im: string | null, i: number) => (
                  <button key={i} onClick={() => setImg(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      img === i ? 'scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ ...(img === i ? { borderColor: primary, boxShadow: `0 6px 16px -6px ${primary}88` } : {}),
                             background: im ? `url(${API}${im}) center/cover` : '#e5e7eb' }} />
                ))}
              </div>
            )}
          </div>

          {/* التفاصيل */}
          <div className="anim-fade-up">
            <h1 className="f-3xl font-black mb-2">{product.name}</h1>
            {product.category && (
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
                style={{ background: `${primary}15`, color: primary }}>
                {product.category.name}
              </span>
            )}
            {product.sku && (
              <div className={`text-[11px] font-mono mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} dir="ltr">SKU: {product.sku}</div>
            )}
            <div className="flex items-center gap-3 mb-1">
              {needsSelection && !selectedVariant && (
                <span className="text-xs font-bold text-gray-400">يبدأ من</span>
              )}
              {product.salePrice || selectedVariant?.salePrice ? (
                <>
                  <span className="text-3xl font-black text-red-500">{fmt(price)}</span>
                  <span className="text-lg text-gray-400 line-through">{fmt(Number(selectedVariant ? selectedVariant.price : product.price))}</span>
                </>
              ) : (
                <span className="text-3xl font-black price-grad">{fmt(price)}</span>
              )}
            </div>


            {/* 🎨 خيارات المنتج — اللون والمقاس/الوزن بأسعارها */}
            {needsSelection && (
              <div className={`rounded-2xl p-3 mb-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm'}`}>
                {colors.length > 0 && (
                  <div className="mb-2.5">
                    <div className="text-xs font-extrabold mb-1.5 text-gray-500">🎨 اللون {selColor && <span style={{ color: primary }}>— {selColor}</span>}</div>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c) => {
                        const hex = variants.find(v => v.color === c)?.colorHex || '#9ca3af';
                        const active = selColor === c;
                        return (
                          <button key={c} onClick={() => { setSelColor(active ? null : c); setSelSize(null); setQty(1); }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${active ? 'text-white theme-glow scale-105' : isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                            style={active ? { background: `linear-gradient(135deg, ${primary}, ${primary}CC)` } : {}}>
                            <span className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ background: hex }} />
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (colors.length === 0 || selColor) && (
                  <div>
                    <div className="text-xs font-extrabold mb-1.5 text-gray-500">📏 {variants.some(v => /غ|جم|كجم|مل|لتر/.test(v.size || '')) ? 'الوزن/الحجم' : 'المقاس'}</div>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((s) => {
                        const v = variants.find(x => (colors.length === 0 || x.color === selColor) && x.size === s);
                        const active = selSize === s;
                        const out = v?.stock !== null && v?.stock !== undefined && v.stock <= 0;
                        return (
                          <button key={s} disabled={!!out}
                            onClick={() => { setSelSize(active ? null : s); setQty(1); }}
                            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${active ? 'text-white theme-glow scale-105' : isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'} ${out ? 'opacity-40 line-through' : ''}`}
                            style={active ? { background: `linear-gradient(135deg, ${primary}, ${primary}CC)` } : {}}>
                            {s} <span className="opacity-75">· {fmt(Number(v?.salePrice || v?.price || 0))}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {colors.length === 0 && sizes.length === 0 && null}
                {!selectedVariant && (
                  <p className="text-[11px] font-bold mt-2" style={{ color: primary }}>👆 اختر {colors.length ? 'اللون والمقاس' : 'الخيار'} ليظهر سعره النهائي</p>
                )}
              </div>
            )}

            {/* الوصف الغني (HTML من محرر البائع — مُعقّم عند الحفظ) */}
            <div className={`product-description text-sm leading-relaxed mb-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              dangerouslySetInnerHTML={{ __html: String(product.description || '')
                .replace(/<\s*(script|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
                .replace(/\son\w+\s*=\s*"[^"]*"/gi, '') }} />

            {/* 🏅 شارات الثقة الذكية — من بيانات البيع والتسليم الفعلية */}
            {product.badges?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {product.badges.map((b: any) => (
                  <span key={b.label} className="text-[10px] font-extrabold px-2.5 py-1 rounded-full"
                    style={{ background: isDark ? 'rgba(255,255,255,.08)' : 'rgba(108,61,245,.08)', color: primary }}>
                    {b.icon} {b.label}
                  </span>
                ))}
              </div>
            )}

            {/* المخزون + عداد الندرة — يتبع الخيار المختار */}
            <div className={`text-xs font-bold mb-4 ${curStock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {curStock > 0 ? `✅ متوفر (${curStock} قطعة)` : '⚠️ نفد المخزون'}
              {curStock > 0 && curStock <= (product.lowStockAt ?? 5) && (
                <span className="mr-2 text-red-500 anim-soft-pulse inline-block">⏳ يبقى {curStock} فقط — اطلب قبل النفاد!</span>
              )}
            </div>

            {/* 🔔 أعلمني عند التوفر */}
            {curStock <= 0 && !needsSelection && !alertDone && (
              <button onClick={subscribeStockAlert} disabled={alertBusy}
                className="w-full mb-3 py-3 rounded-2xl font-extrabold text-sm text-white shadow-lg disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                {alertBusy ? '⏳…' : '🔔 أعلمني فور توفره'}
              </button>
            )}
            {alertDone && (
              <p className="text-center text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl p-3 mb-3">
                ✅ سُجّلت — سنعلمك فور عودته للمخزون
              </p>
            )}

            {/* 📉 نبّهني عند نزول السعر — يظهر دائماً للزائر */}
            {!priceAlertDone ? (
              <button onClick={subscribePriceAlert} disabled={priceAlertBusy}
                className={`w-full mb-3 py-2.5 rounded-2xl font-extrabold text-xs border-2 border-dashed transition-all disabled:opacity-40 ${
                  isDark ? 'border-amber-400/30 text-amber-300 hover:bg-amber-400/10' : 'border-amber-300 text-amber-600 bg-amber-50 hover:bg-amber-100'
                }`}>
                {priceAlertBusy ? '⏳…' : '📉 نبّهني عند نزول السعر — بدون تسجيل'}
              </button>
            ) : (
              <p className={`text-center text-xs font-bold rounded-xl p-3 mb-3 ${isDark ? 'text-amber-300 bg-amber-400/10' : 'text-amber-700 bg-amber-50'}`}>
                📉 سُجّلت — سيصلك تنبيه فور نزول سعر هذا المنتج
              </p>
            )}

            {/* الكمية + السلة */}
            {curStock > 0 && (
              <div className="flex gap-2 mb-3">
                <div className={`flex items-center gap-2 rounded-2xl px-2 ${isDark ? 'bg-white/10' : 'bg-white shadow'}`}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 font-black text-lg">−</button>
                  <span className="w-8 text-center font-black">{qty}</span>
                  <button onClick={() => setQty(Math.min(curStock, qty + 1))} className="w-9 h-9 font-black text-lg">+</button>
                </div>
                <button
                  onClick={() => {
                    if (needsSelection && !selectedVariant) {
                      return toast('🎨 اختر اللون والمقاس أولاً — لكل خيار سعره', 'error');
                    }
                    addToCart(store.slug, {
                      productId: product.id, name: product.name, price, image: product.images?.[0],
                      variantId: selectedVariant?.id,
                      variant: selectedVariant ? [selectedVariant.color, selectedVariant.size].filter(Boolean).join(' — ') : undefined,
                    }, qty);
                    toast(`🛒 أُضيف ${qty} × ${product.name}${selectedVariant ? ` (${[selectedVariant.color, selectedVariant.size].filter(Boolean).join(' ')})` : ''}`);
                    window.dispatchEvent(new Event('yz-open-cart'));
                  }}
                  className="theme-glow flex-1 py-3.5 rounded-2xl text-white font-extrabold text-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 55%, ${secondary}))` }}>
                  🛒 أضف للسلة{selectedVariant ? ` — ${fmt(price)}` : ''}
                </button>
              </div>
            )}

            {/* 🖼️ بطاقة مشاركة — بطاقة مصممة للحالات والقروبات */}
            <Link href={`/tools/share-card?url=${encodeURIComponent(`${typeof location !== 'undefined' ? location.origin : ''}/store/${store.slug}/product/${product.id}`)}`}
              target="_blank"
              className={`block text-center py-3 rounded-2xl font-extrabold text-sm mb-3 transition-all hover:scale-[1.01] ${isDark ? 'bg-white/10 text-gray-200' : 'bg-white text-gray-700 shadow'}`}>
              🖼️ ولّد بطاقة مشاركة لهذا المنتج
            </Link>

            {/* ⚖️ مقارنة + ❤️ مفضلة */}
            <div className="flex gap-2 mb-3">
              <button onClick={onCompare}
                className={`flex-1 py-3 rounded-2xl font-extrabold text-sm transition-all ${
                  inCompare
                    ? 'text-white shadow-lg'
                    : isDark ? 'bg-white/10 text-gray-200' : 'bg-white text-gray-600 shadow'
                }`}
                style={inCompare ? { background: 'linear-gradient(135deg, #0d9488, #059669)' } : {}}>
                {inCompare ? '✅ في قائمة المقارنة — اضغط للإزالة' : '⚖️ أضف للمقارنة'}
              </button>
              <WishlistButton productId={product.id} primary={primary} />
            </div>

            {/* طلب واتساب مباشر */}
            {store.whatsapp && product.stock > 0 && (
              <a
                href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أريد طلب:\n▪️ ${product.name}${selectedVariant ? ` (${[selectedVariant.color, selectedVariant.size].filter(Boolean).join(' ')})` : ''} × ${qty} = ${(price * qty).toLocaleString()} ر.ي\nمن متجر ${store.name}`)}`}
                target="_blank"
                className="block text-center py-3.5 rounded-2xl bg-green-500 text-white font-extrabold shadow-xl transition-all hover:scale-[1.02]">
                💬 اطلب مباشرة عبر واتساب
              </a>
            )}
          </div>
        </div>

        {/* 🧬 مواصفات حسب نوع المنتج — منظمة ومترجمة */}
        {(() => {
          const pk = product.productKind ? productKindInfo(product.productKind) : null;
          const chips = specChips(product.specs || {});
          if (!pk && chips.length === 0) return null;
          return (
            <section className={`mt-8 rounded-3xl p-5 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm'}`}>
              <h2 className="font-black f-lg mb-3 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: `linear-gradient(180deg, ${primary}, ${secondary})` }} />
                {pk ? `${pk.icon} مواصفات ${pk.name}` : '🧬 المواصفات'}
              </h2>
              {chips.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  {chips.map((c, i) => {
                    const [k, ...rest] = c.split(': ');
                    return (
                      <div key={i} className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl text-sm ${isDark ? 'bg-white/5' : 'bg-purple-50/60'}`}>
                        <span className="font-bold text-gray-400 text-xs">{k}</span>
                        <b className="text-left">{rest.join(': ')}</b>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })()}

        {/* 🏷️ مواصفات المنتج — حقول البائع */}
        {features.length > 0 && (
          <section className={`mt-8 rounded-3xl p-5 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm'}`}>
            <h2 className="font-black f-lg mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full" style={{ background: `linear-gradient(180deg, ${primary}, ${secondary})` }} />
              🏷️ مواصفات ومميزات المنتج
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {features.map((f: any, i: number) => (
                <div key={i} className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl text-sm ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <span className="font-bold text-gray-400 text-xs">{f.key}</span>
                  <b className="text-left">{f.value}</b>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 💬 أسئلة وأجوبة */}
        <ProductQA productId={product.id} primary={primary} isDark={isDark} />

        {/* 🤖 منتجات مشابهة */}
        {similar?.length > 0 && (
          <section className="mt-10">
            <h2 className="font-black f-xl mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full" style={{ background: `linear-gradient(180deg, ${primary}, ${secondary})` }} />
              🤖 قد يعجبك أيضاً
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {similar.map((p: any) => (
                <Link key={p.id} href={`/store/${store.slug}/product/${p.id}`}
                  className={`rounded-2xl overflow-hidden card-hover card-glow ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm'}`}>
                  <div className="h-28 relative overflow-hidden">
                    <div className="zoom-bg absolute inset-0" style={p.images?.[0]
                      ? { background: `url(${API}${p.images[0]}) center/cover` }
                      : { background: `${primary}15` }} />
                  </div>
                  <div className="p-2.5">
                    <div className="font-bold text-xs truncate">{p.name}</div>
                    <div className="font-black f-sm mt-0.5 price-grad">
                      {Number(p.salePrice || p.price).toLocaleString()} ر.ي
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 🛍️ توصيات عابرة للمتاجر */}
        <CrossStoreReco productId={product.id} isDark={isDark} />
      </div>

      <CartDrawer store={store} primary={primary} />
    </main>
  );
}
