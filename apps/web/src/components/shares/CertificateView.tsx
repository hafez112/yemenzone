'use client';
import { toast } from '@/components/Toast';

// 📜 صك ملكية أسهم — تصميم ملوّن فاخر يُطبع بألوانه الكاملة (print-color-adjust: exact)
// يُعرض داخل أي صفحة: لوحة البائع/العميل + الصفحة العامة للتحقق
export default function CertificateView({ c }: { c: any }) {
  const verifyUrl = `https://yemenzone1.com/share-certificate/${c.number}`;
  const cur = c.currency === 'YER' ? 'ر.ي' : c.currency;
  const dateStr = new Date(c.createdAt).toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' });
  const active = c.status === 'active';

  const shareWa = () => {
    const text = `📜 صك ملكية أسهم في منصة يمن زون\nرقم الصك: ${c.number}\nعدد الأسهم: ${Number(c.shares).toLocaleString()}\nتحقق منه: ${verifyUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(verifyUrl); toast('✅ نُسخ رابط التحقق من الصك — شاركه حيث تريد'); }
    catch { toast('⚠️ تعذّر النسخ', 'error'); }
  };

  // زخرفة زاوية ذهبية
  const Corner = ({ pos }: { pos: string }) => (
    <div className={`absolute w-14 h-14 pointer-events-none ${pos}`}>
      <div className="absolute inset-0" style={{
        border: '3px solid #c9a227', borderRadius: pos.includes('top') && pos.includes('right') ? '0 14px 0 0' : pos.includes('top') ? '14px 0 0 0' : pos.includes('right') ? '0 0 14px 0' : '0 0 0 14px',
        borderColor: '#c9a227', borderStyle: 'solid',
        borderWidth: pos === 'top-0 right-0' ? '3px 3px 0 0' : pos === 'top-0 left-0' ? '3px 0 0 3px' : pos === 'bottom-0 right-0' ? '0 3px 3px 0' : '0 0 3px 3px',
      }} />
      <div className="absolute text-amber-600 text-sm" style={{ [pos.includes('top') ? 'top' : 'bottom']: 14, [pos.includes('right') ? 'right' : 'left']: 14 } as any}>✦</div>
    </div>
  );

  return (
    <div>
      <style>{`
        #yz-cert, #yz-cert * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @media print {
          body * { visibility: hidden; }
          #yz-cert, #yz-cert * { visibility: visible; }
          #yz-cert { position: absolute; inset: 0; width: 100%; margin: 0; box-shadow: none; border-radius: 0; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>

      {/* أزرار الإجراءات — تختفي عند الطباعة */}
      <div className="flex gap-2 justify-center flex-wrap print:hidden mb-3">
        <button onClick={() => window.print()}
          className="px-6 py-2.5 rounded-full text-white text-sm font-extrabold shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0f766e, #059669)' }}>
          🖨️ طباعة الصك ملوّناً
        </button>
        <button onClick={shareWa}
          className="px-6 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-extrabold shadow-lg">
          💬 مشاركة واتساب
        </button>
        <button onClick={copyLink}
          className="px-6 py-2.5 rounded-full bg-white text-slate-700 text-sm font-extrabold border border-slate-200">
          🔗 نسخ رابط التحقق
        </button>
      </div>

      {/* ═══ الصك ═══ */}
      <div id="yz-cert" className="relative rounded-2xl overflow-hidden shadow-2xl mx-auto"
        style={{ background: 'linear-gradient(150deg, #134e4a, #0f766e 40%, #0f172a)', padding: 10 }}>

        {/* ورقة الصك */}
        <div className="relative rounded-xl overflow-hidden" style={{
          background: 'linear-gradient(135deg, #fffdf5, #faf3dd 55%, #fdf6e3)',
        }}>
          {/* نسيج خلفي خفيف (guilloche مبسّط) */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.35]" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #0f766e08 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, #b8860b08 0 2px, transparent 2px 14px)',
          }} />
          {/* زخارف الزوايا */}
          <Corner pos="top-0 right-0" />
          <Corner pos="top-0 left-0" />
          <Corner pos="bottom-0 right-0" />
          <Corner pos="bottom-0 left-0" />

          {/* العلامة المائية المزدوجة */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none opacity-[0.045]">
            <span className="font-black" style={{ fontSize: 200, color: '#0f766e', fontFamily: 'serif' }}>YZ</span>
          </div>

          <div className="relative px-6 md:px-12 pt-6 pb-8 text-center" dir="rtl">

            {/* الترويسة الملونة */}
            <div className="rounded-2xl px-6 py-4 mx-auto max-w-2xl shadow-lg" style={{
              background: 'linear-gradient(135deg, #0f766e, #059669 55%, #c9a227)',
            }}>
              <div className="flex items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full grid place-items-center font-black text-xl shadow-inner shrink-0"
                  style={{ background: 'radial-gradient(circle at 30% 30%, #fff8e1, #f5d67b)', color: '#0f766e' }}>YZ</div>
                <div className="text-right">
                  <div className="font-black text-2xl text-white drop-shadow">منصة يمن زون</div>
                  <div className="text-[10px] font-bold text-amber-100 tracking-[0.3em]">YEMEN ZONE PLATFORM</div>
                </div>
              </div>
            </div>

            {/* فاصل مزخرف */}
            <div className="flex items-center gap-3 my-5 max-w-lg mx-auto">
              <div className="flex-1 h-0.5 rounded" style={{ background: 'linear-gradient(to left, transparent, #c9a227)' }} />
              <span className="text-amber-600 text-lg">✦</span>
              <div className="flex-1 h-0.5 rounded" style={{ background: 'linear-gradient(to right, transparent, #c9a227)' }} />
            </div>

            {/* العنوان */}
            <h1 className="font-black text-3xl md:text-4xl" style={{
              fontFamily: 'serif',
              background: 'linear-gradient(135deg, #b8860b, #8b6914 40%, #0f766e)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              صك ملكية أسهم
            </h1>
            <p className="text-[11px] font-bold text-amber-700 tracking-[0.35em] mt-1 mb-5">SHARE OWNERSHIP CERTIFICATE</p>

            <p className="text-sm font-bold text-slate-500">تشهد إدارة منصة يمن زون بأن السيد/السيدة</p>

            {/* اسم المساهم — إطار مزخرف */}
            <div className="inline-block mt-2 mb-3 px-10 py-2.5 rounded-full shadow" style={{
              background: 'linear-gradient(135deg, #0f766e0f, #c9a22718)',
              border: '1.5px solid #c9a22766',
            }}>
              <span className="text-amber-600 mx-2">❖</span>
              <span className="font-black text-2xl md:text-3xl" style={{ color: '#0f5e57' }}>{c.ownerName}</span>
              <span className="text-amber-600 mx-2">❖</span>
            </div>

            <p className="text-sm font-bold text-slate-600 leading-loose max-w-xl mx-auto">
              يمتلك <span className="font-black text-lg" style={{ color: '#0f766e' }}>({Number(c.shares).toLocaleString()}) سهماً</span> من أسهم إسهام منصة يمن زون
              ضمن «{c.offering}» بقيمة شراء إجمالية قدرها
              <span className="font-black text-slate-800"> {Number(c.totalAmount).toLocaleString()} {c.currency === 'YER' ? 'ريالاً يمنياً' : c.currency}</span>،
              بما يعادل <span className="font-black" style={{ color: '#b8860b' }}>{c.ownershipPct}%</span> من إجمالي أسهم المنصة،
              وله ما للمساهمين من حقوق في الأرباح الموزعة وعليه ما عليهم من التزامات.
            </p>

            {/* بيانات الصك — خلايا ملونة */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6 max-w-2xl mx-auto">
              {[
                ['رقم الصك', c.number, 'linear-gradient(135deg,#fef3c7,#fde68a)', '#92400e'],
                ['تاريخ الإصدار', dateStr, 'linear-gradient(135deg,#ecfdf5,#d1fae5)', '#065f46'],
                ['سعر السهم عند الشراء', `${Number(c.pricePerShare).toLocaleString()} ${cur}`, 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', '#075985'],
                ['القيمة الاسترشادية الآن', `${Number(c.currentValue).toLocaleString()} ر.ي`, 'linear-gradient(135deg,#fdf2f8,#fce7f3)', '#9d174d'],
              ].map(([k, v, bg, fg]) => (
                <div key={k as string} className="rounded-xl py-2.5 px-2 shadow-sm" style={{ background: bg as string, border: '1px solid #00000010' }}>
                  <div className="text-[9px] font-black" style={{ color: fg as string }}>{k}</div>
                  <div className="font-black text-xs mt-0.5 text-slate-800" dir={String(v).startsWith('YZS') ? 'ltr' : 'rtl'}>{v}</div>
                </div>
              ))}
            </div>

            {/* التوقيعات والختم */}
            <div className="flex items-end justify-between mt-9 max-w-xl mx-auto">
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500 mb-6">المساهم</div>
                <div className="w-32 h-0.5 rounded" style={{ background: 'linear-gradient(to left, #94a3b8, #cbd5e1)' }} />
                <div className="text-[10px] font-bold text-slate-600 mt-1.5">{c.ownerName}</div>
              </div>

              {/* الختم الذهبي بأشعة */}
              <div className="relative w-32 h-32 shrink-0">
                {/* أشعة دوارة */}
                <div className="absolute inset-0 rounded-full" style={{
                  background: 'conic-gradient(from 0deg, #c9a22722 0deg 10deg, transparent 10deg 20deg, #c9a22722 20deg 30deg, transparent 30deg 40deg, #c9a22722 40deg 50deg, transparent 50deg 60deg, #c9a22722 60deg 70deg, transparent 70deg 80deg, #c9a22722 80deg 90deg, transparent 90deg 100deg, #c9a22722 100deg 110deg, transparent 110deg 120deg, #c9a22722 120deg 130deg, transparent 130deg 140deg, #c9a22722 140deg 150deg, transparent 150deg 160deg, #c9a22722 160deg 170deg, transparent 170deg 180deg, #c9a22722 180deg 190deg, transparent 190deg 200deg, #c9a22722 200deg 210deg, transparent 210deg 220deg, #c9a22722 220deg 230deg, transparent 230deg 240deg, #c9a22722 240deg 250deg, transparent 250deg 260deg, #c9a22722 260deg 270deg, transparent 270deg 280deg, #c9a22722 280deg 290deg, transparent 290deg 300deg, #c9a22722 300deg 310deg, transparent 310deg 320deg, #c9a22722 320deg 330deg, transparent 330deg 340deg, #c9a22722 340deg 350deg, transparent 350deg 360deg)',
                }} />
                <div className="absolute inset-2 rounded-full grid place-items-center shadow-lg" style={{
                  border: '3px double #b8860b',
                  background: 'radial-gradient(circle at 35% 30%, #fff8e1, #f0d488 55%, #d4af37)',
                }}>
                  <div className="text-center">
                    <div className="text-2xl drop-shadow">🏅</div>
                    <div className="text-[9px] font-black" style={{ color: '#7c5a0b' }}>منصة يمن زون</div>
                    <div className="text-[7px] font-bold" style={{ color: '#7c5a0b' }}>ختم الاعتماد الرسمي</div>
                    <div className="text-[8px] font-black mt-0.5" style={{ color: '#0f766e' }} dir="ltr">{c.number}</div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500 mb-6">إدارة المنصة</div>
                <div className="w-32 h-0.5 rounded" style={{ background: 'linear-gradient(to right, #94a3b8, #cbd5e1)' }} />
                <div className="text-[10px] font-bold text-slate-600 mt-1.5">التوقيع المعتمد</div>
              </div>
            </div>

            {/* الحالة + شريط التحقق */}
            <div className="mt-7 space-y-2">
              {active ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-5 py-2 rounded-full shadow-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  ✅ صك معتمد وساري
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-5 py-2 rounded-full text-white"
                  style={{ background: c.status === 'pending' ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#dc2626,#ef4444)' }}>
                  {c.status === 'pending' ? '⏳ قيد المراجعة — لم يُعتمد بعد' : '🚫 صك ملغي — لا قيمة له'}
                </span>
              )}
              <div className="text-[9px] font-bold text-slate-400" dir="ltr">
                Verify: yemenzone1.com/share-certificate/{c.number}
              </div>
            </div>

          </div>

          {/* الشريط السفلي الملون */}
          <div className="h-3" style={{ background: 'linear-gradient(to left, #0f766e, #c9a227, #059669, #c9a227, #0f766e)' }} />
        </div>
      </div>
    </div>
  );
}
