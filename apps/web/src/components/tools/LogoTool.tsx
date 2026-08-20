'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// 🎨 مصمم الشعارات والأغلفة — محلي فوري بقواعد تصميم + ذكاء اصطناعي (تفعّله الإدارة)
const INDUSTRIES = [
  { id: 'store', ar: 'متجر عام 🛍️', en: 'retail store', colors: ['#7C3AED', '#EC4899'] },
  { id: 'restaurant', ar: 'مطعم 🍽️', en: 'restaurant food', colors: ['#DC2626', '#F59E0B'] },
  { id: 'cafe', ar: 'مقهى ☕', en: 'coffee shop cafe', colors: ['#78350F', '#D97706'] },
  { id: 'perfume', ar: 'عطور 🌸', en: 'luxury perfume', colors: ['#9D174D', '#F472B6'] },
  { id: 'tech', ar: 'إلكترونيات 📱', en: 'technology electronics', colors: ['#1D4ED8', '#06B6D4'] },
  { id: 'fashion', ar: 'أزياء 👗', en: 'fashion boutique', colors: ['#0F172A', '#E11D48'] },
  { id: 'pharmacy', ar: 'صيدلية 💊', en: 'pharmacy medical', colors: ['#059669', '#34D399'] },
  { id: 'market', ar: 'سوبر ماركت 🛒', en: 'grocery supermarket', colors: ['#16A34A', '#84CC16'] },
];
const STYLES = [
  { id: 'modern', ar: 'عصري ⚡', en: 'modern minimal flat vector' },
  { id: 'luxury', ar: 'فاخر 👑', en: 'luxury elegant premium gold' },
  { id: 'playful', ar: 'مرح 🎈', en: 'playful colorful friendly' },
  { id: 'classic', ar: 'كلاسيكي 🏛️', en: 'classic vintage emblem badge' },
];
// مولّد أرقام عشوائية مزروع (نسخ متعددة حتمية)
const prng = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

export default function LogoTool() {
  const [kind, setKind] = useState<'logo' | 'cover'>('logo');
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [seed, setSeed] = useState(1);
  const [aiOn, setAiOn] = useState(false);
  const [aiImg, setAiImg] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch(`${API}/api/v1/tools`).then((r) => r.json()).then((d) => setAiOn(!!d.aiImages)).catch(() => {});
  }, []);

  // ═══ 🖌️ التوليد المحلي الفوري — كانفس بقواعد تصميم ═══
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || aiImg) return;
    const isLogo = kind === 'logo';
    const W = isLogo ? 1024 : 1584, H = isLogo ? 1024 : 640;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!;
    const rnd = prng(seed * 7919 + (isLogo ? 1 : 2));
    const [c1, c2] = industry.colors;

    // خلفية متدرجة بزاوية عشوائية
    const ang = rnd() * Math.PI;
    const g = ctx.createLinearGradient(W / 2 - Math.cos(ang) * W / 2, H / 2 - Math.sin(ang) * H / 2, W / 2 + Math.cos(ang) * W / 2, H / 2 + Math.sin(ang) * H / 2);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // أشكال زخرفية عضوية
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#ffffff';
    const shapes = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < shapes; i++) {
      const r = (0.06 + rnd() * 0.22) * W;
      const x = rnd() * W, y = rnd() * H;
      ctx.beginPath();
      if (rnd() > 0.5) ctx.arc(x, y, r, 0, Math.PI * 2);
      else { ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI); ctx.roundRect(-r / 2, -r / 2, r, r, r * 0.25); ctx.restore(); }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const initial = (name.trim()[0] || 'ي').toUpperCase();
    const displayName = name.trim() || 'اسم نشاطك';

    if (isLogo) {
      // 🪙 شعار: إطار دائري + حرف + اسم
      const cx = W / 2, cy = H * 0.42, R = W * 0.26;
      if (style.id === 'luxury' || style.id === 'classic') {
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(cx, cy, R + 26, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, R + 40, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.96)';
      ctx.beginPath();
      if (style.id === 'playful') { ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.08); ctx.roundRect(-R, -R, R * 2, R * 2, 70); ctx.restore(); }
      else ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      // الحرف الأول بلون النشاط
      ctx.fillStyle = c1;
      ctx.font = `900 ${R * 1.15}px Cairo, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initial, cx, cy + R * 0.06);
      // الاسم أسفل
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${W * 0.062}px Cairo, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
      ctx.fillText(displayName, cx, H * 0.82);
      ctx.shadowColor = 'transparent';
    } else {
      // 🖼️ غلاف: شريط زجاجي + اسم + وصف
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.roundRect(W * 0.06, H * 0.22, W * 0.88, H * 0.56, 40);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.stroke();
      // أيقونة دائرية بالحرف
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath(); ctx.arc(W / 2, H * 0.36, 56, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c1;
      ctx.font = '900 62px Cairo, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initial, W / 2, H * 0.365);
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.min(96, 1200 / Math.max(displayName.length, 4))}px Cairo, sans-serif`;
      ctx.fillText(displayName, W / 2, H * 0.56);
      if (tagline.trim()) {
        ctx.font = '700 38px Cairo, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillText(tagline.trim(), W / 2, H * 0.68);
      }
    }
  }, [kind, name, tagline, industry, style, seed, aiImg]);

  const downloadLocal = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = kind === 'logo' ? 'شعار-يمن-زون.png' : 'غلاف-يمن-زون.png';
    a.click();
    toast('✅ تم تنزيل التصميم PNG');
  };

  // ═══ 🤖 التوليد بالذكاء الاصطناعي ═══
  const generateAi = async () => {
    setAiBusy(true); setAiImg('');
    try {
      const prompt = kind === 'logo'
        ? `${style.en} logo mark for a ${industry.en} brand, colors ${industry.colors[0]} and ${industry.colors[1]}, centered icon, clean background, no text, professional branding, high detail`
        : `${style.en} wide cover banner for a ${industry.en} business, colors ${industry.colors[0]} and ${industry.colors[1]}, elegant composition, no text, professional`;
      const r = await api('/v1/tools/ai-image', { method: 'POST', body: JSON.stringify({ prompt, kind }) });
      setAiImg(r.image);
      toast('✨ ولّد الذكاء الاصطناعي تصميمك!');
    } catch (e: any) { toast(e.message || 'تعذّر التوليد', 'error'); }
    setAiBusy(false);
  };

  const downloadAi = () => {
    const a = document.createElement('a');
    a.href = aiImg;
    a.download = kind === 'logo' ? 'شعار-AI.jpg' : 'غلاف-AI.jpg';
    a.click();
    toast('✅ تم التنزيل');
  };

  const inp = 'w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-fuchsia-400 placeholder:text-white/30';

  return (
    <div className="space-y-4">
      {/* نوع التصميم */}
      <div className="grid grid-cols-2 gap-2">
        {([['logo', '🪙 شعار مربع 1024²'], ['cover', '🖼️ غلاف عريض 1584×640']] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setKind(k); setAiImg(''); }}
            className={`py-3 rounded-2xl text-sm font-extrabold transition-all ${kind === k ? 'bg-gradient-to-l from-fuchsia-600 to-pink-600 shadow-lg shadow-fuchsia-500/30' : 'bg-white/10 text-white/70'}`}>{l}</button>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="🏪 اسم نشاطك (يُرسم في التصميم المحلي)" className={inp} />
        {kind === 'cover' && <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="✨ سطر وصفي للغلاف (اختياري)" className={inp} />}
        <div>
          <span className="text-xs font-bold text-white/60 block mb-1.5">مجال النشاط (يحدد الألوان تلقائياً 🎨)</span>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((i) => (
              <button key={i.id} onClick={() => setIndustry(i)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${industry.id === i.id ? 'text-white shadow-lg' : 'bg-white/10 text-white/70'}`}
                style={industry.id === i.id ? { background: `linear-gradient(135deg, ${i.colors[0]}, ${i.colors[1]})` } : {}}>{i.ar}</button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs font-bold text-white/60 block mb-1.5">النمط</span>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button key={s.id} onClick={() => setStyle(s)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold ${style.id === s.id ? 'bg-gradient-to-l from-fuchsia-600 to-pink-600 shadow-lg' : 'bg-white/10 text-white/70'}`}>{s.ar}</button>
            ))}
          </div>
        </div>
      </div>

      {/* المعاينة */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-center">
        <div className={`mx-auto rounded-2xl overflow-hidden shadow-2xl ${kind === 'logo' ? 'max-w-xs' : 'w-full'}`}>
          {aiImg ? <img src={aiImg} className="w-full" alt="تصميم AI" /> : <canvas ref={canvasRef} className="w-full h-auto" />}
        </div>
        {aiBusy && <p className="text-sm font-bold text-fuchsia-300 animate-pulse mt-3">🤖 الذكاء يرسم تصميمك... (قد يستغرق 20-40 ثانية)</p>}
      </div>

      {/* الأزرار */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { setAiImg(''); setSeed(seed + 1); toast('🎲 نسخة جديدة من التصميم المحلي'); }}
          className="py-3 rounded-2xl bg-white/10 font-bold text-sm hover:bg-white/20">🎲 نسخة أخرى</button>
        {aiImg
          ? <button onClick={downloadAi} className="py-3 rounded-2xl bg-gradient-to-l from-fuchsia-600 to-pink-600 font-extrabold text-sm shadow-lg shadow-fuchsia-500/30">⬇️ تنزيل تصميم AI</button>
          : <button onClick={downloadLocal} className="py-3 rounded-2xl bg-gradient-to-l from-fuchsia-600 to-pink-600 font-extrabold text-sm shadow-lg shadow-fuchsia-500/30">⬇️ تنزيل PNG</button>}
      </div>

      {aiOn && !aiImg && (
        <button onClick={generateAi} disabled={aiBusy}
          className="w-full py-4 rounded-2xl border-2 border-fuchsia-400/50 bg-fuchsia-400/10 font-extrabold text-sm hover:bg-fuchsia-400/20 transition-all disabled:opacity-50">
          {aiBusy ? '⏳ جارٍ التوليد...' : '🤖 أو ولّد بالذكاء الاصطناعي الحقيقي'}
        </button>
      )}
      {aiImg && (
        <button onClick={generateAi} disabled={aiBusy} className="w-full py-3 rounded-2xl bg-white/10 font-bold text-sm hover:bg-white/20">🔄 توليد AI آخر</button>
      )}

      <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-4 text-xs text-white/70 leading-relaxed">
        💡 <b>وضعان:</b> «التصميم المحلي» فوري ويعمل بدون إنترنت بقواعد تصميم ذكية (ألوان حسب مجالك + أشكال متزنة). {aiOn ? 'و«الذكاء الاصطناعي» مفعّل من إدارة المنصة — يولّد تصاميم فريدة تماماً.' : 'ولتفعيل «التوليد بالذكاء الاصطناعي» اطلب من إدارة المنصة تشغيله من لوحة الخدمات.'} التصميم المحلي يشمل اسمك — استخدمه شعاراً لمتجرك في يمن زون مباشرة 🚀
      </div>
    </div>
  );
}
