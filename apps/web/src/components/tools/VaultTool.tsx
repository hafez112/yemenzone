'use client';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { useToolDB } from './shared/db';
import { btnD, btnP, btnS, card, copyText, Empty, Field, inp, Stat, uid } from './shared/ui';

// 🔐 خزنة كلمات المرور — تشفير AES-256 داخل جهازك، لا يفتحها إلا بكلمة السر الرئيسية
// حتى قاعدة البيانات السحابية تخزّن نصاً مشفراً لا يُقرأ بدون كلمتك
interface Entry { id: number; site: string; user: string; pass: string; note: string }
interface Blob { salt: string; iv: string; cipher: string }

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 120_000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encryptEntries(entries: Entry[], password: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, new TextEncoder().encode(JSON.stringify(entries)));
  return { salt: b64(salt), iv: b64(iv), cipher: b64(cipher) };
}

async function decryptEntries(blob: Blob, password: string): Promise<Entry[]> {
  const key = await deriveKey(password, unb64(blob.salt));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) as BufferSource }, key, unb64(blob.cipher));
  return JSON.parse(new TextDecoder().decode(plain));
}

const CHARSETS = { lower: 'abcdefghjkmnpqrstuvwxyz', upper: 'ABCDEFGHJKMNPQRSTUVWXYZ', digits: '23456789', symbols: '!@#$%&*?' };

export default function VaultTool() {
  const { data: blob, setData: setBlob, ready } = useToolDB<Blob | null>('vault', null, 'yz-vault-v1');
  const [master, setMaster] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [site, setSite] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showId, setShowId] = useState<number | null>(null);
  const [genLen, setGenLen] = useState(14);
  const [q, setQ] = useState('');

  // 🔓 فتح الخزنة (أو إنشاؤها أول مرة)
  const unlock = async () => {
    if (master.length < 4) { toast('🔑 كلمة السر الرئيسية 4 أحرف على الأقل', 'error'); return; }
    setBusy(true);
    try {
      if (blob) {
        const list = await decryptEntries(blob, master);
        setEntries(list);
      } else {
        setEntries([]);
        setBlob(await encryptEntries([], master));
        toast('🔐 أُنشئت خزنتك — لا تنسَ كلمة السر الرئيسية أبداً!');
      }
      setUnlocked(true);
    } catch {
      toast('⛔ كلمة السر الرئيسية غير صحيحة', 'error');
    }
    setBusy(false);
  };

  // 💾 حفظ التعديلات — إعادة تشفير كاملة
  const persist = async (next: Entry[]) => {
    setEntries(next);
    try { setBlob(await encryptEntries(next, master)); } catch {}
  };

  const genPass = () => {
    const all = CHARSETS.lower + CHARSETS.upper + CHARSETS.digits + CHARSETS.symbols;
    const arr = crypto.getRandomValues(new Uint32Array(genLen));
    let s = '';
    for (let i = 0; i < genLen; i++) s += all[arr[i] % all.length];
    setPass(s);
    toast('🎲 وُلّدت كلمة سر قوية');
  };

  const add = () => {
    if (!site.trim() || !pass) { toast('✍️ أدخل الموقع وكلمة السر', 'error'); return; }
    persist([{ id: uid(), site: site.trim(), user: user.trim(), pass, note: '' }, ...entries]);
    setSite(''); setUser(''); setPass('');
    toast('🔐 حُفظت كلمة السر مشفّرة');
  };

  const lock = () => { setUnlocked(false); setMaster(''); setEntries([]); toast('🔒 قُفلت الخزنة'); };

  if (!ready) return null;

  // 🚪 شاشة القفل
  if (!unlocked) {
    return (
      <div className={card + ' space-y-4 text-center !p-8'}>
        <div className="w-20 h-20 mx-auto rounded-[1.6rem] grid place-items-center text-4xl shadow-2xl" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>🔐</div>
        <div>
          <p className="font-black text-lg">{blob ? 'خزنتك مقفلة' : 'أنشئ خزنتك الآن'}</p>
          <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
            {blob ? 'أدخل كلمة السر الرئيسية لفك التشفير — لا يستطيع أحد غيرك قراءة محتواها' : 'اختر كلمة سر رئيسية قوية — ستُشفَّر كل كلماتك بـ AES-256 داخل جهازك'}
          </p>
        </div>
        <input type="password" value={master} onChange={(e) => setMaster(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()}
          placeholder="🔑 كلمة السر الرئيسية" className={inp + ' text-center'} dir="ltr" />
        <button onClick={unlock} disabled={busy} className={btnP + ' w-full !py-3.5'}>{busy ? '⏳ جاري فك التشفير...' : blob ? '🔓 فتح الخزنة' : '🔐 إنشاء الخزنة'}</button>
        <p className="text-[10px] text-red-300/70">⚠️ نسيان كلمة السر الرئيسية = فقدان المحتوى نهائياً — لا يمكن استعادتها بحكم التشفير</p>
      </div>
    );
  }

  const filtered = q ? entries.filter((e) => e.site.includes(q) || e.user.includes(q)) : entries;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="🔐" label="كلمات محفوظة" value={entries.length} />
        <Stat icon="🛡️" label="التشفير" value="AES-256" tone="text-lime-300" />
        <button onClick={lock} className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-center active:scale-95 transition">
          <div className="text-lg mb-0.5">🔒</div>
          <div className="text-[10px] text-red-300 font-bold">قفل الخزنة</div>
        </button>
      </div>

      <div className={card + ' space-y-3'}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="🌐 الموقع/التطبيق"><input value={site} onChange={(e) => setSite(e.target.value)} placeholder="فيسبوك" className={inp} /></Field>
          <Field label="👤 اسم المستخدم"><input value={user} onChange={(e) => setUser(e.target.value)} placeholder="email أو رقم" className={inp} dir="ltr" /></Field>
        </div>
        <Field label="🔑 كلمة السر">
          <div className="flex gap-1.5">
            <input value={pass} onChange={(e) => setPass(e.target.value)} className={inp} dir="ltr" />
            <button type="button" onClick={genPass} className={btnS + ' shrink-0'}>🎲 توليد</button>
          </div>
        </Field>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/45 font-bold">طول التوليد: {genLen}</span>
          <input type="range" min={8} max={24} value={genLen} onChange={(e) => setGenLen(Number(e.target.value))} className="flex-1 accent-lime-500" />
        </div>
        <button onClick={add} className={btnP + ' w-full'}>🔐 حفظ مشفّراً</button>
      </div>

      {entries.length > 3 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث في خزنتك..." className={inp} />}

      {entries.length === 0 && <Empty icon="🔐" text="خزنتك فارغة — احفظ أول كلمة سر مشفّرة" />}

      <div className="space-y-2">
        {filtered.map((e) => (
          <div key={e.id} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-extrabold text-sm truncate">🌐 {e.site}</p>
              <div className="flex gap-1.5 shrink-0">
                {e.user && <button onClick={() => copyText(e.user).then(() => toast('📋 نُسخ اسم المستخدم'))} className={btnS + ' !px-2 !py-1 !text-[10px]'}>👤 نسخ</button>}
                <button onClick={() => copyText(e.pass).then(() => toast('📋 نُسخت كلمة السر'))} className={btnS + ' !px-2 !py-1 !text-[10px] !bg-lime-600/25 !text-lime-200'}>🔑 نسخ</button>
                <button onClick={() => setShowId(showId === e.id ? null : e.id)} className={btnS + ' !px-2 !py-1 !text-[10px]'}>{showId === e.id ? '🙈' : '👁️'}</button>
                <button onClick={() => { persist(entries.filter((x) => x.id !== e.id)); toast('🗑️ حُذفت'); }} className={btnD}>✕</button>
              </div>
            </div>
            {showId === e.id && (
              <div className="mt-2 pt-2 border-t border-white/5 text-xs space-y-1" dir="ltr">
                <p className="text-white/60">👤 {e.user || '—'}</p>
                <p className="font-black text-lime-300 tracking-wider break-all">🔑 {e.pass}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
