'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SERVER_API_SAFE } from './techHelper';

// ⚡ تكنولوجيا المنصة — صفحة تسويقية تفاعلية تعرض قوة يمن زون
const PILLARS = [
  { icon: '⚡', title: 'سرعة صاروخية', points: ['صفحات تُخزَّن وتُفتح في أجزاء الثانية', 'كاش ذكي متعدد الطبقات', 'صور مضغوطة تلقائياً بصيغ حديثة'] },
  { icon: '🤖', title: 'ذكاء محلي خاص بنا', points: ['مساعد ذكي يعمل بدون خوادم خارجية', 'اقتراحات وكتابة أوصاف وتحليلات', 'بياناتك لا تغادر المنصة أبداً'] },
  { icon: '🔒', title: 'أمان مصرفي', points: ['تشفير كامل للاتصالات والكلمات', 'مصادقة ثنائية وحماية من الاختراق', 'نسخ احتياطي تلقائي مستمر'] },
  { icon: '🏬', title: '6 أنواع أنشطة في منصة واحدة', points: ['متاجر · إيجارات · فنادق · خدمات', 'مطاعم بمنيو وQR · مولات بأصناف شجرية', 'كل نوع بثيمه ولوحته المخصصة'] },
  { icon: '💳', title: 'مدفوعات يمنية أصيلة', points: ['بطاقة يمن زون الذكية بالرصيد', 'محافظ وتحويلات وكاش عند الاستلام', 'رفع إيصال وتأكيد فوري'] },
  { icon: '📱', title: 'تطبيق بلا تحميل', points: ['يعمل كتطبيق جوال من المتصفح مباشرة', 'يشتغل جزئياً حتى بلا إنترنت', 'إشعارات فورية للطلبات'] },
];

function Counter({ to, label }: { to: number; label: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 1400, 1);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to]);
  return <div className="text-center"><p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-l from-purple-300 to-amber-300">{v.toLocaleString()}+</p><p className="text-xs text-white/60 font-bold mt-1">{label}</p></div>;
}

export default function TechTool() {
  const [stats, setStats] = useState<{ stores: number; products: number; orders: number } | null>(null);
  useEffect(() => {
    fetch(`${SERVER_API_SAFE()}/api/v1/home/spotlight`).then((r) => r.json()).then((d) => { if (d?.stats) setStats(d.stats); }).catch(() => {});
  }, []);

  return (
    <div className="space-y-10">
      {/* البطل */}
      <section className="text-center pt-4">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-3">
          تقنية <span className="text-transparent bg-clip-text bg-gradient-to-l from-purple-400 to-amber-300">يمنية</span> بمعايير عالمية
        </h2>
        <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          يمن زون ليست موقعاً — إنها بنية تحتية تجارية كاملة بُنيت من الصفر لتخدم التاجر والمتسوق اليمني بأحدث ما وصلت إليه تقنية الويب
        </p>
      </section>

      {/* أرقام حية */}
      {stats && (
        <section className="grid grid-cols-3 gap-3">
          <Counter to={stats.stores} label="متجر ونشاط" />
          <Counter to={stats.products} label="منتج معروض" />
          <Counter to={stats.orders} label="طلب ناجح" />
        </section>
      )}

      {/* الركائز */}
      <section className="grid sm:grid-cols-2 gap-4">
        {PILLARS.map((p, i) => (
          <div key={p.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-purple-400/40 transition-all hover:-translate-y-1 duration-300">
            <div className="text-4xl mb-3">{p.icon}</div>
            <h3 className="font-extrabold text-lg mb-2">{p.title}</h3>
            <ul className="space-y-1.5">
              {p.points.map((pt) => (
                <li key={pt} className="text-sm text-white/70 flex gap-2"><span className="text-purple-400 shrink-0">◆</span>{pt}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* لماذا نحن */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="font-black text-xl mb-4 text-center">🆚 لماذا يمن زون وليس غيرها؟</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-white/50 text-xs border-b border-white/10">
              <th className="py-2 text-right">الميزة</th><th className="py-2">يمن زون</th><th className="py-2">المنصات الأجنبية</th>
            </tr></thead>
            <tbody className="text-center">
              {[
                ['مصممة للسوق اليمني وعملته وواتسابه', '✅', '❌'],
                ['تعمل بسلاسة مع الإنترنت الضعيف', '✅', '❌'],
                ['مدفوعات محلية (كاش/محافظ/بطاقة)', '✅', '❌'],
                ['عربية RTL أصيلة 100%', '✅', '⚠️ جزئياً'],
                ['دعم بشري يتكلم لهجتك', '✅', '❌'],
                ['كل أدوات التاجر مجانية', '✅', '💰 مدفوعة'],
              ].map(([f, us, them]) => (
                <tr key={f} className="border-b border-white/5">
                  <td className="py-3 text-right font-bold text-white/80">{f}</td>
                  <td className="py-3">{us}</td><td className="py-3">{them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center pb-4">
        <h3 className="text-2xl font-black mb-2">جاهز تنضم للمستقبل؟ 🚀</h3>
        <p className="text-white/60 text-sm mb-5">افتح متجرك اليوم — بلا بطاقة بنكية، بلا خبرة تقنية، خلال 5 دقائق</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/auth/seller-register" className="px-8 py-3.5 rounded-full bg-gradient-to-l from-purple-600 to-amber-500 font-extrabold shadow-xl shadow-purple-500/40 hover:brightness-110 transition-all">🛍️ أنشئ متجرك مجاناً</Link>
          <Link href="/tools" className="px-8 py-3.5 rounded-full bg-white/10 font-bold hover:bg-white/20 transition-colors">🧰 جرّب أدواتنا</Link>
        </div>
      </section>
    </div>
  );
}
