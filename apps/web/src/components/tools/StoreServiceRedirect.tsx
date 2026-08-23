'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 💎 خدمتا المتجر المدفوعتان تعملان داخل لوحة تحكم البائع — هذه البطاقة تحوّل إليها
// (الحارس ToolGate يضمن أن الزائر بائع وأنه اشترى الخدمة قبل وصوله هنا)
const DEST: Record<string, { href: string; icon: string; label: string }> = {
  'smart-add': { href: '/seller/smart-add', icon: '🤖', label: 'الإضافة الذكية للمنتجات' },
  'store-app': { href: '/seller/pwa', icon: '📲', label: 'تطبيق المتجر الذكي' },
};

export default function StoreServiceRedirect({ slug }: { slug: string }) {
  const router = useRouter();
  const d = DEST[slug] || DEST['smart-add'];

  useEffect(() => {
    const t = setTimeout(() => router.replace(d.href), 900);
    return () => clearTimeout(t);
  }, [d.href, router]);

  return (
    <div className="grid place-items-center py-20 text-center">
      <div>
        <div className="text-5xl mb-3 anim-bounce-in">{d.icon}</div>
        <p className="font-black text-sm">✅ الخدمة مفتوحة لك — ننقلك إلى «{d.label}» في لوحتك…</p>
        <button onClick={() => router.replace(d.href)}
          className="btn-primary mt-4 px-8 py-2.5 rounded-full text-white text-sm font-extrabold">
          فتحها الآن ←
        </button>
      </div>
    </div>
  );
}
