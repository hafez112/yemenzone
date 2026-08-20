import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateStoreType } from '../../libs/ai';

const VALID_KINDS = ['products', 'rentals', 'hotel', 'services', 'restaurants', 'malls'];

// أنواع المتاجر — إدارة كاملة + توليد ذكي محلي من الاسم
@Injectable()
export class StoreTypesService {
  constructor(private prisma: PrismaService) {}

  // قائمة كل الأنواع مع عدد المتاجر لكل نوع
  list() {
    return this.prisma.storeType.findMany({
      orderBy: [{ sort: 'asc' }, { nameAr: 'asc' }],
      include: { _count: { select: { stores: true } } },
    });
  }

  // 🤖 توليد ذكي: الاسم فقط → إعداد كامل (بدون حفظ)
  aiGenerate(name: string) {
    if (!name || name.trim().length < 2) {
      throw new BadRequestException('اكتب اسم النوع أولاً (حرفان على الأقل)');
    }
    return generateStoreType(name);
  }

  // إنشاء نوع — الحقول الناقصة يولّدها الذكاء المحلي تلقائياً
  async create(body: {
    nameAr: string; kind?: string; icon?: string; color?: string;
    description?: string; nameEn?: string; sort?: number;
  }) {
    if (!body.nameAr || body.nameAr.trim().length < 2) {
      throw new BadRequestException('اسم النوع مطلوب');
    }
    const ai = generateStoreType(body.nameAr);
    const kind = VALID_KINDS.includes(body.kind || '') ? body.kind! : ai.kind;

    // منع تكرار نفس الاسم على نفس النشاط
    const dup = await this.prisma.storeType.findFirst({
      where: { kind: kind as any, nameAr: body.nameAr.trim() },
    });
    if (dup) throw new ConflictException('هذا النوع موجود بالفعل');

    const max = await this.prisma.storeType.aggregate({ _max: { sort: true } });
    return this.prisma.storeType.create({
      data: {
        kind: kind as any,
        nameAr: body.nameAr.trim(),
        nameEn: body.nameEn?.trim() || null,
        icon: body.icon || ai.icon,
        color: body.color || ai.color,
        description: body.description?.trim() || ai.description,
        sort: body.sort ?? (max._max.sort || 0) + 1,
      },
      include: { _count: { select: { stores: true } } },
    });
  }

  // تعديل نوع موجود
  async update(id: string, body: {
    nameAr?: string; nameEn?: string; icon?: string; color?: string;
    description?: string; sort?: number; isActive?: boolean; kind?: string;
  }) {
    const type = await this.prisma.storeType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException('النوع غير موجود');

    if (body.kind && !VALID_KINDS.includes(body.kind)) {
      throw new BadRequestException('النشاط الأساسي غير صحيح');
    }
    if (body.nameAr && body.nameAr.trim().length < 2) {
      throw new BadRequestException('اسم النوع قصير جداً');
    }

    return this.prisma.storeType.update({
      where: { id },
      data: {
        ...(body.nameAr !== undefined ? { nameAr: body.nameAr.trim() } : {}),
        ...(body.nameEn !== undefined ? { nameEn: body.nameEn?.trim() || null } : {}),
        ...(body.icon !== undefined ? { icon: body.icon } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.sort !== undefined ? { sort: body.sort } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.kind ? { kind: body.kind as any } : {}),
      },
      include: { _count: { select: { stores: true } } },
    });
  }

  // حذف نوع — ممنوع إن كانت هناك متاجر مرتبطة به
  async remove(id: string) {
    const type = await this.prisma.storeType.findUnique({
      where: { id },
      include: { _count: { select: { stores: true } } },
    });
    if (!type) throw new NotFoundException('النوع غير موجود');
    if (type._count.stores > 0) {
      throw new ConflictException(
        `لا يمكن حذف «${type.nameAr}» — مرتبط بـ ${type._count.stores} متجر. عطّله بدلاً من حذفه`,
      );
    }
    await this.prisma.storeType.delete({ where: { id } });
    return { deleted: true };
  }
}
