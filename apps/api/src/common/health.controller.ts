import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from './cache.service';
import { QueueService } from './queue.service';
import { AuthGuard, RolesGuard } from './guards/auth.guard';
import { PermsGuard } from './guards/admin-perms.guard';
import { CurrentUser } from './decorators';

const BOOT = Date.now();

// 🩺 صحة المنصة — عامة بسيطة + مقاييس تفصيلية للإدارة
@Controller('v1')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private queue: QueueService,
  ) {}

  // فحص حي عام — يستخدمه Caddy/المراقبة الخارجية وأدوات uptime
  @Get('health')
  async health() {
    const t0 = Date.now();
    let db = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {}
    return {
      ok: db,
      db,
      dbLatencyMs: Date.now() - t0,
      uptimeSec: Math.round((Date.now() - BOOT) / 1000),
      time: new Date().toISOString(),
    };
  }

  // 📊 مقاييس تشغيلية تفصيلية — الإدارة فقط (صلاحية النظام)
  @Get('admin/system/metrics')
  @UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('system'))
  async metrics(@CurrentUser() u: any) {
    const t0 = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const mem = process.memoryUsage();
    const [sellers, customers, products, orders] = await Promise.all([
      this.prisma.seller.count(),
      this.prisma.customer.count(),
      this.prisma.product.count(),
      this.prisma.order.count(),
    ]);
    return {
      uptimeSec: Math.round((Date.now() - BOOT) / 1000),
      dbLatencyMs: Date.now() - t0,
      node: process.version,
      memory: {
        rssMB: Math.round(mem.rss / 1048576),
        heapMB: Math.round(mem.heapUsed / 1048576),
      },
      cache: this.cache.stats(),
      queues: this.queue.stats(),
      totals: { sellers, customers, products, orders },
    };
  }
}
