import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SERVER_API as API } from '@/lib/server-api';

interface BioData { bio?: string; avatar?: string; color?: string; links?: { title: string; url: string }[] }

async function getBio(slug: string): Promise<{ name: string; data: BioData; views: number } | null> {
  try {
    const r = await fetch(`${API}/api/v1/tools/bio/${slug}`, { next: { revalidate: 30 } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const bio = await getBio(slug);
  if (!bio) return {};
  return { title: `${bio.name} | روابطي — يمن زون`, description: bio.data?.bio || `كل روابط ${bio.name} في مكان واحد` };
}

// 🔗 صفحة «روابطي» العامة — خفيفة وسريعة ومفهرسة
export default async function BioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bio = await getBio(slug);
  if (!bio) notFound();
  const color = bio.data?.color || '#7C3AED';
  const links = Array.isArray(bio.data?.links) ? bio.data.links : [];

  return (
    <div className="min-h-screen text-white" dir="rtl" style={{ background: `linear-gradient(180deg, ${color}40, #0a0a14 55%)` }}>
      <main className="max-w-md mx-auto px-4 py-14 text-center">
        <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 grid place-items-center text-4xl overflow-hidden shadow-2xl"
          style={{ borderColor: color, background: '#1e293b' }}>
          {bio.data?.avatar ? <img src={bio.data.avatar} className="w-full h-full object-cover" alt={bio.name} /> : '👤'}
        </div>
        <h1 className="text-2xl font-black mb-1">{bio.name}</h1>
        {bio.data?.bio && <p className="text-sm text-white/70 mb-6 leading-relaxed">{bio.data.bio}</p>}
        <div className="space-y-3 mt-6">
          {links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
              className="block py-4 rounded-2xl font-bold shadow-xl transition-transform hover:scale-[1.02] hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
              {l.title}
            </a>
          ))}
        </div>
        <a href="/tools/bio" className="inline-block mt-10 text-xs text-white/50 hover:text-white border border-white/15 rounded-full px-4 py-2 transition-colors">
          ⚡ أنشئ صفحتك مجاناً — منصة يمن زون
        </a>
      </main>
    </div>
  );
}
