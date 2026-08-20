import * as crypto from 'crypto';

// 🔐 تشفير AES-256-GCM للبيانات الحساسة في القاعدة (أسرار البوابات والمراسلة)
// القيم المشفرة تُخزَّن بادئة enc:v1: — القيم القديمة غير المشفرة تُقرأ كما هي (توافق خلفي)

const PREFIX = 'enc:v1:';

function key(): Buffer {
  const secret = process.env.APP_SECRET || process.env.JWT_SECRET || 'yz-fallback-dev-key';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain?: string | null): string | null {
  if (!plain) return null;
  if (plain.startsWith(PREFIX)) return plain; // مشفّر مسبقاً
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(value?: string | null): string | null {
  if (!value || !value.startsWith(PREFIX)) return value ?? null; // قديم غير مشفر — يُقرأ كما هو
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null; // مفتاح مختلف أو تلف — لا نكسر التشغيل
  }
}

// قناع عرض للواجهات: لا تُرسل الأسرار أبداً للمتصفح
export function maskSecret(value?: string | null): string | null {
  return value ? '••••••••' : null;
}

export const isEncrypted = (v?: string | null) => !!v?.startsWith(PREFIX);
