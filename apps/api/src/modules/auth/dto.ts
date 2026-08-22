import { IsString, IsNotEmpty, IsOptional, MinLength, IsEmail, Matches, IsIn, IsBoolean } from 'class-validator';

export class SendOtpDto {
  @IsString() @Matches(/^[+0-9]{7,20}$/, { message: 'رقم الجوال غير صحيح' })
  phone!: string;

  @IsIn(['seller', 'customer'])
  userType!: 'seller' | 'customer';

  @IsIn(['register', 'login', 'reset'])
  purpose!: 'register' | 'login' | 'reset';

  @IsOptional() @IsString() captchaId?: string;     // 🤖 لست روبوت
  @IsOptional() @IsString() captchaAnswer?: string;
}

export class VerifyOtpDto {
  @IsString() @IsNotEmpty() phone!: string;
  @IsString() @IsNotEmpty() code!: string;
  @IsIn(['seller', 'customer']) userType!: 'seller' | 'customer';
  @IsIn(['register', 'login', 'reset']) purpose!: 'register' | 'login' | 'reset';
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() refCode?: string; // 🎁 رمز إحالة (اختياري)
  @IsOptional() @IsBoolean() agreedTerms?: boolean; // 📜 موافقة السياسات (إلزامية للتسجيل)
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
  @IsOptional() @IsBoolean() agreedTerms?: boolean; // 📜 موافقة السياسات (إلزامية)
  @IsOptional() @IsString() captchaId?: string;
  @IsOptional() @IsString() captchaAnswer?: string;
}

// 🔑 استعادة كلمة المرور — بعد التحقق من رمز OTP
export class ResetPasswordDto {
  @IsString() @Matches(/^[+0-9]{7,20}$/) phone!: string;
  @IsIn(['seller', 'customer']) userType!: 'seller' | 'customer';
  @IsString() @IsNotEmpty({ message: 'رمز الاستعادة مفقود' }) resetToken!: string;
  @IsString() @MinLength(8, { message: 'كلمة المرور 8 أحرف على الأقل' }) password!: string;
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
