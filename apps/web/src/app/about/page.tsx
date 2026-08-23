import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { CountUpStat } from '@/components/info/InfoWidgets';

import { SERVER_API as API } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'من نحن — يمن زون',
  description: 'يمن زون: منصة التجارة الإلكترونية اليمنية — نمكّن التجار اليمنيين من البيع أونلاين بمتاجر جاهزة في دقائق.',
};

async function getStats() {
  try {
    const d = await fetch(`${API}/api/v1/home/spotlight`, { next: { revalidate: 300 } }).then((r) => r.json());
    return d?.stats || null;
  } catch { return null; }
}

// من نحن — قصة المنصة ورؤيتها بأرقام حقيقية
export default async function AboutPage() {
  const stats = await getStats();

  return (
    <main className="min-h-screen pb-24">
      {/* البطل */}
      <section className="relative overflow-hidden bg-night bg-aurora pt-28 pb-16 px-4 text-center text-white">
        <div className="absolute -top-20 -right-20 w-80 h-80 anim-blob opacity-20" style={{ background: 'var(--primary)' }} />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 anim-blob opacity-15" style={{ background: 'var(--secondary)', animationDelay: '-4s' }} />
        <div className="relative max-w-2xl mx-auto">
          <span className="inline-block glass-dark px-4 py-1.5 rounded-full text-sm font-bold text-gray-300 mb-4">🏔️ صُنع في اليمن، لليمن</span>
          <h1 className="text-3xl md:text-5xl font-black mb-4">نؤمن أن كل تاجر يمني<br />يستحق <span className="grad-text-animated">متجراً رقمياً</span></h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            يمن زون منصة تجارة إلكترونية وُلدت لتزيل حواجز التقنية عن التاجر اليمني —
            بلا برمجة، بلا تعقيد، وبعمولة عادلة.
          </p>
        </div>
      </section>

      {/* 📊 أرقام حقيقية */}
      {stats && (
        <section className="max-w-3xl mx-auto px-4 -mt-8 relative z-10">
          <Reveal>
            <div className="glass rounded-3xl p-6 shadow-xl grid grid-cols-3 gap-4">
              <CountUpStat to={stats.stores} icon="🏪" label="متجر نشط" />
              <CountUpStat to={stats.products} icon="📦" label="منتج معروض" />
              <CountUpStat to={stats.orders} icon="🎉" label="طلب ناجح" />
            </div>
          </Reveal>
        </section>
      )}

      {/* قيمنا */}
      <section className="max-w-4xl mx-auto px-4 py-14">
        <Reveal>
          <h2 className="text-2xl md:text-3xl font-black text-center mb-8">قيمنا التي لا نساوم عليها</h2>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: '🤝', t: 'الثقة أولاً', d: 'توثيق المتاجر، تقييمات موثّقة بمشتريات فعلية، وحماية للطرفين في كل عملية.' },
            { icon: '⚡', t: 'البساطة قوة', d: 'متجرك جاهز في دقيقتين من جوالك — لا حاسوب ولا خبرة تقنية مطلوبة.' },
            { icon: '📍', t: 'محلي حقيقي', d: 'محافظات اليمن، عملتها، بوابات دفعها، وواتساب — أدوات الزبون اليمني اليومية.' },
            { icon: '📈', t: 'نموّك نجاحنا', d: 'لا نربح إلا حين تربح — أدوات ذكية وتحليلات نضعها بين يدي كل تاجر.' },
          ].map((v, i) => (
            <Reveal key={v.t} delay={i * 70}>
              <div className="glass rounded-3xl p-5 card-hover h-full">
                <div className="text-3xl mb-2">{v.icon}</div>
                <h3 className="font-black mb-1.5">{v.t}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* كيف نعمل */}
      <section className="max-w-4xl mx-auto px-4 pb-14">
        <Reveal>
          <div className="bg-night rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 anim-blob opacity-20" style={{ background: 'var(--secondary)' }} />
            <h2 className="text-2xl font-black mb-6 relative">ماذا تقدم يمن زون؟</h2>
            <div className="grid md:grid-cols-2 gap-4 relative">
              {[
                { icon: '🛍️', t: 'للزبائن', d: 'تسوّق من متاجر يمنية موثوقة، تتبّع طلبك لحظة بلحظة، وادفع بالطريقة التي تناسبك.' },
                { icon: '🏪', t: 'للتجار', d: 'متجر كامل برابط خاص، إدارة طلبات ومخزون ومحفظة، وتقارير ذكية — كلها من جوالك.' },
              ].map((x) => (
                <div key={x.t} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                  <div className="text-2xl mb-2">{x.icon}</div>
                  <h3 className="font-black mb-1.5">{x.t}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 text-center">
        <Reveal>
          <div className="glass rounded-3xl p-8">
            <h2 className="text-xl font-black mb-2">جاهز تنضم للقصة؟</h2>
            <p className="text-gray-500 text-sm mb-5">تاجراً كنت أو متسوقاً — مكانك هنا</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/auth/seller-register" className="btn-primary btn-shine text-white font-extrabold px-7 py-3 rounded-full">🏪 أنشئ متجرك</Link>
              <Link href="/stores" className="glass-strong font-bold px-7 py-3 rounded-full text-gray-700">🛍️ تسوّق الآن</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
