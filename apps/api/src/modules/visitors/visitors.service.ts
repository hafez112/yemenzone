import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

// 📊 خدمة تتبع الزوار — تسجيل خفيف + إحصائيات لوحة التحكم
@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  // بصمة مجزأة للـ IP — تكفي لعدّ الزوار الفريدين دون تخزين العنوان
  private hashIp(ip?: string) {
    if (!ip) return null;
    return createHash('sha256').update(String(ip)).digest('hex').slice(0, 16);
  }

  private deviceOf(ua: string) {
    if (/ipad|tablet/i.test(ua)) return 'tablet';
    if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  private refOf(ref?: string) {
    if (!ref) return 'direct';
    try {
      const host = new URL(ref).hostname.replace(/^www\./, '');
      if (/google\./.test(host)) return 'google';
      if (/facebook\.|fb\./.test(host)) return 'facebook';
      if (/instagram\./.test(host)) return 'instagram';
      if (/t\.me|telegram/.test(host)) return 'telegram';
      if (/wa\.me|whatsapp/.test(host)) return 'whatsapp';
      if (/twitter\.|x\.com/.test(host)) return 'x';
      if (/yemenzone/.test(host)) return 'internal';
      return host;
    } catch { return 'direct'; }
  }

  // 📝 تسجيل زيارة — يتجاهل البوتات ولوحات التحكم
  async track(body: { path?: string; ref?: string }, ip?: string, ua = '') {
    const path = String(body?.path || '/').slice(0, 200);
    if (/bot|crawl|spider|headless|curl|wget/i.test(ua)) return { ok: false, bot: true };
    if (/^\/(admin|seller|driver|customer|auth|api)/.test(path)) return { ok: false, skipped: true };

    const m = path.match(/^\/store\/([^/?]+)/);
    await this.prisma.pageView.create({
      data: {
        path,
        storeSlug: m ? decodeURIComponent(m[1]).slice(0, 80) : null,
        ipHash: this.hashIp(ip),
        device: this.deviceOf(ua),
        ref: this.refOf(body?.ref),
      },
    });
    return { ok: true };
  }

  // 📈 إحصائيات الزوار للوحة التحكم
  async stats() {
    const now = Date.now();
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(dayStart.getTime() - 86400000);
    const weekAgo = new Date(now - 7 * 86400000);
    const monthAgo = new Date(now - 30 * 86400000);
    const dayAgo = new Date(now - 86400000);

    const countUnique = async (since: Date, until?: Date) => {
      const rows = await this.prisma.pageView.findMany({
        where: { createdAt: { gte: since, ...(until ? { lt: until } : {}) }, ipHash: { not: null } },
        select: { ipHash: true }, distinct: ['ipHash'],
      });
      return rows.length;
    };

    const [today, yesterday, week, month, total, uniqueToday, uniqueWeek, uniqueMonth] = await Promise.all([
      this.prisma.pageView.count({ where: { createdAt: { gte: dayStart } } }),
      this.prisma.pageView.count({ where: { createdAt: { gte: yesterdayStart, lt: dayStart } } }),
      this.prisma.pageView.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.pageView.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.pageView.count(),
      countUnique(dayStart),
      countUnique(weekAgo),
      countUnique(monthAgo),
    ]);

    // 🕐 الزيارات بالساعة — آخر 24 ساعة (للرسم البياني)
    const last24 = await this.prisma.pageView.findMany({
      where: { createdAt: { gte: dayAgo } },
      select: { createdAt: true },
    });
    const hourly = Array.from({ length: 24 }, (_, i) => {
      const hStart = new Date(dayAgo.getTime() + i * 3600000);
      const hEnd = new Date(hStart.getTime() + 3600000);
      return { hour: hStart.getHours(), count: last24.filter((v) => v.createdAt >= hStart && v.createdAt < hEnd).length };
    });

    // 📄 أعلى الصفحات — 30 يوم
    const topPages = await this.prisma.pageView.groupBy({
      by: ['path'], where: { createdAt: { gte: monthAgo } },
      _count: { path: true }, orderBy: { _count: { path: 'desc' } }, take: 10,
    });

    // 🏪 أعلى المتاجر زيارة — 30 يوم
    const topStoreRows = await this.prisma.pageView.groupBy({
      by: ['storeSlug'], where: { createdAt: { gte: monthAgo }, storeSlug: { not: null } },
      _count: { storeSlug: true }, orderBy: { _count: { storeSlug: 'desc' } }, take: 10,
    });
    const storeNames = await this.prisma.store.findMany({
      where: { slug: { in: topStoreRows.map((r) => r.storeSlug!) } },
      select: { slug: true, name: true },
    });
    const nameOf = Object.fromEntries(storeNames.map((s) => [s.slug, s.name]));

    // 📱 الأجهزة + 🌐 المصادر — 30 يوم
    const devices = await this.prisma.pageView.groupBy({
      by: ['device'], where: { createdAt: { gte: monthAgo } }, _count: { device: true },
    });
    const refs = await this.prisma.pageView.groupBy({
      by: ['ref'], where: { createdAt: { gte: monthAgo } },
      _count: { ref: true }, orderBy: { _count: { ref: 'desc' } }, take: 8,
    });

    // 🕒 أحدث الزيارات
    const recent = await this.prisma.pageView.findMany({
      orderBy: { createdAt: 'desc' }, take: 15,
      select: { path: true, device: true, ref: true, createdAt: true, storeSlug: true },
    });

    return {
      totals: { today, yesterday, week, month, total, uniqueToday, uniqueWeek, uniqueMonth },
      hourly,
      topPages: topPages.map((r) => ({ path: r.path, count: r._count.path })),
      topStores: topStoreRows.map((r) => ({ slug: r.storeSlug, name: nameOf[r.storeSlug!] || r.storeSlug, count: r._count.storeSlug })),
      devices: devices.map((r) => ({ device: r.device || 'desktop', count: r._count.device })),
      refs: refs.map((r) => ({ ref: r.ref || 'direct', count: r._count.ref })),
      recent,
    };
  }
}
