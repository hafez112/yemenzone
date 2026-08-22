import {
  Injectable, BadRequestException, UnauthorizedException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityService } from '../../common/security.service';
import { MessagingService } from '../messaging/messaging.service';
import { ReferralsService } from '../referrals/referrals.service';
import { ShieldService } from '../shield/shield.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SendOtpDto, VerifyOtpDto, PhoneLoginDto, RegisterDto, AdminLoginDto, ResetPasswordDto } from './dto';
import { verifyTotp } from '../../common/totp';
import { decryptSecret } from '../../common/crypto.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private security: SecurityService,
    private messaging: MessagingService,
    private referrals: ReferralsService,
    private shield: ShieldService,
    private notifications: NotificationsService,
  ) {}

  // ═══ 1) إرسال رمز OTP ═══
  async sendOtp(dto: SendOtpDto, ip: string) {
    await this.shield.requireCaptcha('otp', dto.captchaId, dto.captchaAnswer, ip); // 🤖 لست روبوت (إن فُعّل)
    const key = `otp:${dto.phone}`;
    if (!this.security.checkAttempts(key, 5)) {
      throw new BadRequestException('محاولات كثيرة — انتظر 10 دقائق');
    }
    // 🔑 استعادة كلمة المرور: الرمز يُرسل فقط لحساب موجود ونشط له كلمة مرور
    if (dto.purpose === 'reset') {
      const user = await this.findUser(dto.userType, dto.phone);
      if (!user) throw new BadRequestException('لا يوجد حساب مسجل بهذا الرقم — أنشئ حساباً جديداً');
      if (user.status !== 'active') throw new BadRequestException('الحساب موقوف — تواصل مع الدعم الفني');
      if (!user.passwordHash) throw new BadRequestException('هذا الحساب يدخل برمز التحقق ولا يملك كلمة مرور');
    }

    const otpEnabled = await this.security.isOtpEnabled();

    // إذا قالب OTP معطّل من الإدارة: تخطَّ التحقق تماماً
    if (!otpEnabled) {
      if (dto.purpose === 'reset') {
        return { otpRequired: false, message: 'استعادة كلمة المرور برمز التحقق غير متاحة حالياً — تواصل مع الدعم الفني من لوحتك' };
      }
      return { otpRequired: false, message: 'التحقق برمز OTP معطّل — أكمل التسجيل مباشرة' };
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { phone: dto.phone, code, purpose: dto.purpose, expiresAt },
    });

    // 📨 الإرسال الفعلي عبر مزود الرسائل المفعّل (الجلسة 12)
    const result = await this.messaging.send('otp', dto.phone, { code, name: dto.phone });
    await this.security.log('otp_sent', { ip, details: { phone: dto.phone, sent: result.sent } });

    // devCode يُعاد فقط في وضع المحاكاة (بدون مزود حقيقي)
    return {
      otpRequired: true,
      message: result.sent ? 'تم إرسال رمز التحقق إلى جوالك' : 'تم توليد رمز التحقق (وضع المحاكاة — فعّل مزود SMS للإرسال الحقيقي)',
      ...(result.simulated ? { devCode: code } : {}),
    };
  }

  // ═══ 2) التحقق من OTP ═══
  async verifyOtp(dto: VerifyOtpDto, ip: string) {
    const rec = await this.prisma.otpCode.findFirst({
      where: { phone: dto.phone, code: dto.code, purpose: dto.purpose, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!rec || rec.expiresAt < new Date()) {
      this.security.failAttempt(`otp:${dto.phone}`);
      if (ip) this.security.failAttempt(`ip:${ip}`); // 🛡️ عدّاد IP — يغذّي الحظر التلقائي
      throw new UnauthorizedException('رمز التحقق غير صحيح أو منتهي');
    }
    await this.prisma.otpCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
    this.security.clearAttempts(`otp:${dto.phone}`);

    // 🔑 استعادة كلمة المرور: نجاح التحقق يُصدر رمز استعادة قصير العمر (10 دقائق)
    if (dto.purpose === 'reset') {
      const resetToken = crypto.randomBytes(24).toString('hex');
      await this.prisma.otpCode.create({
        data: { phone: dto.phone, code: resetToken, purpose: 'reset-token', expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      });
      await this.security.log('reset_verified', { ip, userType: dto.userType, details: { phone: dto.phone } });
      return { resetToken, message: 'تم التحقق من جوالك — عيّن كلمة مرور جديدة الآن' };
    }

    // إنشاء الحساب إن كان تسجيلاً جديداً — 📜 الموافقة على السياسات إلزامية
    if (dto.purpose === 'register') {
      if (dto.agreedTerms !== true) {
        throw new BadRequestException('يجب الموافقة على سياسة الخصوصية وشروط الاستخدام لإنشاء الحساب');
      }
      return this.createAccount(dto.userType, dto.phone, dto.name || 'مستخدم جديد', undefined, ip, dto.refCode);
    }
    return this.loginByPhone(dto.userType, dto.phone, ip);
  }

  // ═══ 2ب) إعادة تعيين كلمة المرور برمز الاستعادة ═══
  async resetPassword(dto: ResetPasswordDto, ip: string) {
    const key = `reset:${dto.phone}`;
    if (!this.security.checkAttempts(key, 5)) {
      throw new BadRequestException('محاولات كثيرة — انتظر 10 دقائق');
    }
    // 🔑 نفس سياسة كلمات المرور في التسجيل
    if (!/^(?=.*[A-Za-z\u0600-\u06FF])(?=.*\d).{8,}$/.test(dto.password)) {
      throw new BadRequestException('كلمة المرور ضعيفة — 8 أحرف على الأقل وتجمع أحرفاً وأرقاماً');
    }
    const rec = await this.prisma.otpCode.findFirst({
      where: { phone: dto.phone, code: dto.resetToken, purpose: 'reset-token', usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!rec || rec.expiresAt < new Date()) {
      this.security.failAttempt(key);
      throw new UnauthorizedException('رمز الاستعادة غير صالح أو منتهي — أعد الخطوات من البداية');
    }
    const user = await this.findUser(dto.userType, dto.phone);
    if (!user) throw new UnauthorizedException('الحساب غير موجود');
    if (user.status !== 'active') throw new UnauthorizedException('الحساب موقوف — تواصل مع الدعم الفني');

    const passwordHash = await argon2.hash(dto.password);
    dto.userType === 'seller'
      ? await this.prisma.seller.update({ where: { id: user.id }, data: { passwordHash } })
      : await this.prisma.customer.update({ where: { id: user.id }, data: { passwordHash } });
    await this.prisma.otpCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } });

    // 🔐 إنهاء كل الجلسات السابقة — حماية كاملة بعد تغيير كلمة المرور
    await this.prisma.session.updateMany({
      where: { ...(dto.userType === 'seller' ? { sellerId: user.id } : { customerId: user.id }), revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => {});
    this.security.clearAttempts(key);
    await this.security.log('password_reset', { ip, userType: dto.userType, userId: user.id });
    await this.notifications.push(dto.userType, user.id, {
      icon: '🔑',
      title: 'تم تغيير كلمة مرورك',
      body: `أُعيد تعيين كلمة المرور ${new Date().toLocaleString('ar-YE')} — إن لم تكن أنت، تواصل مع الدعم فوراً`,
      link: dto.userType === 'seller' ? '/seller/support' : '/customer/support',
    }).catch(() => {});
    return { message: 'تم تغيير كلمة المرور بنجاح — سجّل دخولك الآن' };
  }

  // ═══ 3) تسجيل حساب جديد (بدون OTP إن كان معطلاً) ═══
  async register(dto: RegisterDto, ip: string) {
    await this.shield.requireCaptcha('register', dto.captchaId, dto.captchaAnswer, ip); // 🤖
    // 🔑 سياسة كلمات المرور: 8+ أحرف تجمع أحرفاً وأرقاماً — تحمي حسابات البائعين والعملاء من التخمين
    if (!/^(?=.*[A-Za-z\u0600-\u06FF])(?=.*\d).{8,}$/.test(dto.password)) {
      throw new BadRequestException('كلمة المرور ضعيفة — 8 أحرف على الأقل وتجمع أحرفاً وأرقاماً');
    }
    // 📜 الموافقة على السياسات إلزامية لإنشاء أي حساب
    if (dto.agreedTerms !== true) {
      throw new BadRequestException('يجب الموافقة على سياسة الخصوصية وشروط الاستخدام لإنشاء الحساب');
    }
    const otpEnabled = await this.security.isOtpEnabled();
    if (otpEnabled) {
      throw new BadRequestException('التحقق برمز OTP مفعّل — استخدم مسار التحقق');
    }
    return this.createAccount(dto.userType, dto.phone, dto.name, dto.password, ip, dto.refCode);
  }

  // ═══ 4) دخول برقم الجوال + كلمة مرور ═══
  async phoneLogin(dto: PhoneLoginDto, ip: string) {
    await this.shield.requireCaptcha('login', dto.captchaId, dto.captchaAnswer, ip); // 🤖
    const key = `login:${dto.phone}`;
    if (!this.security.checkAttempts(key, 5)) {
      throw new BadRequestException('محاولات كثيرة — انتظر 10 دقائق');
    }
    const user = await this.findUser(dto.userType, dto.phone);
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, dto.password))) {
      this.security.failAttempt(key);
      if (ip) this.security.failAttempt(`ip:${ip}`); // 🛡️ عدّاد IP — يغذّي الحظر التلقائي
      await this.security.log('login_fail', { ip, userType: dto.userType, details: { phone: dto.phone } });
      throw new UnauthorizedException('رقم الجوال أو كلمة المرور غير صحيحة');
    }
    if (user.status !== 'active') throw new UnauthorizedException('الحساب موقوف — تواصل مع الإدارة');
    this.security.clearAttempts(key);
    return this.session(dto.userType, user, ip);
  }

  // ═══ 5) دخول الإدارة (بريد + كلمة مرور — صفحة منفصلة) ═══
  async adminLogin(dto: AdminLoginDto, ip: string) {
    await this.shield.requireCaptcha('login', dto.captchaId, dto.captchaAnswer, ip); // 🤖
    const key = `admin:${dto.email}`;
    if (!this.security.checkAttempts(key, 5)) {
      throw new BadRequestException('محاولات كثيرة — انتظر 10 دقائق');
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (!admin || !(await argon2.verify(admin.passwordHash, dto.password))) {
      this.security.failAttempt(key);
      if (ip) this.security.failAttempt(`ip:${ip}`); // 🛡️ عدّاد IP — يغذّي الحظر التلقائي
      await this.security.log('admin_login_fail', { ip, details: { email: dto.email } });
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    if (admin.status !== 'active') throw new UnauthorizedException('الحساب موقوف');

    // 🔐 المصادقة الثنائية — مطلوبة بعد كلمة المرور الصحيحة
    if (admin.totpEnabled && admin.totpSecret) {
      if (!dto.totp) throw new UnauthorizedException('2FA_REQUIRED');
      const secret = decryptSecret(admin.totpSecret);
      if (!secret || !verifyTotp(secret, dto.totp)) {
        this.security.failAttempt(key);
        await this.security.log('admin_login_fail', { ip, details: { email: dto.email, reason: 'totp' } });
        throw new UnauthorizedException('رمز المصادقة الثنائية غير صحيح');
      }
    }

    this.security.clearAttempts(key);
    await this.security.log('admin_login_success', { ip, userType: 'admin', userId: admin.id });
    const tokens = await this.security.issueTokens('admin', admin.id);
    return {
      ...tokens,
      user: { id: admin.id, name: admin.name, email: admin.email, permissions: admin.permissions, isSuper: admin.isSuper },
    };
  }

  // ═══ 6) تجديد الرمز — مع دورة حياة الجلسة الكاملة ═══
  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.security.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('جلسة التحديث منتهية');
    }
    // 🔑 البائعون والعملاء: فحص الجلسة + تدوير الرمز (الرمز القديم يُبطل فوراً)
    if (payload.typ === 'seller' || payload.typ === 'customer') {
      const state = await this.security.touchSession(refreshToken);
      if (state === 'revoked' || state === 'expired') {
        throw new UnauthorizedException('انتهت الجلسة — سجّل الدخول مجدداً');
      }
      const tokens = await this.security.issueTokens(payload.typ, payload.sub);
      if (state === 'ok') {
        await this.security.rotateSession(refreshToken, tokens.refreshToken);
      } else {
        // جلسة سابقة لترقية الأمن — نسجّلها الآن لتدخل تحت الإدارة
        await this.security.recordSession(payload.typ, payload.sub, tokens.refreshToken);
      }
      return tokens;
    }
    // الإدارة والسائقون: رموز JWT فقط
    return this.security.issueTokens(payload.typ, payload.sub);
  }

  // ═══ أدوات داخلية ═══
  private async findUser(type: string, phone: string) {
    return type === 'seller'
      ? this.prisma.seller.findUnique({ where: { phone } })
      : this.prisma.customer.findUnique({ where: { phone } });
  }

  private async createAccount(type: 'seller' | 'customer', phone: string, name: string, password?: string, ip?: string, refCode?: string) {
    // 🚪 بوابة التسجيل — الإدارة تتحكم بفتح/إغلاق تسجيل البائعين والعملاء من الإعدادات
    const gate = await this.prisma.setting.findUnique({ where: { key: type === 'seller' ? 'sellers' : 'customers' } });
    if ((gate?.value as any)?.registrationOpen === false) {
      throw new ForbiddenException(type === 'seller'
        ? 'تسجيل البائعين مغلق مؤقتاً من إدارة المنصة — حاول لاحقاً'
        : 'تسجيل العملاء مغلق مؤقتاً من إدارة المنصة — حاول لاحقاً');
    }
    const exists = await this.findUser(type, phone);
    if (exists) throw new ConflictException('رقم الجوال مسجل مسبقاً — سجّل الدخول');
    const passwordHash = password ? await argon2.hash(password) : null;
    // 📜 توثيق لحظة الموافقة على السياسات مع الحساب
    const data: any = { phone, name, passwordHash, termsAcceptedAt: new Date() };
    const user = type === 'seller'
      ? await this.prisma.seller.create({ data })
      : await this.prisma.customer.create({ data });
    if (type === 'seller') {
      await this.prisma.wallet.create({ data: { sellerId: user.id } });
      // 🤝 رمز دعوة خاص بالبائع الجديد (فريد — يُستخدم في رابط إحالة التجار)
      const referralCode = 't' + crypto.randomBytes(4).toString('hex');
      await this.prisma.seller.update({ where: { id: user.id }, data: { referralCode } }).catch(() => {});
      // 🤝 تطبيق رمز إحالة التجار — ربط البائع الجديد بمن دعاه (لا يُفشل التسجيل إن كان الرمز غير صالح)
      if (refCode?.trim()) {
        const referrer = await this.prisma.seller.findUnique({ where: { referralCode: refCode.trim() } }).catch(() => null);
        if (referrer && referrer.id !== user.id) {
          await this.prisma.seller.update({ where: { id: user.id }, data: { referredById: referrer.id } }).catch(() => {});
          await this.notifications.push('seller', referrer.id, {
            icon: '🤝',
            title: 'تاجر جديد انضم بدعوتك!',
            body: `انضم «${name}» إلى يمن زون عبر رابط إحالتك — استمر بالدعوة واكسب المكافآت`,
            link: '/seller',
          }).catch(() => {});
        }
      }
    }
    // 🎁 تطبيق رمز الإحالة للعملاء الجدد (لا يُفشل التسجيل إن كان الرمز غير صالح)
    if (type === 'customer' && refCode?.trim()) {
      await this.referrals.applyReferral(user.id, refCode).catch(() => {});
    }
    await this.security.log('register_success', { ip, userType: type, userId: user.id });
    return this.session(type, user, ip);
  }

  private async loginByPhone(type: 'seller' | 'customer', phone: string, ip: string) {
    const user = await this.findUser(type, phone);
    if (!user) throw new UnauthorizedException('الحساب غير موجود — أنشئ حساباً أولاً');
    if (user.status !== 'active') throw new UnauthorizedException('الحساب موقوف');
    return this.session(type, user, ip);
  }

  private async session(type: 'seller' | 'customer', user: any, ip?: string) {
    await this.security.log('login_success', { ip, userType: type, userId: user.id });
    const tokens = await this.security.issueTokens(type, user.id);
    // 🔑 تسجيل الجلسة — تظهر في مركز الأمن ويمكن إنهاؤها عن بُعد
    await this.security.recordSession(type, user.id, tokens.refreshToken, ip);
    // 🔔 تنبيه دخول جديد — يكشف للمستخدم أي دخول غريب فور حدوثه
    this.notifications.push(type, user.id, {
      icon: '🔐',
      title: 'تسجيل دخول جديد لحسابك',
      body: `تم الدخول ${new Date().toLocaleString('ar-YE')}${ip ? ` من عنوان ${ip}` : ''} — إن لم تكن أنت، غيّر كلمة المرور فوراً وأبلغ الإدارة`,
      link: type === 'seller' ? '/seller/settings' : '/customer',
    }).catch(() => {});
    const update = { lastLoginAt: new Date() };
    type === 'seller'
      ? await this.prisma.seller.update({ where: { id: user.id }, data: update })
      : await this.prisma.customer.update({ where: { id: user.id }, data: update });
    return { ...tokens, user: { id: user.id, name: user.name, phone: user.phone, avatar: user.avatar } };
  }
}
