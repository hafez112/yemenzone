import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 🛍️ خدمات التاجر — متاحة للبائعين فقط، تظهر في لوحة تحكم البائع
const MERCHANT_TOOLS = new Set([
  'invoice', 'qr', 'barcode', 'writer', 'catalog',
  'pricing', 'installments', 'debts', 'docs', 'posts',
]);

const SLUG_RE = /^[a-z0-9-]{1,40}$/;

// 🧰 خدمات المستخدم — إضافة/إزالة + قاعدة بيانات خاصة لكل خدمة يستخدمها
@Injectable()
export class MyToolsService {
  constructor(private prisma: PrismaService) {}

  private checkSlug(slug: string) {
    if (!SLUG_RE.test(slug)) throw new BadRequestException('خدمة غير معروفة');
  }

  // 📋 خدماتي — القائمة مع حالة البيانات وآخر تحديث
  async list(userType: string, userId: string) {
    const rows = await this.prisma.userTool.findMany({
      where: { userType, userId },
      orderBy: { createdAt: 'desc' },
      select: { slug: true, createdAt: true, updatedAt: true, data: true },
    });
    return rows.map((r) => ({
      slug: r.slug,
      addedAt: r.createdAt,
      updatedAt: r.updatedAt,
      hasData: r.data != null, // 🗄️ لهذه الخدمة بيانات محفوظة في قاعدتها
    }));
  }

  // ➕ إضافة خدمة إلى لوحتي — خدمات التاجر للبائعين فقط
  async add(userType: string, userId: string, slug: string) {
    this.checkSlug(slug);
    if (MERCHANT_TOOLS.has(slug) && userType !== 'seller') {
      throw new ForbiddenException('هذه الخدمة خاصة بالتجار — أنشئ حساب بائع لاستخدامها');
    }
    const row = await this.prisma.userTool.upsert({
      where: { userType_userId_slug: { userType, userId, slug } },
      create: { userType, userId, slug },
      update: {},
    });
    return { added: true, slug: row.slug };
  }

  // ✕ إزالة خدمة من لوحتي (تُحذف قاعدة بياناتها معها)
  async remove(userType: string, userId: string, slug: string) {
    this.checkSlug(slug);
    await this.prisma.userTool.deleteMany({ where: { userType, userId, slug } });
    return { removed: true };
  }

  // 📥 قراءة قاعدة بيانات الخدمة الخاصة بالمستخدم
  async getData(userType: string, userId: string, slug: string) {
    this.checkSlug(slug);
    const row = await this.prisma.userTool.findUnique({
      where: { userType_userId_slug: { userType, userId, slug } },
      select: { data: true, updatedAt: true },
    });
    if (!row) throw new NotFoundException('الخدمة غير مضافة إلى لوحتك');
    return { data: row.data ?? null, updatedAt: row.updatedAt };
  }

  // 📤 حفظ بيانات الخدمة — تُنشئ سجل الخدمة تلقائياً إن لم تكن مضافة
  async saveData(userType: string, userId: string, slug: string, data: any) {
    this.checkSlug(slug);
    if (MERCHANT_TOOLS.has(slug) && userType !== 'seller') {
      throw new ForbiddenException('هذه الخدمة خاصة بالتجار');
    }
    // حماية الحجم: 512KB كحد أقصى لقاعدة بيانات الخدمة الواحدة
    const size = JSON.stringify(data ?? null).length;
    if (size > 512 * 1024) throw new BadRequestException('بيانات الخدمة تجاوزت الحد المسموح');
    const row = await this.prisma.userTool.upsert({
      where: { userType_userId_slug: { userType, userId, slug } },
      create: { userType, userId, slug, data: data ?? null },
      update: { data: data ?? null },
    });
    return { saved: true, updatedAt: row.updatedAt };
  }
}
