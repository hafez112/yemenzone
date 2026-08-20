// ═══════════════════════════════════════════════════════════════
//  🛡️ مكتبة يمن زون للأمن والحماية — قواعد جدار الحماية (WAF)
//  صد مسارات الهجوم الشائعة + كشف أنماط الحقن + رصد البوتات
//  (تعمل صامتة في الخادم — لا تُظهر تفاصيلها للواجهة)
// ═══════════════════════════════════════════════════════════════

// مسارات الاستطلاع الهجومي الشائعة (ماسحات ووردبريس/ملفات حساسة)
export const ATTACK_PATHS =
  /(\.env|\.git|\.htaccess|wp-admin|wp-login|wordpress|phpmyadmin|xmlrpc|\.php$|\/boaform|\/solr|\/actuator|\/debug\/|\/\.well-known\/(?!acme-challenge)|\/etc\/passwd|\.sql$|\.bak$|\.old$|\.log$|\/config\.|\/adminer|\/cgi-bin|\.ds_store)/i;

// أنماط الحقن في الروابط (SQLi + XSS + Path Traversal + حقن أوامر)
export const INJECTION_PATTERNS =
  /(union(\s|%20)+select|concat(\s|%20)*\(|information_schema|<script|%3cscript|\.\.\/|\.\.\\|eval(\s|%20)*\(|base64_decode|exec(\s|%20)*\(|\/etc\/passwd|;\s*(ls|cat|wget|curl)\b|\$\{jndi:)/i;

// User-Agent حقيقية لا تقل عن هذا الطول — البوتات الساذجة ترسل قصيرة أو فارغة
export const MIN_UA_LENGTH = 10;

// فك ترميز الرابط بأمان (روابط مشوهة لا تسقط الجدار)
export function decodeSafe(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

// هل المسار من مسارات الهجوم المعروفة؟
export function isAttackPath(path: string): boolean {
  return ATTACK_PATHS.test(path || '');
}

// هل يحمل الرابط نمط حقن؟ (يفحص بعد فك الترميز)
export function hasInjection(rawUrl: string): boolean {
  return INJECTION_PATTERNS.test(decodeSafe(rawUrl || ''));
}

// هل الطلب آلياً ساذجاً (بلا متصفح حقيقي)؟
export function isBotUA(ua: string): boolean {
  return (ua || '').length < MIN_UA_LENGTH;
}

// استخراج IP الحقيقي من الترويسات (خلف بروكسي) أو الاتصال المباشر
export function clientIp(req: { headers?: any; ip?: string }): string {
  return (String(req.headers?.['x-forwarded-for'] || '').split(',')[0] || req.ip || '').trim();
}
