import * as crypto from 'crypto';

// 🔐 TOTP محلي بالكامل (RFC 6238) — بدون أي مكتبات أو خوادم خارجية
// متوافق مع Google Authenticator / Authy / Microsoft Authenticator

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

// توليد سر عشوائي 160-bit بصيغة base32
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const code = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(code % 10 ** digits).padStart(digits, '0');
}

// تحقق بنافذة ±1 خطوة زمنية (30 ثانية) لامتصاص انحراف ساعة الجهاز
export function verifyTotp(secret: string, code: string, window = 1): boolean {
  if (!/^\d{6}$/.test(code || '')) return false;
  const counter = Math.floor(Date.now() / 30000);
  for (let w = -window; w <= window; w++) {
    if (hotp(secret, counter + w) === code) return true;
  }
  return false;
}

// رابط otpauth:// للإضافة في تطبيقات المصادقة
export function otpauthUrl(secret: string, account: string, issuer = 'YemenZone Admin'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}
