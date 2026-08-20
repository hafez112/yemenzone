import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// 🎁 نظام الإحالة بالنقاط — الإعدادات من إدارة المنصة وحدها (Setting key: referral)
export interface ReferralConfig {
  active: boolean;
  pointsReferrer: number;   // نقاط صاحب الدعوة
  pointsReferred: number;   // نقاط العضو الجديد
  pointValueYER: number;    // قيمة النقطة بالريال عند الاستبدال
  maxDiscountPct: number;   // أقصى نسبة خصم من سعر خدمة المنصة
}

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  active: true,
  pointsReferrer: 50,
  pointsReferred: 25,
  pointValueYER: 10,
  maxDiscountPct: 50,
};

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async config(): Promise<ReferralConfig> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'referral' } });
    return { ...DEFAULT_REFERRAL_CONFIG, ...((row?.value as any) || {}) };
  }

  async saveConfig(body: any) {
    const clean: ReferralConfig = {
      active: !!body.active,
      pointsReferrer: Math.max(0, Math.min(10000, Number(body.pointsReferrer) || 0)),
      pointsReferred: Math.max(0, Math.min(10000, Number(body.pointsReferred) || 0)),
      pointValueYER: Math.max(0, Math.min(1000, Number(body.pointValueYER) || 0)),
      maxDiscountPct: Math.max(0, Math.min(100, Number(body.maxDiscountPct) || 0)),
    };
    await this.prisma.setting.upsert({
      where: { key: 'referral' },
      update: { value: clean as any },
      create: { key: 'referral', value: clean as any, group: 'general' },
    });
    return clean;
  }

  // منح النقاط للطرفين عند تسجيل عضو جديد برمز إحالة — تُستدعى من المصادقة
  async applyReferral(referredId: string, refCode: string) {
    const cfg = await this.config();
    if (!cfg.active) return { applied: false, reason: 'النظام متوقف' };
    const code = String(refCode || '').trim();
    if (!code) return { applied: false };

    const referrer = await this.prisma.customer.findUnique({ where: { referralCode: code } });
    if (!referrer || referrer.id === referredId) return { applied: false, reason: 'رمز غير صالح' };

    const referred = await this.prisma.customer.findUnique({ where: { id: referredId } });
    if (!referred || referred.referredById) return { applied: false, reason: 'مسجل مسبقاً' };

    await this.prisma.$transaction([
      this.prisma.customer.update({ where: { id: referredId }, data: { referredById: referrer.id } }),
      this.prisma.referral.create({
        data: { referrerId: referrer.id, referredId, pointsGiven: cfg.pointsReferrer + cfg.pointsReferred },
      }),
      this.prisma.customer.update({ where: { id: referrer.id }, data: { points: { increment: cfg.pointsReferrer } } }),
      this.prisma.customer.update({ where: { id: referredId }, data: { points: { increment: cfg.pointsReferred } } }),
      this.prisma.pointsTransaction.create({
        data: { customerId: referrer.id, points: cfg.pointsReferrer, reason: `🎁 دعوت ${referred.name} للمنصة` },
      }),
      this.prisma.pointsTransaction.create({
        data: { customerId: referredId, points: cfg.pointsReferred, reason: `🎁 انضممت بدعوة من ${referrer.name}` },
      }),
    ]);

    // 🔔 تنبيه الطرفين
    this.notifications.push('customer', referrer.id, {
      icon: '🎁', title: `انضم ${referred.name} بدعوتك!`,
      body: `أُضيفت ${cfg.pointsReferrer} نقطة لرصيدك — استبدلها بخصومات خدمات المنصة`,
      link: '/customer?tab=points',
    }).catch(() => {});
    this.notifications.push('customer', referredId, {
      icon: '🎁', title: 'هدية الانضمام وصلت',
      body: `أُضيفت ${cfg.pointsReferred} نقطة لحسابك بدعوة من ${referrer.name}`,
      link: '/customer?tab=points',
    }).catch(() => {});

    return { applied: true, referrerName: referrer.name };
  }

  // لوحة العميل: رصيده + رمزه + سجل النقاط + إحصاء إحالاته
  async my(customerId: string) {
    const [customer, history, invitedCount, cfg] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: customerId }, select: { points: true, referralCode: true, name: true } }),
      this.prisma.pointsTransaction.findMany({
        where: { customerId }, orderBy: { createdAt: 'desc' }, take: 30,
      }),
      this.prisma.referral.count({ where: { referrerId: customerId } }),
      this.config(),
    ]);
    return {
      points: customer?.points || 0,
      referralCode: customer?.referralCode,
      invitedCount,
      history,
      config: {
        active: cfg.active, pointsReferrer: cfg.pointsReferrer,
        pointValueYER: cfg.pointValueYER, maxDiscountPct: cfg.maxDiscountPct,
      },
    };
  }

  // صرف النقاط كخصم على طلب خدمة منصة — يُستدعى عند إنشاء الطلب
  // يعيد {pointsUsed, discount} ويخصم الرصيد فوراً (يُسترد عند رفض الطلب)
  async redeemForServiceOrder(phone: string, servicePrice: number, orderId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { phone: phone.trim() } });
    if (!customer || customer.points <= 0) throw new BadRequestException('لا يوجد رصيد نقاط لهذا الرقم');

    const cfg = await this.config();
    if (!cfg.active || cfg.pointValueYER <= 0) throw new BadRequestException('استبدال النقاط متوقف حالياً');

    const maxDiscount = Math.floor(servicePrice * (cfg.maxDiscountPct / 100));
    const affordable = customer.points * cfg.pointValueYER;
    const discount = Math.min(maxDiscount, affordable);
    if (discount <= 0) throw new BadRequestException('النقاط لا تغطي أي خصم على هذه الخدمة');

    const pointsUsed = Math.ceil(discount / cfg.pointValueYER);
    const realDiscount = pointsUsed * cfg.pointValueYER;

    await this.prisma.$transaction([
      this.prisma.customer.update({ where: { id: customer.id }, data: { points: { decrement: pointsUsed } } }),
      this.prisma.pointsTransaction.create({
        data: { customerId: customer.id, points: -pointsUsed, reason: '💸 خصم على طلب خدمة منصة', refId: orderId },
      }),
    ]);
    return { pointsUsed, discount: realDiscount };
  }

  // استرداد النقاط عند رفض طلب الخدمة
  async refundForServiceOrder(orderId: string, pointsUsed: number, phone: string) {
    if (pointsUsed <= 0) return;
    const customer = await this.prisma.customer.findUnique({ where: { phone: phone.trim() } });
    if (!customer) return;
    // لا نسترد مرتين — نتحقق من عدم وجود حركة استرداد سابقة لنفس الطلب
    const already = await this.prisma.pointsTransaction.findFirst({
      where: { refId: orderId, points: { gt: 0 }, reason: { contains: 'استرداد' } },
    });
    if (already) return;
    await this.prisma.$transaction([
      this.prisma.customer.update({ where: { id: customer.id }, data: { points: { increment: pointsUsed } } }),
      this.prisma.pointsTransaction.create({
        data: { customerId: customer.id, points: pointsUsed, reason: '↩️ استرداد نقاط طلب مرفوض', refId: orderId },
      }),
    ]);
    this.notifications.push('customer', customer.id, {
      icon: '↩️', title: 'استعدت نقاطك',
      body: `رُفض طلب الخدمة وعادت ${pointsUsed} نقطة لرصيدك`,
      link: '/customer?tab=points',
    }).catch(() => {});
  }

  // ═══ الإدارة ═══
  async adminOverview() {
    const [cfg, totalReferrals, totalPointsGiven, recent, top] = await Promise.all([
      this.config(),
      this.prisma.referral.count(),
      this.prisma.pointsTransaction.aggregate({ _sum: { points: true }, where: { points: { gt: 0 } } }),
      this.prisma.referral.findMany({
        orderBy: { createdAt: 'desc' }, take: 30,
        include: {
          referrer: { select: { name: true, phone: true } },
          referred: { select: { name: true, phone: true } },
        },
      }),
      this.prisma.referral.groupBy({
        by: ['referrerId'], _count: { _all: true },
        orderBy: { _count: { referrerId: 'desc' } }, take: 10,
      }),
    ]);
    const topIds = top.map((t) => t.referrerId);
    const topUsers = await this.prisma.customer.findMany({
      where: { id: { in: topIds } }, select: { id: true, name: true, phone: true, points: true },
    });
    return {
      config: cfg,
      stats: {
        totalReferrals,
        totalPointsGiven: totalPointsGiven._sum.points || 0,
        customersWithPoints: await this.prisma.customer.count({ where: { points: { gt: 0 } } }),
      },
      recent,
      top: top.map((t) => ({
        ...topUsers.find((u) => u.id === t.referrerId),
        invited: t._count._all,
      })),
    };
  }
}
