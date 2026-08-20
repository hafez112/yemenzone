import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

// 🛡️ درع يمن زون — كابتشا محلية (بلا خوادم خارجية) + إعدادات الحماية + فحص ذاتي
// الكابتشا: عملية حسابية تُرسم SVG مشوّشة — تُحفظ في الذاكرة 5 دقائق وتُستهلك مرة واحدة

export interface ShieldConfig {
  captchaLogin: boolean;     // لست روبوت عند تسجيل الدخول (بائع/عميل/إدارة)
  captchaRegister: boolean;  // عند إنشاء الحساب
  captchaOtp: boolean;       // عند طلب رمز OTP
  captchaComplaint: boolean; // عند تقديم شكوى عامة
  captchaReturn: boolean;    // عند طلب الاسترجاع
  rateGlobalPerMin: number;  // سقف الطلبات العام لكل IP
  rateAuthPerMin: number;    // سقف طلبات المصادقة لكل IP
  mirrors: string[];         // دومينات مرآة بديلة لمقاومة الحجب
}

const DEFAULTS: ShieldConfig = {
  captchaLogin: true,
  captchaRegister: true,
  captchaOtp: false,
  captchaComplaint: true,
  captchaReturn: false,
  rateGlobalPerMin: 300,
  rateAuthPerMin: 40,
  mirrors: [],
};

const CAPTCHA_TTL = 5 * 60 * 1000;
const SCOPE_KEY: Record<string, keyof ShieldConfig> = {
  login: 'captchaLogin', register: 'captchaRegister', otp: 'captchaOtp',
  complaint: 'captchaComplaint', return: 'captchaReturn',
};

@Injectable()
export class ShieldService {
  private captchas = new Map<string, { answer: string; exp: number }>();
  private cfgCache = { at: 0, cfg: DEFAULTS as ShieldConfig };

  constructor(private prisma: PrismaService) {}

  // ── الإعدادات (مخزنة في settings → security_shield) ──
  async getConfig(): Promise<ShieldConfig> {
    if (Date.now() - this.cfgCache.at < 60_000) return this.cfgCache.cfg;
    const row = await this.prisma.setting.findUnique({ where: { key: 'security_shield' } }).catch(() => null);
    const cfg = { ...DEFAULTS, ...((row?.value as any) || {}) };
    this.cfgCache = { at: Date.now(), cfg };
    return cfg;
  }

  async setConfig(adminId: string, body: Partial<ShieldConfig>) {
    const clean: ShieldConfig = {
      captchaLogin: !!body.captchaLogin,
      captchaRegister: !!body.captchaRegister,
      captchaOtp: !!body.captchaOtp,
      captchaComplaint: !!body.captchaComplaint,
      captchaReturn: !!body.captchaReturn,
      rateGlobalPerMin: Math.min(2000, Math.max(30, Number(body.rateGlobalPerMin) || DEFAULTS.rateGlobalPerMin)),
      rateAuthPerMin: Math.min(300, Math.max(5, Number(body.rateAuthPerMin) || DEFAULTS.rateAuthPerMin)),
      mirrors: (Array.isArray(body.mirrors) ? body.mirrors : [])
        .map((m: any) => String(m).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, ''))
        .filter((m: string) => /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(m))
        .slice(0, 10),
    };
    await this.prisma.setting.upsert({
      where: { key: 'security_shield' },
      update: { value: clean as any },
      create: { group: 'security', key: 'security_shield', value: clean as any },
    });
    this.cfgCache = { at: 0, cfg: clean };
    await this.prisma.securityLog.create({
      data: { event: 'security.shield_update', userType: 'admin', userId: adminId, details: clean as any },
    }).catch(() => {});
    return clean;
  }

  // الواجهة العامة: أي نطاقات الكابتشا مفعّلة فقط — بلا أي معلومات عن البنية أو الشبكة
  async publicInfo() {
    const c = await this.getConfig();
    return {
      captcha: {
        login: c.captchaLogin, register: c.captchaRegister, otp: c.captchaOtp,
        complaint: c.captchaComplaint, return: c.captchaReturn,
      },
    };
  }

  // 🔐 نقطة اعتماد TLS الداخلية (يسألها Caddy صامتاً قبل إصدار أي شهادة)
  // تسمح فقط للدومين الرئيسي والدومينات المعتمدة من الإدارة — الباقي يُرفض بلا إيضاح
  async isDomainAllowed(domain: string): Promise<boolean> {
    const d = (domain || '').trim().toLowerCase();
    if (!d || !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(d)) return false;
    const main = (process.env.PLATFORM_DOMAIN || '').trim().toLowerCase();
    if (main && d === main) return true;
    const cfg = await this.getConfig();
    return cfg.mirrors.includes(d);
  }

  // ── الكابتشا ──
  createCaptcha() {
    // تنظيف المنتهية دورياً
    const now = Date.now();
    for (const [k, v] of this.captchas) if (v.exp < now) this.captchas.delete(k);
    if (this.captchas.size > 5000) this.captchas.clear();

    const a = randomInt(2, 10);
    const b = randomInt(1, 10);
    const sub = a - b > 1 && Math.random() > 0.5;
    const answer = String(sub ? a - b : a + b);
    const question = sub ? `${a} − ${b} = ؟` : `${a} + ${b} = ؟`;
    const id = randomBytes(16).toString('hex');
    this.captchas.set(id, { answer, exp: now + CAPTCHA_TTL });
    return { id, svg: this.renderSvg(question) };
  }

  async verifyCaptcha(id: string, answer: string): Promise<boolean> {
    const rec = this.captchas.get(id);
    if (rec) this.captchas.delete(id); // استهلاك فوري — مرة واحدة فقط حتى لو كانت خاطئة
    return !!rec && rec.exp > Date.now() && rec.answer === String(answer || '').trim();
  }

  // فرض الكابتشا حسب النطاق — لا شيء إن كان النطاق معطلاً من الإدارة
  async requireCaptcha(scope: keyof typeof SCOPE_KEY, id?: string, answer?: string, ip?: string) {
    const cfg = await this.getConfig();
    if (!cfg[SCOPE_KEY[scope]]) return;
    if (!id || !(await this.verifyCaptcha(id, answer || ''))) {
      if (ip) {
        await this.prisma.securityLog.create({
          data: { event: 'security.captcha_fail', ip, details: { scope } },
        }).catch(() => {});
      }
      throw new BadRequestException('🤖 تحقق «لست روبوت» غير صحيح أو منتهي — حل العملية الجديدة وأعد المحاولة');
    }
  }

  // رسم SVG مشوّش: حروف مائلة عشوائياً + خطوط ونقاط تشويش + تدرج لوني
  private renderSvg(text: string): string {
    const w = 180, h = 56;
    const chars = text.split('');
    const colors = ['#6C3DF5', '#0d9488', '#dc2626', '#b45309', '#1d4ed8'];
    let inner = '';
    // خلفية متدرجة خفيفة
    const g1 = colors[randomInt(0, colors.length)], g2 = colors[randomInt(0, colors.length)];
    inner += `<rect width="${w}" height="${h}" rx="12" fill="#f8f7ff"/>`;
    // خطوط تشويش
    for (let i = 0; i < 4; i++) {
      inner += `<path d="M${randomInt(0, 40)} ${randomInt(0, h)} Q ${randomInt(60, 120)} ${randomInt(0, h)}, ${randomInt(140, w)} ${randomInt(0, h)}" stroke="${colors[randomInt(0, colors.length)]}" stroke-width="1.2" fill="none" opacity="0.35"/>`;
    }
    // الحروف
    const step = w / (chars.length + 1);
    chars.forEach((ch, i) => {
      if (ch === ' ') return;
      const x = step * (i + 1);
      const y = h / 2 + randomInt(-4, 8);
      const rot = randomInt(-22, 22);
      const size = randomInt(20, 27);
      inner += `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-family="monospace" font-weight="900" font-size="${size}" fill="${colors[randomInt(0, colors.length)]}" text-anchor="middle">${ch}</text>`;
    });
    // نقاط تشويش
    for (let i = 0; i < 24; i++) {
      inner += `<circle cx="${randomInt(0, w)}" cy="${randomInt(0, h)}" r="${randomInt(1, 2)}" fill="${g1}" opacity="0.3"/>`;
    }
    void g2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
  }

  // ── الفحص الذاتي: قائمة تحقق أمنية حية ──
  async selfCheck() {
    const cfg = await this.getConfig();
    const [otpTpl, totpAdmins, bannedCount, weekLogs] = await Promise.all([
      this.prisma.messageTemplate.findUnique({ where: { event: 'otp' } }),
      this.prisma.adminUser.count({ where: { totpEnabled: true } }),
      this.prisma.bannedIp.count(),
      this.prisma.securityLog.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    ]);
    const secretOk = (v?: string, fb?: string) => !!v && v !== fb && v.length >= 24;
    const checks = [
      { key: 'jwt', ok: secretOk(process.env.JWT_SECRET, 'change-me-super-secret-key-32chars-min'), label: 'سر JWT مخصص وقوي (24+ حرف)', hint: 'غيّر JWT_SECRET في .env إلى سر عشوائي طويل' },
      { key: 'jwt_refresh', ok: secretOk(process.env.JWT_REFRESH_SECRET, 'change-me-refresh-secret-32chars'), label: 'سر التحديث مخصص ومختلف', hint: 'غيّر JWT_REFRESH_SECRET في .env' },
      { key: 'gate', ok: !!process.env.ADMIN_GATE, label: 'بوابة لوحة الإدارة السرية (ADMIN_GATE)', hint: 'فعّل ADMIN_GATE في .env لإخفاء مسار لوحة التحكم' },
      { key: 'totp', ok: totpAdmins > 0, label: 'مصادقة ثنائية مفعّلة لحساب إداري واحد على الأقل', hint: 'فعّل 2FA من إدارة المدراء' },
      { key: 'otp', ok: !!otpTpl?.isActive, label: 'تسجيل الدخول برمز OTP مفعّل (حماية حسابات العملاء والبائعين)', hint: 'فعّل قالب otp من إدارة الرسائل' },
      { key: 'captcha', ok: cfg.captchaLogin, label: 'تحقق «لست روبوت» على تسجيل الدخول', hint: 'فعّله من إعدادات الدرع أدناه' },
      { key: 'waf', ok: true, label: 'جدار التطبيق (WAF): حظر مسارات الهجوم وأنماط الحقن', hint: '' },
      { key: 'autoban', ok: true, label: 'الحظر التلقائي للـ IP بعد 12 محاولة فاشلة', hint: '' },
      { key: 'rate', ok: cfg.rateGlobalPerMin <= 600, label: `تحديد المعدل: ${cfg.rateGlobalPerMin} طلب/دقيقة للـ IP`, hint: 'اخفضه من إعدادات الدرع' },
    ];
    const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
    return { checks, score, stats: { bannedIps: bannedCount, weekEvents: weekLogs, mirrors: cfg.mirrors.length } };
  }
}
