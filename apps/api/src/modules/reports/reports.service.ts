import { Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { trendOf, stockLevel } from '../../libs/ai';

// ═══════════════════════════════════════════════════════════════
//  📊 التقارير الأسبوعية الذكية
//  كل أسبوع (يوم وساعة يحددهما المدير) يصل كل بائع تقرير عربي
//  مبسّط: طلباته ومبيعاته ونموّه وأفضل منتجاته وتنبيهات المخزون
//  — والإدارة تحصل على ملخص شامل لأداء المنصة كاملة.
//  الذكاء محلي بالكامل (libs/ai) — لا يحتاج أي خدمة خارجية.
// ═══════════════════════════════════════════════════════════════

const SETTINGS_KEY = 'reports.config';
const DEFAULTS = { enabled: true, day: 6, hour: 9 }; // السبت 9 صباحاً بتوقيت عدن

@Injectable()
export class ReportsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('WeeklyReports');
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ⏰ مؤقّت خفيف يفحص كل دقيقة: هل حان موعد التقرير؟
  onModuleInit() {
    this.timer = setInterval(() => this.tick().catch(() => {}), 60_000);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async getConfig() {
    const row = await this.prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    const saved = (row?.value as any) || {};
    return { ...DEFAULTS, ...saved };
  }

  async saveConfig(body: { enabled?: boolean; day?: number; hour?: number }) {
    const cur = await this.getConfig();
    const next = {
      enabled: typeof body.enabled === 'boolean' ? body.enabled : cur.enabled,
      day: Number.isInteger(body.day) && body.day! >= 0 && body.day! <= 6 ? body.day! : cur.day,
      hour: Number.isInteger(body.hour) && body.hour! >= 0 && body.hour! <= 23 ? body.hour! : cur.hour,
    };
    await this.prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: next },
      create: { group: 'general', key: SETTINGS_KEY, value: next },
    });
    return next;
  }

  // 🕐 الوقت الحالي بتوقيت عدن (UTC+3) — المنصة يمنية فلا نعتمد توقيت الخادم
  private adenNow() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Aden', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hour12: false, weekday: 'short',
    }).formatToParts(new Date());
    const get = (t: string) => parts.find(p => p.type === t)?.value || '';
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      day: dayMap[get('weekday')] ?? 0,
      hour: parseInt(get('hour'), 10) || 0,
      key: `${get('year')}-${get('month')}-${get('day')}`,
    };
  }

  private async tick() {
    const cfg = await this.getConfig();
    if (!cfg.enabled) return;
    const now = this.adenNow();
    if (now.day !== cfg.day || now.hour !== cfg.hour) return;
    const lastRow = await this.prisma.setting.findUnique({ where: { key: 'reports.lastRun' } });
    if ((lastRow?.value as any)?.date === now.key) return; // أُرسل اليوم بالفعل
    await this.prisma.setting.upsert({
      where: { key: 'reports.lastRun' },
      update: { value: { date: now.key } },
      create: { group: 'general', key: 'reports.lastRun', value: { date: now.key } },
    });
    const sent = await this.sendWeeklyReports();
    this.logger.log(`📊 أُرسلت التقارير الأسبوعية إلى ${sent} بائعاً`);
  }

  // ═══ بناء تقرير بائع واحد — آخر 7 أيام مقابل الـ7 قبلها ═══
  async buildSellerReport(storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId }, include: { type: true } });
    if (!store) throw new NotFoundException('المتجر غير موجود');

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const curSince = new Date(now - weekMs);
    const prevSince = new Date(now - 2 * weekMs);
    const kind = store.type?.kind || 'products';

    // الطلبات (جدول الطلبات العام — لكل الأنشطة)
    const [curOrders, prevOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: { storeId, createdAt: { gte: curSince }, status: { notIn: ['cancelled', 'refunded'] } },
        select: { total: true },
      }),
      this.prisma.order.findMany({
        where: { storeId, createdAt: { gte: prevSince, lt: curSince }, status: { notIn: ['cancelled', 'refunded'] } },
        select: { total: true },
      }),
    ]);
    const curTotal = curOrders.reduce((s, o) => s + Number(o.total), 0);
    const prevTotal = prevOrders.reduce((s, o) => s + Number(o.total), 0);
    const growth = prevTotal > 0 ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : (curTotal > 0 ? 100 : null);

    // الحجوزات — كل نشاط له جدوله
    let curBookings = 0;
    if (kind === 'hotel') {
      curBookings = await this.prisma.roomBooking.count({ where: { room: { storeId }, createdAt: { gte: curSince } } });
    } else if (kind === 'rentals') {
      curBookings = await this.prisma.rentalBooking.count({ where: { unit: { storeId }, createdAt: { gte: curSince } } });
    } else if (kind === 'services') {
      curBookings = await this.prisma.serviceRequest.count({ where: { service: { storeId }, createdAt: { gte: curSince } } });
    }

    // 🏆 الأكثر مبيعاً هذا الأسبوع
    const topRaw = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { storeId, createdAt: { gte: curSince }, status: { notIn: ['cancelled', 'refunded'] } } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 3,
    });
    const topIds = topRaw.map(t => t.productId);
    const topNames = topIds.length
      ? await this.prisma.product.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true } })
      : [];
    const topProducts = topRaw.map(t => ({
      name: topNames.find(p => p.id === t.productId)?.name || 'منتج',
      qty: t._sum.qty || 0,
    }));

    // ⚠️ مخزون منخفض (3 قطع أو أقل)
    const lowStock = await this.prisma.product.findMany({
      where: { storeId, isActive: true, stock: { lte: 3 } },
      select: { name: true, stock: true },
      orderBy: { stock: 'asc' },
      take: 5,
    });

    // ⭐ التقييمات الجديدة
    const newReviews = await this.prisma.review.count({ where: { storeId, createdAt: { gte: curSince } } });

    // 💡 نصيحة ذكية مبنية على الاتجاه
    const trend = trendOf(growth);
    let advice: string;
    if (trend === 'rising') advice = 'أداؤك في صعود 📈 — حافظ على توفر المنتجات الأكثر طلباً وجرّب عرضاً للعملاء الجدد';
    else if (trend === 'falling') advice = 'المبيعات أقل من الأسبوع الماضي — جرّب كوبون خصم أو حدّث صور منتجاتك وشارك رابط متجرك';
    else if (curOrders.length === 0 && curBookings === 0) advice = 'لا طلبات هذا الأسبوع — شارك رابط متجرك في واتساب ومجموعات مدينتك لتصل لعملاء جدد';
    else advice = 'أداء مستقر — أضف منتجات جديدة أو فعّل عروضاً لتحفيز النمو';

    const fmt = (n: number) => n.toLocaleString('en-US');
    const growthTxt = growth === null ? '—' : `${growth > 0 ? '+' : ''}${growth}%`;
    const trendIcon = trend === 'rising' ? '📈' : trend === 'falling' ? '📉' : '➖';

    const lines = [
      `🛒 الطلبات: ${curOrders.length} (الأسبوع الماضي: ${prevOrders.length})`,
      `💰 المبيعات: ${fmt(curTotal)} ريال — النمو: ${growthTxt} ${trendIcon}`,
    ];
    if (curBookings > 0) lines.push(`📅 الحجوزات: ${curBookings}`);
    if (topProducts.length) lines.push(`🏆 الأكثر مبيعاً: ${topProducts.map(p => `${p.name} (${p.qty})`).join('، ')}`);
    if (lowStock.length) lines.push(`⚠️ مخزون منخفض: ${lowStock.map(p => `${p.name} (${p.stock})`).join('، ')}`);
    if (newReviews > 0) lines.push(`⭐ تقييمات جديدة: ${newReviews} — متوسط متجرك ${store.ratingAvg.toFixed(1)}`);
    lines.push(`💡 ${advice}`);

    return {
      storeName: store.name,
      period: { from: curSince.toISOString(), to: new Date(now).toISOString() },
      orders: { count: curOrders.length, prevCount: prevOrders.length, total: curTotal, prevTotal, growth },
      bookings: curBookings,
      topProducts,
      lowStock: lowStock.map(p => ({ ...p, level: stockLevel(p.stock) })),
      newReviews,
      ratingAvg: store.ratingAvg,
      advice,
      message: lines.join('\n'),
    };
  }

  // 📬 إرسال التقرير لكل البائعين (المتاجر النشطة فقط)
  async sendWeeklyReports() {
    const stores = await this.prisma.store.findMany({
      where: { status: 'active' },
      select: { id: true, sellerId: true, pausedAt: true },
    });
    let sent = 0;
    for (const s of stores) {
      try {
        const r = await this.buildSellerReport(s.id);
        const firstLines = r.message.split('\n').slice(0, 2).join(' — ');
        await this.notifications.push('seller', s.sellerId, {
          icon: '📊',
          title: 'تقريرك الأسبوعي جاهز',
          body: firstLines,
          link: '/seller/reports',
        });
        sent++;
      } catch { /* متجر بلا بيانات — نتجاوزه */ }
    }
    return sent;
  }

  // تقرير البائع الحالي (لصفحة /seller/reports — يُبنى عند الطلب)
  async weeklyForSeller(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId } });
    if (!store) throw new NotFoundException('لا يوجد متجر — أنشئ متجرك أولاً');
    return this.buildSellerReport(store.id);
  }

  // ═══ ملخص المنصة الأسبوعي للإدارة ═══
  async platformDigest() {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - weekMs);
    const [newStores, totalStores, newCustomers, orders, openTickets, suggestions, topStores] = await Promise.all([
      this.prisma.store.count({ where: { createdAt: { gte: since } } }),
      this.prisma.store.count({ where: { status: 'active' } }),
      this.prisma.customer.count({ where: { createdAt: { gte: since } } }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: since }, status: { notIn: ['cancelled', 'refunded'] } },
        select: { total: true, storeId: true },
      }),
      this.prisma.supportTicket.count({ where: { status: 'open' } }),
      this.prisma.supportTicket.count({ where: { category: 'suggestion', ideaStatus: 'new' } }),
      this.prisma.order.groupBy({
        by: ['storeId'],
        where: { createdAt: { gte: since }, status: { notIn: ['cancelled', 'refunded'] } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);
    const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const storeNames = topStores.length
      ? await this.prisma.store.findMany({ where: { id: { in: topStores.map(t => t.storeId) } }, select: { id: true, name: true } })
      : [];
    return {
      period: { from: since.toISOString(), to: new Date().toISOString() },
      newStores,
      totalStores,
      newCustomers,
      ordersCount: orders.length,
      revenue,
      openTickets,
      newSuggestions: suggestions,
      topStores: topStores.map(t => ({
        name: storeNames.find(s => s.id === t.storeId)?.name || 'متجر',
        orders: t._count.id,
      })),
    };
  }
}
