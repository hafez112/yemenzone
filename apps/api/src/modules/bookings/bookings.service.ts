import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { WebPushService } from '../notifications/push.service';
import { CacheService } from '../../common/cache.service';
import { CurrencyService } from '../../prisma/currency.service';
import { effectiveFeatures } from '../../common/features';
import { sanitizePhone, sanitizeText, normalizePhone } from '../../libs/security';

// نظام الحجوزات الموحد: وحدات إيجار + غرف فندقية + خدمات
@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService, private messaging: MessagingService, private webPush: WebPushService, private cache: CacheService, private fx: CurrencyService) {}

  // ⚡ إبطال كاش الواجهة العامة بعد تعديل الوحدات/الغرف/الخدمات
  private bust(store: { slug: string }) {
    this.cache.del(`sf:${store.slug}`).catch(() => {});
  }

  private async sellerStore(sellerId: string, kind: string) {
    const store = await this.prisma.store.findFirst({
      where: { sellerId },
      include: { type: true, subscription: { include: { plan: true } } },
    });
    if (!store) throw new NotFoundException('أنشئ متجرك أولاً');
    if (store.type.kind !== kind) {
      throw new BadRequestException(`متجرك من نوع "${store.type.nameAr}" — هذه الصفحة لنوع آخر`);
    }
    return store;
  }

  // 🎯 حد العناصر حسب النشاط من باقة البائع — المفتاح غير المضبوط = بلا حدود (حماية للمتاجر القائمة)
  private async enforceLimit(store: any, kind: string, m: any) {
    const key = kind === 'rentals' ? 'maxUnits' : kind === 'hotel' ? 'maxRooms' : 'maxServices';
    const label = kind === 'rentals' ? 'وحدة إيجار' : kind === 'hotel' ? 'غرفة' : 'خدمة';
    const feats = effectiveFeatures(store);
    const raw = feats[key];
    if (raw === undefined || raw === null || Number(raw) === -1) return;
    const max = Number(raw);
    const count = await (m.item as any).count({ where: { storeId: store.id } });
    if (count >= max) {
      throw new ForbiddenException({
        message: `خطتك تسمح بـ ${max} ${label} فقط — رقِّ خطتك لإضافة المزيد`,
        featureCode: key, locked: true,
      });
    }
  }

  // ═══ النماذج حسب النوع ═══
  private models(kind: string) {
    if (kind === 'rentals') return { item: this.prisma.rentalUnit, booking: this.prisma.rentalBooking, itemFk: 'unitId' };
    if (kind === 'hotel')   return { item: this.prisma.hotelRoom,  booking: this.prisma.roomBooking,  itemFk: 'roomId' };
    return { item: this.prisma.serviceItem, booking: this.prisma.serviceRequest, itemFk: 'serviceId' };
  }

  // ═══ إدارة العناصر (وحدة/غرفة/خدمة) ═══
  async listItems(sellerId: string, kind: string) {
    const store = await this.sellerStore(sellerId, kind);
    const m = this.models(kind);
    return (m.item as any).findMany({
      where: { storeId: store.id },
      include: { _count: { select: { bookings: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createItem(sellerId: string, kind: string, body: any) {
    const store = await this.sellerStore(sellerId, kind);
    const m = this.models(kind);
    await this.enforceLimit(store, kind, m);
    if (!body.title?.trim()) throw new BadRequestException('الاسم مطلوب');
    const priceField = kind === 'rentals' ? 'pricePerDay' : kind === 'hotel' ? 'pricePerNight' : 'price';
    if (!body.price || Number(body.price) <= 0) throw new BadRequestException('السعر مطلوب');

    // 💱 عملة التسعير — نشطة ومعتمدة من الإدارة (افتراضي = عملة المنصة)
    const itemCur = body.currency ? await this.fx.requireActive(body.currency) : await this.fx.default();
    const data: any = {
      storeId: store.id,
      title: body.title.trim(),
      description: body.description,
      images: body.images || [],
      [priceField]: Number(body.price),
      currency: itemCur.code,
    };
    if (kind === 'rentals') {
      data.type = body.type; data.address = body.address;
      data.governorate = body.governorate || store.governorate;
      data.features = body.features || [];
      // 🏠 حقول الإيجارات النشاطية
      data.pricePerMonth = body.pricePerMonth ? Number(body.pricePerMonth) : null;
      data.deposit = body.deposit ? Number(body.deposit) : null;
      data.areaM2 = body.areaM2 ? Number(body.areaM2) : null;
      data.roomsCount = body.roomsCount ? Number(body.roomsCount) : null;
      data.specs = body.specs || null;
    }
    if (kind === 'hotel') {
      data.roomType = body.roomType;
      data.capacity = Number(body.capacity || 2);
      data.features = body.features || [];
      // 🛎️ حقول الفنادق النشاطية
      data.beds = Math.max(1, Number(body.beds || 1));
      data.view = body.view || null;
      data.breakfast = !!body.breakfast;
      data.specs = body.specs || null;
    }
    if (kind === 'services') {
      data.duration = body.duration;
      // 🛠️ حقول الخدمات النشاطية
      data.category = body.category || null;
      data.durationMin = body.durationMin ? Number(body.durationMin) : null;
      data.warrantyText = body.warrantyText || null;
      data.specs = body.specs || null;
    }

    const created = await (m.item as any).create({ data });
    this.bust(store);
    return created;
  }

  async updateItem(sellerId: string, kind: string, id: string, body: any) {
    const store = await this.sellerStore(sellerId, kind);
    const m = this.models(kind);
    const item = await (m.item as any).findFirst({ where: { id, storeId: store.id } });
    if (!item) throw new NotFoundException('العنصر غير موجود');
    const priceField = kind === 'rentals' ? 'pricePerDay' : kind === 'hotel' ? 'pricePerNight' : 'price';
    const data: any = {
      title: body.title, description: body.description, images: body.images,
      isActive: body.isActive,
      ...(body.price ? { [priceField]: Number(body.price) } : {}),
    };
    if (body.currency) data.currency = (await this.fx.requireActive(body.currency)).code;
    if (kind === 'rentals') {
      data.type = body.type; data.address = body.address; data.features = body.features;
      data.pricePerMonth = body.pricePerMonth ? Number(body.pricePerMonth) : null;
      data.deposit = body.deposit ? Number(body.deposit) : null;
      data.areaM2 = body.areaM2 ? Number(body.areaM2) : null;
      data.roomsCount = body.roomsCount ? Number(body.roomsCount) : null;
      data.specs = body.specs || null;
    }
    if (kind === 'hotel') {
      data.roomType = body.roomType; data.capacity = body.capacity ? Number(body.capacity) : undefined; data.features = body.features;
      data.beds = body.beds ? Math.max(1, Number(body.beds)) : undefined;
      data.view = body.view ?? undefined;
      if (body.breakfast !== undefined) data.breakfast = !!body.breakfast;
      data.specs = body.specs || null;
    }
    if (kind === 'services') {
      data.duration = body.duration;
      data.category = body.category ?? undefined;
      data.durationMin = body.durationMin ? Number(body.durationMin) : null;
      data.warrantyText = body.warrantyText ?? undefined;
      data.specs = body.specs || null;
    }
    const updated = await (m.item as any).update({ where: { id }, data });
    this.bust(store);
    return updated;
  }

  async deleteItem(sellerId: string, kind: string, id: string) {
    const store = await this.sellerStore(sellerId, kind);
    const m = this.models(kind);
    const item = await (m.item as any).findFirst({ where: { id, storeId: store.id } });
    if (!item) throw new NotFoundException('العنصر غير موجود');
    const deleted = await (m.item as any).delete({ where: { id } });
    this.bust(store);
    return deleted;
  }

  // ═══ الحجوزات الواردة للبائع ═══
  async listBookings(sellerId: string, kind: string) {
    const store = await this.sellerStore(sellerId, kind);
    const m = this.models(kind);
    return (m.booking as any).findMany({
      where: { [m.itemFk === 'unitId' ? 'unit' : m.itemFk === 'roomId' ? 'room' : 'service']: { storeId: store.id } },
      include: { [m.itemFk === 'unitId' ? 'unit' : m.itemFk === 'roomId' ? 'room' : 'service']: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBookingStatus(sellerId: string, kind: string, id: string, status: string) {
    const store = await this.sellerStore(sellerId, kind);
    const m = this.models(kind);
    const booking = await (m.booking as any).findFirst({
      where: { id, [m.itemFk === 'unitId' ? 'unit' : m.itemFk === 'roomId' ? 'room' : 'service']: { storeId: store.id } },
    });
    if (!booking) throw new NotFoundException('الحجز غير موجود');
    const updated = await (m.booking as any).update({ where: { id }, data: { status } });

    // 📨 إشعار العميل بتحديث حجزه
    const statusAr: Record<string, string> = { confirmed: 'مؤكد ✅', completed: 'مكتمل 🎉', cancelled: 'ملغي ❌', pending: 'قيد المراجعة ⏳' };
    const kindAr: Record<string, string> = { rentals: 'حجز', hotel: 'حجز', services: 'طلب خدمة' };
    await this.messaging.send('booking_status', booking.customerPhone, {
      name: booking.customerName, number: `${kindAr[kind] || 'حجز'} #${id.slice(-6).toUpperCase()}`,
      status: statusAr[status] || status, store: store.name,
    });
    return updated;
  }

  // ═══ إنشاء حجز من واجهة المتجر (عام) ═══
  async createBooking(slug: string, body: {
    itemType: 'rental' | 'room' | 'service';
    itemId: string;
    customerName: string;
    customerPhone: string;
    fromDate?: string;
    toDate?: string;
    guests?: number;
    details?: string;
  }) {
    const store = await this.prisma.store.findUnique({ where: { slug }, include: { type: true } });
    if (!store || store.status !== 'active') throw new NotFoundException('المتجر غير موجود');
    // ⏸️ مغلق مؤقتاً — لا يستقبل حجوزات جديدة حتى عودته
    if (store.pausedAt) {
      throw new BadRequestException(store.pauseNote ? `⏸️ مغلق مؤقتاً — ${store.pauseNote}` : '⏸️ مغلق مؤقتاً — يعود قريباً');
    }
    // 🛡️ تعقيم مدخلات العميل قبل الحفظ (مكتبة libs/security)
    const customerName = sanitizeText(body.customerName, 80);
    const customerPhone = normalizePhone(body.customerPhone) || sanitizePhone(body.customerPhone);
    const details = sanitizeText(body.details, 500);
    if (!customerName || !customerPhone) {
      throw new BadRequestException('الاسم ورقم الجوال مطلوبان');
    }

    let total = 0;
    let booking: any;
    let itemTitle = '';
    let itemCurrency = 'YER';

    if (body.itemType === 'rental') {
      const unit = await this.prisma.rentalUnit.findFirst({ where: { id: body.itemId, storeId: store.id, isActive: true } });
      if (!unit) throw new NotFoundException('الوحدة غير متوفرة');
      if (!body.fromDate || !body.toDate) throw new BadRequestException('حدد تاريخ البداية والنهاية');
      const days = Math.max(1, Math.ceil((new Date(body.toDate).getTime() - new Date(body.fromDate).getTime()) / 86400000));
      total = days * Number(unit.pricePerDay);
      itemTitle = unit.title;
      itemCurrency = (unit as any).currency || 'YER';
      booking = await this.prisma.rentalBooking.create({
        data: {
          unitId: unit.id,
          customerName, customerPhone,
          fromDate: new Date(body.fromDate), toDate: new Date(body.toDate),
          total, currency: itemCurrency, notes: details || null,
        },
      });
    } else if (body.itemType === 'room') {
      const room = await this.prisma.hotelRoom.findFirst({ where: { id: body.itemId, storeId: store.id, isActive: true } });
      if (!room) throw new NotFoundException('الغرفة غير متوفرة');
      if (!body.fromDate || !body.toDate) throw new BadRequestException('حدد تاريخ الوصول والمغادرة');
      const nights = Math.max(1, Math.ceil((new Date(body.toDate).getTime() - new Date(body.fromDate).getTime()) / 86400000));
      total = nights * Number(room.pricePerNight);
      itemTitle = room.title;
      itemCurrency = (room as any).currency || 'YER';
      booking = await this.prisma.roomBooking.create({
        data: {
          roomId: room.id,
          customerName, customerPhone,
          checkIn: new Date(body.fromDate), checkOut: new Date(body.toDate),
          guests: Number(body.guests || 1), total, currency: itemCurrency, notes: details || null,
        },
      });
    } else {
      const service = await this.prisma.serviceItem.findFirst({ where: { id: body.itemId, storeId: store.id, isActive: true } });
      if (!service) throw new NotFoundException('الخدمة غير متوفرة');
      total = Number(service.price);
      itemTitle = service.title;
      itemCurrency = (service as any).currency || 'YER';
      booking = await this.prisma.serviceRequest.create({
        data: {
          serviceId: service.id,
          customerName, customerPhone,
          details: details || null, total, currency: itemCurrency,
        },
      });
    }

    // 💱 رمز عملة الحجز من قائمة عملات الإدارة
    const itemSym = (await this.fx.known(itemCurrency)).symbol;
    // 📲 إشعار فوري للبائع بالحجز الجديد — يصله حتى وتطبيق لوحته مغلق
    this.webPush.sendToUser('seller', store.sellerId, {
      title: `📅 حجز جديد — ${itemTitle}`,
      body: `${customerName} — ${total.toLocaleString()} ${itemSym} · افتح لوحتك لتأكيده`,
      url: '/seller',
    });

    // رسالة واتساب جاهزة
    const waText = [
      `📅 *طلب حجز جديد*`,
      `المتجر: ${store.name}`,
      `━━━━━━━━━━━━━`,
      `▪️ ${itemTitle}`,
      body.fromDate ? `📆 من ${body.fromDate}${body.toDate ? ` إلى ${body.toDate}` : ''}` : '',
      body.guests ? `👥 عدد الضيوف: ${body.guests}` : '',
      `💰 *الإجمالي: ${total.toLocaleString()} ${itemSym}*`,
      ``,
      `👤 ${customerName}`,
      `📱 ${customerPhone}`,
      details ? `📝 ${details}` : '',
    ].filter(Boolean).join('\n');

    return { booking, total, waText, storeWhatsapp: store.whatsapp };
  }
}
