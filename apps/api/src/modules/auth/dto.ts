import { IsString, IsNotEmpty, IsOptional, MinLength, IsEmail, Matches, IsIn } from 'class-validator';

export class SendOtpDto {
  @IsString() @Matches(/^[+0-9]{7,20}$/, { message: 'رقم الجوال غير صحيح' })
  phone!: string;

  @IsIn(['seller', 'customer'])
  userType!: 'seller' | 'customer';

  @IsIn(['register', 'login'])
  purpose!: 'register' | 'login';

  @IsOptional() @IsString() captchaId?: string;     // 🤖 لست روبوت
  @IsOptional() @IsString() captchaAnswer?: string;
}

export class VerifyOtpDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsString() @IsNotEmpty() code!: string;
  @IsIn(['seller', 'customer']) userType!: 'seller' | 'customer';
  @IsIn(['register', 'login']) purpose!: 'register' | 'login';
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() refCode?: string; // 🎁 رمز إحالة (اختياري)
}

export class PhoneLoginDto {
  @IsString() @Matches(/^[+0-9]{7,20}$/) phone!: string;
  @IsString() @MinLength(6, { message: 'كلمة المرور 6 أحرف على الأقل' }) password!: string;
  @IsIn(['seller', 'customer']) userType!: 'seller' | 'customer';
  @IsOptional() @IsString() captchaId?: string;
  @IsOptional() @IsString() captchaAnswer?: string;
}

export class RegisterDto {
  @IsString() @Matches(/^[+0-9]{7,20}$/) phone!: string;
  @IsString() @IsNotEmpty({ message: 'الاسم مطلوب' }) name!: string;
  @IsString() @MinLength(6) password!: string;
  @IsIn(['seller', 'customer']) userType!: 'seller' | 'customer';
  @IsOptional() @IsString() refCode?: string; // 🎁 رمز إحالة (اختياري)
  @IsOptional() @IsString() captchaId?: string;
  @IsOptional() @IsString() captchaAnswer?: string;
}

export class AdminLoginDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' }) email!: string;
  @IsString() @IsNotEmpty() password!: string;
  @IsOptional() @IsString() totp?: string; // 🔐 رمز المصادقة الثنائية (إن كانت مفعّلة)
  @IsOptional() @IsString() captchaId?: string;
  @IsOptional() @IsString() captchaAnswer?: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty() refreshToken!: string;
}
