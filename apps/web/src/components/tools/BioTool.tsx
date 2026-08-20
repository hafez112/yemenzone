'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';
import { fileToDataUrl } from './pdfHelper';

interface Link { title: string; url: string }
const SAVED_KEY = 'yz-my-bio';

// 🔗 صفحة روابطي — صفحة شخصية مجانية مستضافة على يمن زون
export default function BioTool() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [color, setColor] = useState('#7C3AED');
  const [customSlug, setCustomSlug] = useState('');
  const [links, setLinks] = useState<Link[]>([{ title: '', url: '' }]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ slug: string; editKey: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || 'null'); } catch { return null; }
  });

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-violet-400 placeholder:text-white/30';

  const create = async () => {
    const valid = links.filter((l) => l.title.trim() && l.url.trim());
    if (!name.trim() || !valid.length) { toast('✍️ أدخل اسمك ورابطاً واحداً على الأقل', 'error'); return; }
    setBusy(true);
    try {
      const norm = valid.map((l) => ({ title: l.title.trim().slice(0, 40), url: /^https?:\/\//i.test(l.url) ? l.url : 'https://' + l.url }));
      const data = { bio: bio.trim().slice(0, 160), avatar, color, links: norm };
      let res;
      if (created) {
        await api(`/v1/tools/bio/${created.slug}`, { method: 'PATCH', body: JSON.stringify({ editKey: created.editKey, name: name.trim(), data }) });
        res = created;
        toast('✅ حُدّثت صفحتك');
      } else {
        res = await api('/v1/tools/bio', { method: 'POST', body: JSON.stringify({ name: name.trim(), slug: customSlug.trim() || undefined, data }) });
        setCreated(res);
        localStorage.setItem(SAVED_KEY, JSON.stringify(res));
        toast('🎉 صفحتك جاهزة!');
      }
    } catch (e: any) { toast(e.message || 'تعذّر الحفظ', 'error'); }
    setBusy(false);
  };

  const pageUrl = created ? `${location.origin}/bio/${created.slug}` : '';

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex gap-3 items-center">
            <label className="w-16 h-16 rounded-full bg-white/10 border border-dashed border-white/25 grid place-items-center cursor-pointer overflow-hidden shrink-0 hover:border-violet-400 transition-colors">
              {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : <span className="text-2xl">👤</span>}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setAvatar(await fileToDataUrl(f)); toast('✅ أُضيفت الصورة'); } }} />
            </label>
            <div className="flex-1 space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك أو اسم نشاطك *" className={inp} />
              <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="نبذة قصيرة (مثال: تاجر عطور أصلية 🌸)" className={inp} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white/60">لون صفحتك</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" />
            <div className="flex gap-1">{['#7C3AED', '#059669', '#DC2626', '#2563EB', '#D97706', '#0F172A'].map((c) => (
              <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full border-2 border-white/20" style={{ background: c }} />))}</div>
          </div>
          {!created && (
            <label className="block text-xs font-bold text-white/60">رابط مخصص (اختياري)
              <div className="flex items-center gap-1 mt-1" dir="ltr">
                <span className="text-xs text-white/40 shrink-0">yemenzone1.com/bio/</span>
                <input value={customSlug} onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())} placeholder="myname" className={`${inp} flex-1`} />
              </div>
            </label>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-2">
          <h3 className="font-extrabold text-sm">🔗 روابطك</h3>
          {links.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input value={l.title} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="العنوان (متجري 🛍️)" className={inp} />
              <input value={l.url} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="الرابط" className={inp} dir="ltr" />
              {links.length > 1 ? <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="w-9 rounded-xl bg-red-500/15 text-red-300">✕</button> : <span className="w-9" />}
            </div>
          ))}
          <button onClick={() => { setLinks([...links, { title: '', url: '' }]); toast('➕ أُضيف رابط'); }}
            className="w-full py-2.5 rounded-xl bg-violet-500/20 border border-violet-400/40 text-sm font-bold hover:bg-violet-500/30">➕ رابط آخر</button>
          <button onClick={create} disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-violet-600 to-fuchsia-600 font-extrabold text-sm shadow-lg shadow-purple-500/30 disabled:opacity-40 hover:brightness-110">
            {busy ? '⏳...' : created ? '💾 حفظ التعديلات' : '🚀 أنشئ صفحتي مجاناً'}
          </button>
        </div>

        {created && (
          <div className="rounded-3xl border border-green-400/30 bg-green-400/5 p-5 text-center space-y-3">
            <p className="font-extrabold text-green-300">🎉 صفحتك حيّة الآن!</p>
            <p className="text-xs bg-black/30 rounded-xl p-3 break-all text-green-300 font-mono" dir="ltr">{pageUrl}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { navigator.clipboard.writeText(pageUrl); toast('📋 نُسخ الرابط'); }} className="py-2.5 rounded-xl bg-green-600 font-bold text-sm">📋 نسخ الرابط</button>
              <a href={pageUrl} target="_blank" rel="noreferrer" className="py-2.5 rounded-xl bg-white/10 font-bold text-sm hover:bg-white/20 grid place-items-center">👁️ فتح الصفحة</a>
            </div>
            <p className="text-[11px] text-white/50">💾 مفتاح التعديل محفوظ في هذا الجهاز — عُد هنا متى شئت لتحديث صفحتك</p>
          </div>
        )}
      </div>

      {/* معاينة */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold text-white/50 mb-3 text-center">👁️ معاينة حية لصفحتك</p>
        <div className="rounded-3xl p-6 text-center min-h-96" style={{ background: `linear-gradient(180deg, ${color}33, #0f172a)` }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-3 border-4 grid place-items-center text-3xl overflow-hidden" style={{ borderColor: color, background: '#1e293b' }}>
            {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : '👤'}
          </div>
          <p className="font-black text-lg">{name || 'اسمك هنا'}</p>
          <p className="text-xs text-white/60 mb-5">{bio || 'نبذتك القصيرة'}</p>
          <div className="space-y-2">
            {links.filter((l) => l.title).map((l, i) => (
              <div key={i} className="py-3 rounded-xl font-bold text-sm text-white shadow-lg" style={{ background: `${color}cc` }}>{l.title}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
