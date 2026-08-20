import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SecurityService } from '../../common/security.service';
import { SendOtpDto, VerifyOtpDto, PhoneLoginDto, RegisterDto, AdminLoginDto, RefreshDto } from './dto';
import { ClientIp, CurrentUser } from '../../common/decorators';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RateLimit } from '../../common/guards/rate-limit.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private security: SecurityService,
  ) {}

  // إرسال OTP (يعمل فقط عند تفعيل قالب OTP من الإدارة) — 🚦 5 طلبات/5د لكل IP
  @UseGuards(RateLimit(5, 5 * 60_000, 'send-otp'))
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto, @ClientIp() ip: string) {
    return this.auth.sendOtp(dto, ip);
  }

  // التحقق من OTP (تسجيل أو دخول) — 🚦 10 محاولات/5د
  @UseGuards(RateLimit(10, 5 * 60_000, 'verify'))
  @Post('verify')
  verify(@Body() dto: VerifyOtpDto, @ClientIp() ip: string) {
    return this.auth.verifyOtp(dto, ip);
  }

  // تسجيل حساب (عند تعطيل OTP) — 🚦 8 حسابات/ساعة
  @UseGuards(RateLimit(8, 60 * 60_000, 'register'))
  @Post('register')
  register(@Body() dto: RegisterDto, @ClientIp() ip: string) {
    return this.auth.register(dto, ip);
  }

  // دخول البائع/العميل برقم الجوال — 🚦 15 محاولة/10د
  @UseGuards(RateLimit(15, 10 * 60_000, 'login'))
  @Post('login')
  login(@Body() dto: PhoneLoginDto, @ClientIp() ip: string) {
    return this.auth.phoneLogin(dto, ip);
  }

  // دخول الإدارة — صفحة منفصلة بالبريد الإلكتروني — 🚦 10 محاولات/10د
  @UseGuards(RateLimit(10, 10 * 60_000, 'admin-login'))
  @Post('admin-login')
  adminLogin(@Body() dto: AdminLoginDto, @ClientIp() ip: string) {
    return this.auth.adminLogin(dto, ip);
  }

  // تجديد رمز الوصول — 🚦 60 طلب/دقيقة
  @UseGuards(RateLimit(60, 60_000, 'refresh'))
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  // بيانات المستخدم الحالي (محمي)
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: any) {
    return { user };
  }
}
