import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache.service';

// إعدادات التصميم العامة — تُقرأ من قاعدة البيانات (يعدّلها المدير من /admin/design في الجلسة 18)
@Controller('v1/theme')
export class ThemeController {
  constructor(private prisma: PrismaService, private cache: CacheService) {}

  @Get()
  async getTheme() {
    // ⚡ كاش 30 ثانية — أثقل نقطة عامة (تُقرأ مع كل تحميل واجهة)
    return this.cache.wrap('theme:all', 30, async () => {
    const settings = await this.prisma.setting.findMany();
    const map: Record<string, any> = {};
    for (const s of settings) map[s.key] = s.value;

    const slides = await this.prisma.slide.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' },
    });

    // ⚡ عرض الفلاش — يظهر فقط ضمن نافذته الزمنية
    const fs = map['flashSale'] as any;
    const flashSale = fs?.active && fs?.endsAt && new Date(fs.endsAt) > new Date()
      ? { title: String(fs.title || '⚡ عرض فلاش').slice(0, 80), endsAt: fs.endsAt, link: String(fs.link || '/offers').slice(0, 120), couponCode: fs.couponCode || null }
      : null;

    return {
      colors: map['colors'] ?? {},
      fonts: map['fonts'] ?? {},
      layout: map['layout'] ?? {},
      platform: map['platform'] ?? {},
      customCode: map['customCode'] ?? {},
      // 📱 إعدادات تصميم التطبيق الأصلي — تُدار من /admin/design تبويب «التطبيق»
      app: map['app'] ?? {},
      slides,
      flashSale,
    };
    });
  }

  // أنماط التصميم الجاهزة للواجهة العامة
  @Get('styles')
  styles() {
    return [
      { id: 'neon-purple', name: 'نيون بنفسجي', primary: '#6C3DF5', secondary: '#00E5C7', accent: '#FFB800' },
      { id: 'ocean-blue',  name: 'أزرق محيط',   primary: '#0EA5E9', secondary: '#22D3EE', accent: '#F59E0B' },
      { id: 'emerald',     name: 'أخضر زمردي',   primary: '#059669', secondary: '#34D399', accent: '#FBBF24' },
      { id: 'royal-gold',  name: 'ذهبي ملكي',    primary: '#B45309', secondary: '#F59E0B', accent: '#7C3AED' },
      { id: 'rose-pink',   name: 'وردي عصري',    primary: '#E11D48', secondary: '#FB7185', accent: '#8B5CF6' },
      { id: 'desert-sand', name: 'رملي صحراوي',  primary: '#C2410C', secondary: '#FDBA74', accent: '#0D9488' },
      { id: 'midnight',    name: 'ليلي سماوي',   primary: '#4338CA', secondary: '#818CF8', accent: '#22D3EE' },
      { id: 'coral-reef',  name: 'مرجاني حي',    primary: '#F43F5E', secondary: '#FDA4AF', accent: '#10B981' },
    ];
  }

  // قوالب متاجر التجار الجاهزة
  @Get('store-templates')
  storeTemplates() {
    return [
      { id: 'default', name: 'الافتراضي',  desc: 'بسيط ونظيف يناسب الجميع',      dark: false },
      { id: 'modern',  name: 'العصري',     desc: 'بطاقات زجاجية وحركات ناعمة',    dark: false },
      { id: 'dark',    name: 'الداكن',     desc: 'واجهة ليلية فاخرة',             dark: true  },
      { id: 'elegant', name: 'الأنيق',     desc: 'لمسات ذهبية وخطوط راقية',       dark: false },
      { id: 'aurora',  name: 'أورورا',     desc: 'شفق متدرج حالم بألوان المتجر',  dark: false },
      { id: 'minimal', name: 'المينيمال',  desc: 'هدوء اسكندنافي يركّز المنتج',   dark: false },
    ];
  }
}
