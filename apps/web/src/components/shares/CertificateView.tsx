'use client';
import { toast } from '@/components/Toast';

// 📜 صك ملكية أسهم — تصميم فاخر قابل للطباعة والمشاركة، يُعرض داخل أي صفحة (لوحة البائع/العميل/الصفحة العامة)
// يستقبل بيانات الصك الجاهزة من /v1/shares/certificate/:number
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

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #yz-cert, #yz-cert * { visibility: visible; }
          #yz-cert { position: absolute; inset: 0; width: 100%; margin: 0; box-shadow: none; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>

      {/* أزرار الإجراءات — تختفي عند الطباعة */}
      <div className="flex gap-2 justify-center flex-wrap print:hidden mb-3">
        <button onClick={() => window.print()}
          className="px-6 py-2.5 rounded-full bg-slate-800 text-white text-sm font-extrabold shadow-lg">
          🖨️ طباعة الصك
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
      <div id="yz-cert" className="relative rounded-lg overflow-hidden shadow-2xl mx-auto"
        style={{ background: 'linear-gradient(135deg, #fdfbf3, #f5f0dd)', border: '3px solid #b8860b' }}>
        {/* الإطار المزخرف الداخلي */}
        <div className="absolute inset-2 rounded pointer-events-none" style={{ border: '1.5px solid #b8860b55' }} />
        <div className="absolute inset-3.5 rounded pointer-events-none" style={{ border: '0.5px solid #b8860b33' }} />

        {/* العلامة المائية */}
        <div className="absolute inset-0 grid place-items-center pointer-events-none opacity-[0.05]">
          <span className="font-black" style={{ fontSize: 180, color: '#0f766e' }}>YZ</span>
        </div>

        <div className="relative px-8 md:px-14 py-10 text-center" dir="rtl">
          {/* الترويسة */}
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full grid place-items-center text-white font-black text-lg shadow"
              style={{ background: 'linear-gradient(135deg, #0f766e, #059669)' }}>YZ</div>
            <div className="text-right">
              <div className="font-black text-xl" style={{ color: '#0f766e' }}>منصة يمن زون</div>
              <div className="text-[10px] font-bold text-amber-700 tracking-widest">YEMEN ZONE PLATFORM</div>
            </div>
          </div>
          <div className="h-px my-4" style={{ background: 'linear-gradient(to left, transparent, #b8860b, transparent)' }} />

          <h1 className="font-black text-2xl md:text-3xl mb-1" style={{ color: '#1a3a2f', fontFamily: 'serif' }}>
            صك ملكية أسهم
          </h1>
          <p className="text-[11px] font-bold text-amber-700 tracking-widest mb-6">SHARE OWNERSHIP CERTIFICATE</p>

          <p className="text-sm font-bold text-slate-600 leading-loose max-w-xl mx-auto">
            تشهد إدارة منصة يمن زون بأن السيد/السيدة
          </p>
          <p className="font-black text-2xl my-2" style={{ color: '#0f766e' }}>{c.ownerName}</p>
          <p className="text-sm font-bold text-slate-600 leading-loose max-w-xl mx-auto">
            يمتلك <span className="font-black text-lg text-slate-800">({Number(c.shares).toLocaleString()}) سهماً</span> من أسهم إسهام منصة يمن زون
            ضمن «{c.offering}» بقيمة شراء إجمالية قدرها
            <span className="font-black text-slate-800"> {Number(c.totalAmount).toLocaleString()} {c.currency === 'YER' ? 'ريالاً يمنياً' : c.currency}</span>،
            بما يعادل <span className="font-black text-slate-800">{c.ownershipPct}%</span> من إجمالي أسهم المنصة،
            وله ما للمساهمين من حقوق في الأرباح الموزعة وعليه ما عليهم من التزامات.
          </p>

          {/* بيانات الصك */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6 max-w-2xl mx-auto">
            {[
              ['رقم الصك', c.number],
              ['تاريخ الإصدار', dateStr],
              ['سعر السهم', `${Number(c.pricePerShare).toLocaleString()} ${cur}`],
              ['القيمة الاسترشادية الآن', `${Number(c.currentValue).toLocaleString()} ر.ي`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl py-2.5 px-2" style={{ background: '#0f766e0d', border: '1px solid #0f766e22' }}>
                <div className="text-[9px] font-bold text-teal-700">{k}</div>
                <div className="font-black text-xs mt-0.5 text-slate-800" dir={String(v).startsWith('YZS') ? 'ltr' : 'rtl'}>{v}</div>
              </div>
            ))}
          </div>

          {/* التوقيعات والختم */}
          <div className="flex items-end justify-between mt-10 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-500 mb-6">المساهم</div>
              <div className="w-32 h-px bg-slate-400" />
              <div className="text-[10px] font-bold text-slate-500 mt-1">{c.ownerName}</div>
            </div>

            {/* الختم */}
            <div className="relative w-28 h-28 shrink-0">
              <div className="absolute inset-0 rounded-full grid place-items-center"
                style={{ border: '3px double #b8860b', background: 'radial-gradient(circle, #fdfbf3 55%, #b8860b22)' }}>
                <div className="text-center">
                  <div className="text-xl">🏅</div>
                  <div className="text-[8px] font-black" style={{ color: '#b8860b' }}>منصة يمن زون</div>
                  <div className="text-[7px] font-bold" style={{ color: '#b8860b' }}>ختم الاعتماد</div>
                  <div className="text-[7px] font-black text-teal-700 mt-0.5" dir="ltr">{c.number}</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-500 mb-6">إدارة المنصة</div>
              <div className="w-32 h-px bg-slate-400" />
              <div className="text-[10px] font-bold text-slate-500 mt-1">التوقيع المعتمد</div>
            </div>
          </div>

          {/* الحالة */}
          <div className="mt-8">
            {active ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-4 py-1.5 rounded-full"
                style={{ background: '#05966915', color: '#059669', border: '1px solid #05966933' }}>
                ✅ صك معتمد وساري — تحقق منه في أي وقت عبر رابطه
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-4 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                {c.status === 'pending' ? '⏳ قيد المراجعة — لم يُعتمد بعد' : '🚫 صك ملغي — لا قيمة له'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
