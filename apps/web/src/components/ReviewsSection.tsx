'use client';
import { useState } from 'react';
import { api, imgUrl } from '@/lib/api';
import { toast } from '@/components/Toast';
import PhoneInput from '@/components/PhoneInput';
import { KIND_INFO, type StoreKind } from '@/lib/activity';

// قسم التقييمات والإعجاب — في واجهة النشاط (يحترم اسم كل نشاط: متجر/فندق/معرض إيجارات/مركز خدمات)
export default function ReviewsSection({ store, primary, isDark }: any) {
  const kn = KIND_INFO[(store.type?.kind || 'products') as StoreKind] || KIND_INFO.products;
  const [reviews, setReviews] = useState<any[]>(store.reviews || []);
  const [likes, setLikes] = useState(store.likesCount || 0);
  const [liked, setLiked] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', rating: 5, comment: '', orderNumber: '' });
  const [sending, setSending] = useState(false);
  const [imgs, setImgs] = useState<string[]>([]); // 📸 صور التقييم
  const [uploadingImg, setUploadingImg] = useState(false);

  // 📸 رفع صورة تقييم — فوري
  async function uploadImg(file?: File | null) {
    if (!file || imgs.length >= 2) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/reviews/upload`, { method: 'POST', body: fd }).then((x) => x.json());
      if (r.urls?.length) {
        setImgs((p) => [...p, ...r.urls].slice(0, 2));
        toast('📸 أُرفقت الصورة');
      } else throw new Error(r.message || 'تعذر الرفع');
    } catch (e: any) { toast(e.message, 'error'); }
    setUploadingImg(false);
  }

  async function toggleLike() {
    const phone = prompt('📱 أدخل رقم جوالك لتسجيل الإعجاب:');
    if (!phone?.trim()) return;
    try {
      const r = await api(`/v1/stores/${store.slug}/like`, {
        method: 'POST', body: JSON.stringify({ phone: phone.trim() }),
      });
      setLiked(r.liked);
      setLikes(r.likesCount);
      toast(r.liked ? `❤️ أعجبك ${kn.thisNoun}` : 'تم إلغاء الإعجاب');
    } catch (e: any) { toast(e.message, 'error'); }
  }

  async function submitReview() {
    if (!form.name.trim() || !form.phone.trim()) return toast('الاسم والجوال مطلوبان', 'error');
    setSending(true);
    try {
      const r = await api(`/v1/reviews/${store.slug}`, {
        method: 'POST', body: JSON.stringify({ ...form, images: imgs }),
      });
      setReviews([{ ...r.review, customer: { name: form.name }, images: imgs }, ...reviews]);
      setShowForm(false);
      setForm({ name: '', phone: '', rating: 5, comment: '', orderNumber: '' });
      setImgs([]);
      toast(r.pointsEarned > 0
        ? `🎁 شكراً لتقييمك الموثوق — كسبت ${r.pointsEarned} نقطة!`
        : `🌟 شكراً لتقييمك! درجة ${kn.pageWord} الآن ${r.smartScore}`);
    } catch (e: any) { toast(e.message, 'error'); }
    setSending(false);
  }

  return (
    <div className="max-w-5xl mx-auto px-3 mt-8" style={{ '--tp': primary } as any}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`font-black f-xl flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
          <span className="w-1.5 h-6 rounded-full" style={{ background: primary }} />
          ⭐ تقييمات العملاء ({store.ratingCount || 0})
        </h2>
        <div className="flex gap-2">
          <button onClick={toggleLike}
            className="px-4 py-2 rounded-full text-sm font-bold transition-all hover:scale-105"
            style={{ background: liked ? '#FEE2E2' : isDark ? 'rgba(255,255,255,0.08)' : '#fff', color: liked ? '#DC2626' : undefined }}>
            {liked ? '❤️' : '🤍'} {likes}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="theme-glow px-4 py-2 rounded-full text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${primary}, ${primary}CC)` }}>
            ✍️ قيّمنا
          </button>
        </div>
      </div>

      {/* متوسط التقييم */}
      {store.ratingAvg > 0 && (
        <div className={`rounded-2xl p-3 mb-3 flex items-center gap-3 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
          <span className="text-3xl font-black stars-gold">{store.ratingAvg.toFixed(1)}</span>
          <div>
            <div className="stars-gold text-lg">{'★'.repeat(Math.round(store.ratingAvg))}{'☆'.repeat(5 - Math.round(store.ratingAvg))}</div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>من {store.ratingCount} تقييم</div>
          </div>
        </div>
      )}

      {/* نموذج التقييم */}
      {showForm && (
        <div className={`rounded-3xl p-4 mb-3 anim-bounce-in space-y-3 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm'}`}>
          <div className="flex justify-center gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setForm({ ...form, rating: n })}
                className="text-3xl transition-transform hover:scale-125"
                style={{ opacity: n <= form.rating ? 1 : 0.25 }}>
                ⭐
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="اسمك *" className="px-4 py-3 rounded-xl border border-gray-200 input-theme text-gray-900" />
            <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>
          <textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })}
            placeholder="رأيك في المتجر (اختياري)" rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 input-theme text-gray-900" />
          {/* 🧾 رقم الطلب — يمنح شارة «مشترٍ موثّق ✅» وقد يكون إلزامياً حسب سياسة المنصة */}
          <input value={form.orderNumber} onChange={e => setForm({ ...form, orderNumber: e.target.value })}
            placeholder="🧾 رقم طلبك (اختياري — لشارة مشترٍ موثوق ✅)" dir="ltr"
            className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50/50 input-theme text-gray-900 placeholder:text-right" />
          <p className={`text-[10px] -mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            اشتريت من {kn.thisNoun}؟ أدخل رقم طلبك (مثل ORD-123456) ليظهر تقييمك بشارة ✅ مشترٍ موثّق
          </p>
          {/* 📸 صور المشتري — حتى صورتين */}
          <div className="flex items-center gap-2">
            <label className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-center text-xs font-bold text-gray-500 cursor-pointer hover:border-purple-300 transition-all">
              {uploadingImg ? '⏳ جاري الرفع...' : imgs.length >= 2 ? '✅ صورتان مرفقتان' : '📸 أرفق صورة للمنتج (اختياري)'}
              <input type="file" accept="image/*" hidden disabled={uploadingImg || imgs.length >= 2}
                onChange={(e) => { uploadImg(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {imgs.map((u, i) => (
              <div key={i} className="relative w-11 h-11 rounded-xl shrink-0 overflow-hidden shadow"
                style={{ background: `url(${imgUrl(u)}) center/cover` }}>
                <button onClick={() => setImgs(imgs.filter((_, x) => x !== i))}
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[9px]">✕</button>
              </div>
            ))}
          </div>
          <button onClick={submitReview} disabled={sending}
            className="w-full py-3 rounded-2xl text-white font-extrabold disabled:opacity-40"
            style={{ background: primary }}>
            {sending ? '⏳...' : '🌟 إرسال التقييم'}
          </button>
        </div>
      )}

      {/* قائمة التقييمات */}
      <div className="space-y-2">
        {reviews.length === 0 && (
          <div className={`text-center py-8 text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            كن أول من يقيّم {kn.thisNoun} ⭐
          </div>
        )}
        {reviews.map((r: any) => (
          <div key={r.id} className={`rounded-2xl p-3 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`font-bold text-sm flex items-center gap-1.5 flex-wrap ${isDark ? 'text-white' : ''}`}>
                👤 {r.customer?.name || 'عميل'}
                {r.orderId && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
                    title={r.orderNumber ? `تقييم مرتبط بالطلب ${r.orderNumber}` : 'تقييم مرتبط بطلب فعلي'}>
                    ✅ مشترٍ موثّق
                  </span>
                )}
              </span>
              <span className="stars-gold text-sm shrink-0">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            </div>
            {r.comment && <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{r.comment}</p>}
            {/* 📸 صور المشتري */}
            {Array.isArray(r.images) && r.images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {r.images.map((u: string, i: number) => (
                  <a key={i} href={imgUrl(u)} target="_blank"
                    className="w-14 h-14 rounded-xl overflow-hidden shadow-sm hover:scale-105 transition-transform block"
                    style={{ background: `url(${imgUrl(u)}) center/cover` }} />
                ))}
              </div>
            )}
            {/* 💬 رد المتجر — يبني ثقة الزوار */}
            {r.reply && (
              <div className={`mt-2 p-2.5 rounded-xl text-xs border-r-4 ${isDark ? 'bg-white/5 text-gray-300' : 'bg-purple-50 text-gray-600'}`}
                style={{ borderColor: primary }}>
                <b style={{ color: primary }}>{kn.icon} ردّ {store.name}:</b>
                <p className="mt-0.5">{r.reply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
