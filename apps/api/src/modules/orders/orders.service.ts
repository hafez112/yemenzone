import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebPushService } from '../notifications/push.service';
import { FinanceService } from '../finance/finance.service';

// 📍 المسافة الجوية بين نقطتين (كم) — هافرساين
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private messaging: MessagingService,
    private notifications: NotificationsService,
    private finance: FinanceService,
    private webPush: WebPushService,
  ) {}

  // ═══ إنشاء طلب من واجهة المتجر (عام) ═══
  async create(slug: string, body: {
    items: { productId: string; qty: number }[];
    customerName: string;
    customerPhone: string;
    address?: string;
    notes?: string;
    customerId?: string;
  }) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      include: { seller: true },
    });
    if (!store || store.status !== 'active') throw new NotFoundException('المتجر غير موجود');
    // ⏸️ متجر مغلق مؤقتاً — لا يستقبل طلبات جديدة حتى عودته
    if (store.pausedAt) {
      throw new BadRequestException(store.pauseNote ? `⏸️ مغلق مؤقتاً — ${store.pauseNote}` : '⏸️ المتجر مغلق مؤقتاً — يعود قريباً');
    }
    if (!body.items?.length) throw new BadRequestException('السلة فارغة');
    if (!body.customerName?.trim() || !body.customerPhone?.trim()) {
      throw new BadRequestException('الاسم ورقم الجوال مطلوبان');
    }

    // حساب المنتجات من قاعدة البيانات (حماية من تلاعب الأسعار)
    const ids = body.items.map(i => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, storeId: store.id, isActive: true },
    });
    if (products.length !== ids.length) throw new BadRequestException('بعض المنتجات غير متوفرة');

    let subtotal = 0;
    const variantUpdates: { productId: string; variants: any[] }[] = [];
    const items = body.items.map(i => {
      const p = products.find(x => x.id === i.productId)!;
      const qty = Math.max(1, Math.min(i.qty, 99));
      if (p.stock < qty) throw new BadRequestException(`الكمية غير متوفرة من "${p.name}"`);

      // 🎨 متغير محدد (لون/مقاس/وزن)؟ — سعره ومخزونه من خيارات المنتج
      const variants = Array.isArray((p as any).variants) ? ((p as any).variants as any[]) : [];
      const vId = typeof (i as any).variantId === 'string' ? (i as any).variantId : null;
      const variant = vId ? variants.find((v) => v.id === vId) : null;
      if (vId && variants.length && !variant) throw new BadRequestException(`الخيار المحدد غير متوفر لـ "${p.name}"`);
      if (variant) {
        if (variant.stock !== null && variant.stock !== undefined && variant.stock < qty) {
          throw new BadRequestException(`الكمية غير متوفرة من "${p.name} — ${[variant.color, variant.size].filter(Boolean).join(' ')}"`);
        }
        // خصم مخزون المتغير — يُطبق بعد إنشاء الطلب
        if (variant.stock !== null && variant.stock !== undefined) {
          const entry = variantUpdates.find((u) => u.productId === p.id)
            || variantUpdates[variantUpdates.push({ productId: p.id, variants: [...variants] }) - 1];
          const target = entry.variants.find((v) => v.id === vId);
          if (target) target.stock = Math.max(0, (target.stock || 0) - qty);
        }
      }

      const price = variant ? Number(variant.salePrice || variant.price) : Number(p.salePrice || p.price);
      const variantLabel = variant ? [variant.color, variant.size].filter(Boolean).join(' — ') : null;
      subtotal += price * qty;
      return {
        productId: p.id,
        name: variantLabel ? `${p.name} (${variantLabel})` : p.name,
        variant: variantLabel,
        variantId: variant?.id || null,
        price,
        qty,
      };
    });

    // 🎟️ تطبيق الكوبون إن وُجد
    let discount = 0;
    let couponId: string | undefined;
    if ((body as any).couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: { code: (body as any).couponCode.toUpperCase(), isActive: true },
      });
      if (coupon && (!coupon.storeId || coupon.storeId === store.id)) {
        const now = new Date();
        const expired = coupon.expiresAt && coupon.expiresAt < now;
        const notStarted = coupon.startsAt && coupon.startsAt > now; // 🗓️ حملة مجدولة لم تبدأ
        const exhausted = coupon.maxUses && coupon.usedCount >= coupon.maxUses;
        const belowMin = subtotal < Number(coupon.minTotal || 0); // أدنى إجمالي
        if (!expired && !notStarted && !exhausted && !belowMin) {
          discount = coupon.type === 'percent'
            ? Math.round((subtotal * Number(coupon.value)) / 100)
            : Math.min(Number(coupon.value), subtotal);
          couponId = coupon.id;
          await this.prisma.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }

    const number = 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase();

    // 🛡️ customerId القادم من الواجهة قد يكون معرّف بائع/مدير مسجّل دخوله —
    // نتحقق أنه عميل حقيقي وإلا نتجاهله (كان يسبب فشل إنشاء الطلب بانتهاك المفتاح الأجنبي)
    let customerId: string | null = null;
    if (body.customerId) {
      const realCustomer = await this.prisma.customer.findUnique({ where: { id: body.customerId } });
      if (realCustomer) customerId = realCustomer.id;
    }

    // طريقة الدفع المختارة (cash أو gateway:<اسم> أو store:<معرف طريقة المتجر>) — مُعقّمة ومحدودة الطول
    const rawMethod = (body as any).paymentMethod;
    let paymentMethod = typeof rawMethod === 'string' && rawMethod.length <= 60 ? rawMethod : 'cash';
    let paymentFee = 0;

    // 💳 طريقة دفع خاصة بالمتجر — نتحقق أنها تابعة له ونشطة (حماية من التلاعب)
    if (typeof rawMethod === 'string' && rawMethod.startsWith('store:')) {
      const m = await this.prisma.storePaymentMethod.findFirst({
        where: { id: rawMethod.slice(6), storeId: store.id, isActive: true },
      });
      if (!m) throw new BadRequestException('طريقة الدفع غير متاحة لهذا المتجر');
      paymentMethod = m.type === 'cash' ? 'cash' : `store:${m.label}`;
      paymentFee = m.fee;
    }

    // 🚚 طريقة التوصيل الخاصة بالمتجر — رسومها تُحسب من قاعدة البيانات لا من العميل
    const rawDelivery = (body as any).deliveryMethodId;
    let deliveryFee = 0;
    let deliveryMethod: string | null = null;
    if (typeof rawDelivery === 'string' && rawDelivery) {
      const d = await this.prisma.storeDeliveryMethod.findFirst({
        where: { id: rawDelivery, storeId: store.id, isActive: true },
      });
      if (!d) throw new BadRequestException('طريقة التوصيل غير متاحة لهذا المتجر');
      deliveryFee = d.fee;
      deliveryMethod = d.label;
    }

    // 📍 موقع العميل (اختياري — يشاركه بنفسه من نموذج التوصيل) — تحقق صارم من النطاق
    const rawLat = Number((body as any).customerLat);
    const rawLng = Number((body as any).customerLng);
    const hasLoc = Number.isFinite(rawLat) && Number.isFinite(rawLng)
      && Math.abs(rawLat) <= 90 && Math.abs(rawLng) <= 180 && (rawLat !== 0 || rawLng !== 0);

    const order = await this.prisma.order.create({
      data: {
        number,
        storeId: store.id,
        customerId,
        customerName: body.customerName.trim(),
        customerPhone: body.customerPhone.trim(),
        address: body.address,
        customerLat: hasLoc ? Math.round(rawLat * 1e6) / 1e6 : null,
        customerLng: hasLoc ? Math.round(rawLng * 1e6) / 1e6 : null,
        notes: body.notes,
        subtotal,
        discount,
        deliveryFee: deliveryFee + paymentFee,
        total: Math.max(0, subtotal - discount + deliveryFee + paymentFee),
        couponId,
        paymentMethod,
        deliveryMethod,
        items: { create: items },
      },
      include: { items: true },
    });

    // خصم المخزون + 🔔 تنبيه ذكي عند بلوغ حد الانخفاض (مرة واحدة حتى إعادة التخزين)
    for (const i of items) {
      await this.prisma.product.update({
        where: { id: i.productId },
        data: { stock: { decrement: i.qty } },
      });
      const src = products.find((x) => x.id === i.productId);
      if (src) {
        const remaining = src.stock - i.qty;
        if (remaining <= src.lowStockAt && !src.stockAlertedAt) {
          await this.prisma.product.update({
            where: { id: src.id },
            data: { stockAlertedAt: new Date() },
          }).catch(() => {});
          this.notifications.push('seller', store.sellerId, {
            icon: remaining <= 0 ? '🚨' : '📦',
            title: remaining <= 0 ? `نفد مخزون "${src.name}"!` : `مخزون "${src.name}" أوشك على النفاد`,
            body: remaining <= 0
              ? 'المنتج ظهر للزبائن كـ (نفد) — أعد تخزينه من صفحة المخزون'
              : `تبقى ${remaining} قطعة فقط — حد التنبيه: ${src.lowStockAt}`,
            link: '/seller/inventory',
          });
        }
      }
    }

    // 🎨 خصم مخزون المتغيرات المختارة (JSON داخل المنتج)
    for (const u of variantUpdates) {
      await this.prisma.product.update({ where: { id: u.productId }, data: { variants: u.variants } }).catch(() => {});
    }

    // إنشاء حساب عميل تلقائياً إن لم يكن موجوداً (تسجيل صامت بالجوال) + ربط الطلب به
    let notifyCustomerId = customerId;
    if (!notifyCustomerId) {
      const existing = await this.prisma.customer.findUnique({ where: { phone: body.customerPhone.trim() } });
      if (!existing) {
        const created = await this.prisma.customer.create({
          data: { phone: body.customerPhone.trim(), name: body.customerName.trim() },
        }).catch(() => null);
        notifyCustomerId = created?.id || null;
      } else {
        notifyCustomerId = existing.id;
      }
      if (notifyCustomerId) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { customerId: notifyCustomerId },
        }).catch(() => {});
      }
    }

    // 🔔 تنبيه داخلي للعميل — يظهر في مركز تنبيهاته مع رابط التتبع الجاهز
    if (notifyCustomerId) {
      await this.notifications.push('customer', notifyCustomerId, {
        icon: '🛒',
        title: `استلمنا طلبك ${order.number}`,
        body: `${store.name} — ${Number(order.total).toLocaleString()} ر.ي · تابع حالته لحظة بلحظة`,
        link: `/track?number=${order.number}&phone=${encodeURIComponent(order.customerPhone)}`,
      });
    }

    // 📲 إشعار فوري (Web Push) — يصل للبائع والعميل حتى والتطبيق مغلق
    this.webPush.sendToUser('seller', store.sellerId, {
      title: `📦 طلب جديد ${order.number}`,
      body: `${order.customerName} — ${Number(order.total).toLocaleString()} ر.ي · افتح لوحتك لمعالجته`,
      url: '/seller/orders',
    });
    if (notifyCustomerId) {
      this.webPush.sendToUser('customer', notifyCustomerId, {
        title: `🛒 استلمنا طلبك ${order.number}`,
        body: `${store.name} — ${Number(order.total).toLocaleString()} ر.ي`,
        url: `/track?number=${order.number}&phone=${encodeURIComponent(order.customerPhone)}`,
      });
    }

    // نص واتساب جاهز للتأكيد
    const waText = this.buildWhatsAppText(order, store.name);

    // 📨 إشعار العميل بطلبه الجديد (إن كان القالب مفعّلاً)
    await this.messaging.send('order_new', order.customerPhone, {
      name: order.customerName, number: order.number,
      store: store.name, total: `${order.total} ${order.currency}`,
    });

    // 🔔 تنبيه داخلي للبائع — يظهر فوراً في لوحته
    await this.notifications.push('seller', store.sellerId, {
      icon: '🛒',
      title: `طلب جديد ${order.number}`,
      body: `${order.customerName} — ${Number(order.total).toLocaleString()} ر.ي`,
      link: '/seller/orders',
    });

    return { order, waText, storeWhatsapp: store.whatsapp };
  }

  // نص رسالة الواتساب المنظمة
  buildWhatsAppText(order: any, storeName: string) {
    const lines = [
      `🛒 *طلب جديد ${order.number}*`,
      `من متجر: ${storeName}`,
      `━━━━━━━━━━━━━`,
      ...order.items.map((i: any) => `▪️ ${i.name} × ${i.qty} = ${(Number(i.price) * i.qty).toLocaleString()} ر.ي`),
      `━━━━━━━━━━━━━`,
      Number(order.discount) > 0 ? `🎟️ الخصم: -${Number(order.discount).toLocaleString()} ر.ي` : '',
      `💰 *الإجمالي: ${Number(order.total).toLocaleString()} ر.ي*`,
      ``,
      `👤 ${order.customerName}`,
      `📱 ${order.customerPhone}`,
      order.address ? `📍 ${order.address}` : '',
      (order.customerLat && order.customerLng)
        ? `🗺️ موقع العميل: https://maps.google.com/?q=${order.customerLat},${order.customerLng}` : '',
      order.notes ? `📝 ${order.notes}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  }

  // 🗺️ رابط خرائط جوجل لموقع عميل الطلب (إن شاركه)
  static mapsLink(order: any): string | null {
    return order?.customerLat && order?.customerLng
      ? `https://maps.google.com/?q=${order.customerLat},${order.customerLng}` : null;
  }

  // ═══ طلبات العميل (لوحته) ═══
  async customerOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: true,
        store: { select: { name: true, slug: true, whatsapp: true, logo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async customerOrder(customerId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId },
      include: {
        items: true,
        store: { select: { name: true, slug: true, whatsapp: true } },
        returns: { orderBy: { createdAt: 'desc' as const }, select: { id: true, reason: true, status: true, sellerNote: true, refundedAmount: true, createdAt: true } },
      },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    const waText = this.buildWhatsAppText(order, order.store.name);
    return { ...order, waText };
  }

  // تتبع طلب برقمه (عام — للضيوف) + حالة التقييم الموثّق
  // 🧾 بيانات الفاتورة — للعميل صاحب الطلب أو بائع المتجر أو الإدارة فقط
  async invoice(number: string, user: { sub: string; typ: string }) {
    const order = await this.prisma.order.findUnique({
      where: { number },
      include: {
        items: true,
        store: { select: { id: true, name: true, slug: true, logo: true, phone: true, whatsapp: true, sellerId: true } },
      },
    });
    if (!order) throw new NotFoundException('الفاتورة غير موجودة');
    if (user.typ === 'customer' && order.customerId !== user.sub) throw new ForbiddenException('هذه الفاتورة ليست لك');
    if (user.typ === 'seller' && order.store.sellerId !== user.sub) throw new ForbiddenException('هذه الفاتورة ليست لمتجرك');
    if (user.typ === 'driver') throw new ForbiddenException('الفواتير للعملاء والبائعين والإدارة');

    const payment = await this.prisma.payment.findFirst({
      where: { purpose: 'order', referenceId: order.id },
      orderBy: { createdAt: 'desc' },
      select: { status: true, method: true, number: true },
    });

    const { store, ...rest } = order;
    return {
      ...rest,
      store: { name: store.name, slug: store.slug, logo: store.logo, phone: store.phone || store.whatsapp },
      payment: payment ? { ...payment, method: payment.method?.replace(/^(gateway|store):/, '') } : null,
    };
  }

  // 🔁 إعادة الطلب بضغطة — نفس الأصناف بالأسعار الحالية، مع تخطي النافد
  async reorder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: { items: true, store: { include: { seller: true } } },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (['cancelled', 'refunded'].includes(order.status)) throw new BadRequestException('لا يمكن إعادة طلب ملغي أو مسترجع');
    if (order.store.status !== 'active') throw new BadRequestException('المتجر غير متاح حالياً');

    // الأسعار والتوفر تُعاد قراءتها من قاعدة البيانات الآن (لا نثق بالأرشيف)
    const items: { productId: string; name: string; price: number; qty: number }[] = [];
    const skipped: string[] = [];
    for (const it of order.items) {
      const p = await this.prisma.product.findUnique({ where: { id: it.productId } });
      if (!p || !p.isActive || p.stock <= 0) { skipped.push(it.name); continue; }
      items.push({ productId: p.id, name: p.name, price: Number(p.salePrice || p.price), qty: Math.min(it.qty, p.stock, 99) });
    }
    if (!items.length) throw new BadRequestException('كل أصناف الطلب السابق غير متوفرة حالياً');

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const deliveryFee = Number(order.deliveryFee || 0);
    const number = 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase();

    const newOrder = await this.prisma.order.create({
      data: {
        number, storeId: order.storeId, customerId,
        customerName: order.customerName, customerPhone: order.customerPhone,
        address: order.address, notes: order.notes,
        subtotal, deliveryFee, total: subtotal + deliveryFee,
        paymentMethod: order.paymentMethod, deliveryMethod: order.deliveryMethod,
        items: { create: items },
      },
      include: { items: true },
    });

    // خصم المخزون
    for (const i of items) {
      await this.prisma.product.update({ where: { id: i.productId }, data: { stock: { decrement: i.qty } } });
    }

    // 🔔 تنبيه البائع والعميل
    await this.notifications.push('seller', order.store.sellerId, {
      icon: '🔁',
      title: `إعادة طلب ${newOrder.number}`,
      body: `${order.customerName} أعاد طلبه السابق — ${Number(newOrder.total).toLocaleString()} ر.ي`,
      link: '/seller/orders',
    });
    await this.notifications.push('customer', customerId, {
      icon: '🔁',
      title: `أُعيد طلبك بنجاح ${newOrder.number}`,
      body: `${order.store.name} — تابع حالته من صفحة التتبع`,
      link: `/track?number=${newOrder.number}&phone=${encodeURIComponent(newOrder.customerPhone)}`,
    });

    return {
      ok: true,
      order: { id: newOrder.id, number: newOrder.number, total: Number(newOrder.total) },
      skipped, // أصناف لم تعد متوفرة — تُعرض للعميل بشفافية
    };
  }

  async track(number: string, phone: string) {
    const order = await this.prisma.order.findFirst({
      where: { number: number.toUpperCase(), customerPhone: phone },
      include: {
        items: true,
        store: { select: { name: true, slug: true, whatsapp: true } },
        returns: { orderBy: { createdAt: 'desc' as const }, select: { id: true, reason: true, status: true, sellerNote: true, refundedAmount: true, createdAt: true } },
        // 📍 السائق المسند — موقعه المباشر إن كان يشاركه حديثاً
        driver: { select: { name: true, vehicle: true, phone: true, lat: true, lng: true, locationAt: true } },
      },
    });
    if (!order) throw new NotFoundException('لم يُعثر على الطلب — تأكد من الرقم والجوال');
    const review = await this.prisma.review.findFirst({
      where: { orderId: order.id },
      select: { rating: true, comment: true },
    });

    // 📍 تتبع حي: موقع السائق يظهر فقط أثناء الطلب النشط وإن حُدّث خلال ساعتين
    let driverLive: any = null;
    const d: any = (order as any).driver;
    const active = ['confirmed', 'processing', 'shipped'].includes(order.status);
    if (d && active && d.lat != null && d.lng != null && d.locationAt && Date.now() - new Date(d.locationAt).getTime() < 2 * 60 * 60_000) {
      let distanceKm: number | null = null;
      if ((order as any).customerLat != null && (order as any).customerLng != null) {
        distanceKm = Math.round(haversineKm(d.lat, d.lng, (order as any).customerLat, (order as any).customerLng) * 10) / 10;
      }
      driverLive = {
        name: d.name,
        vehicle: d.vehicle,
        lat: d.lat,
        lng: d.lng,
        updatedAt: d.locationAt,
        distanceKm,
        mapsUrl: `https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=15/${d.lat}/${d.lng}`,
      };
    }

    return {
      ...order,
      driver: order.driver ? { name: order.driver.name, vehicle: order.driver.vehicle } : null, // بلا موقع خام في الرد
      driverLive,
      waText: this.buildWhatsAppText(order, order.store.name),
      review: review || null,
      canReview: ['completed', 'delivered'].includes(order.status) && !review,
    };
  }

  // ── البائع: قائمة طلبات متجره ──
  async sellerOrders(sellerId: string, status?: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    return this.prisma.order.findMany({
      where: {
        storeId: store.id,
        ...(status && status !== 'all' ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true, driver: { select: { name: true, phone: true } } },
      take: 100,
    }).then(async (orders) => {
      // 💳 إرفاق حالة الدفع لكل طلب — إثباتات التحويل تُراجع من هنا
      const ids = orders.map((o) => o.id);
      if (!ids.length) return orders;
      const payments = await this.prisma.payment.findMany({
        where: { purpose: 'order', referenceId: { in: ids } },
        select: { referenceId: true, status: true, proofImage: true, method: true },
        orderBy: { createdAt: 'desc' },
      });
      const byOrder = new Map(payments.map((p) => [p.referenceId, p]));
      return orders.map((o) => ({ ...o, payment: byOrder.get(o.id) || null }));
    });
  }

  // ── البائع: دورة الطلب الكاملة — من التأكيد حتى التسليم والإتمام ──
  async sellerUpdateStatus(sellerId: string, orderId: string, status: string) {
    const allowed = ['confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (!allowed.includes(status)) throw new BadRequestException('حالة غير مسموحة للبائع');
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, storeId: store.id } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (['completed', 'cancelled'].includes(order.status)) throw new BadRequestException('الطلب مُنهى — لا يمكن تغيير حالته');
    // الإلغاء متاح قبل الشحن فقط — بعد الشحن الطلب مسؤولية ميدانية
    if (status === 'cancelled' && ['shipped', 'delivered'].includes(order.status)) {
      throw new BadRequestException('الطلب خرج للتوصيل — لا يمكن إلغاؤه الآن');
    }

    // إلغاء الطلب: إرجاع المخزون
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const items = await this.prisma.orderItem.findMany({ where: { orderId: order.id } });
      for (const it of items) {
        await this.prisma.product.update({ where: { id: it.productId }, data: { stock: { increment: it.qty } } });
      }
    }

    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { status: status as any } });

    // 🤝 خصم عمولة المنصة تلقائياً عند التسليم/الاكتمال (مرة واحدة)
    if (status === 'delivered' || status === 'completed') {
      await this.finance.chargeCommissionForOrder(orderId).catch(() => {});
    }

    // 📨 إشعار العميل بتحديث الحالة
    const statusAr: Record<string, string> = {
      confirmed: 'مؤكد ✅', processing: 'قيد التجهيز 📦', shipped: 'في الطريق إليك 🛵',
      delivered: 'سُلّم — بانتظار تأكيدك 📦', completed: 'مكتمل 🎉', cancelled: 'ملغي ❌',
    };
    await this.messaging.send('order_status', order.customerPhone, {
      name: order.customerName, number: order.number,
      status: statusAr[status] || status, store: store.name,
    });

    // 🔔 تنبيه داخلي للعميل بتغيّر الحالة — يصله حتى دون قنوات مراسلة مفعّلة
    if (order.customerId) {
      const icons: Record<string, string> = { confirmed: '✅', processing: '📦', shipped: '🛵', delivered: '📬', completed: '🎉', cancelled: '❌' };
      // 📨 قالب المتجر المخصص إن وُجد — متغيرات: {name} {number} {store}
      const customTpl = ((store.messageTemplates as any) || {})[status];
      const renderTpl = (t: string) => t
        .replace(/\{name\}/g, order.customerName)
        .replace(/\{number\}/g, order.number)
        .replace(/\{store\}/g, store.name);
      await this.notifications.push('customer', order.customerId, {
        icon: icons[status] || '🔔',
        title: `طلبك ${order.number} أصبح: ${statusAr[status] || status}`,
        body: customTpl
          ? renderTpl(customTpl)
          : status === 'completed'
            ? `اكتمل طلبك من ${store.name} — قيّم تجربتك من صفحة التتبع ⭐`
            : `من متجر ${store.name} — اضغط لتتبع طلبك`,
        link: `/track?number=${order.number}&phone=${encodeURIComponent(order.customerPhone)}`,
      });
    }
    return updated;
  }

  // ── 🖨️ بوالص الشحن — فردية أو جماعية (ملكية المتجر مفروضة) ──
  async sellerSlips(sellerId: string, ids: string[]) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const orders = await this.prisma.order.findMany({
      where: { storeId: store.id, id: { in: ids.slice(0, 20) } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return {
      store: { name: store.name, phone: store.phone || store.whatsapp, logo: store.logo },
      orders,
    };
  }

  // ── 💳 البائع يراجع إثبات دفع طلبه (طرق المتجر الخاصة) ──
  async sellerReviewPayment(sellerId: string, orderId: string, approve: boolean) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, storeId: store.id } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    const payment = await this.prisma.payment.findFirst({
      where: { referenceId: order.id, purpose: 'order', status: 'pending' },
    });
    if (!payment) throw new NotFoundException('لا يوجد إثبات دفع معلق لهذا الطلب');

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: approve ? 'approved' : 'rejected', reviewedBy: `seller:${sellerId}`, reviewedAt: new Date() },
    });

    // 🔔 تنبيه العميل بنتيجة المراجعة
    if (order.customerId) {
      await this.notifications.push('customer', order.customerId, {
        icon: approve ? '💳' : '⚠️',
        title: approve ? `✅ قُبل إثبات دفعك للطلب ${order.number}` : `⚠️ إثبات الدفع للطلب ${order.number} يحتاج مراجعة`,
        body: approve
          ? `أكّد ${store.name} استلام المبلغ — طلبك قيد المتابعة`
          : `تواصل مع ${store.name} لتصحيح إثبات التحويل`,
        link: `/track?number=${order.number}&phone=${encodeURIComponent(order.customerPhone)}`,
      });
    }
    return updated;
  }
}
