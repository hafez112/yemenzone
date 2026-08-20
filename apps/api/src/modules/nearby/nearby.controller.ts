import { Controller, Get, Header, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NearbyAiService } from './nearby-ai.service';
import { CacheService } from '../../common/cache.service';

// المتاجر القريبة — عام
@Controller('v1/stores')
export class NearbyController {
  constructor(private prisma: PrismaService, private ai: NearbyAiService, private cache: CacheService) {}

  @Get('nearby')
  @Header('Cache-Control', 'private, max-age=15')
  async nearby(
    @Query('lat') lat?: string, @Query('lng') lng?: string,
    @Query('gov') gov?: string, @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const userLat = lat !== undefined ? Number(lat) : null;
    const userLng = lng !== undefined ? Number(lng) : null;
    const hasLocation = userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng);

    // ⚡ قائمة المتاجر ثابتة لكل فلتر — تُخزّن 30 ثانية، والمسافة تُحسب لكل طلب على حدة
    const stores = await this.cache.wrap(`nearby:${gov || ''}:${type || ''}`, 30, () =>
      this.prisma.store.findMany({
        where: {
          status: 'active',
          ...(gov ? { governorate: gov } : {}),
          ...(type ? { type: { kind: type as any } } : {}),
        },
        select: {
          id: true, name: true, slug: true, logo: true, cover: true, description: true,
          governorate: true, city: true, lat: true, lng: true,
          ratingAvg: true, ratingCount: true, smartScore: true, isVerified: true, likesCount: true,
          type: { select: { nameAr: true, icon: true, kind: true } },
        },
        take: 200,
      })
    );

    // حساب المسافة والدرجة ثم الترتيب الذكي — دقة 10 أمتار (خانتان عشريتان)
    const enriched = stores.map((s) => {
      const dist = hasLocation && s.lat !== null && s.lng !== null
        ? Math.round(this.ai.distanceKm(userLat!, userLng!, s.lat, s.lng) * 100) / 100
        : null;
      const recScore = this.ai.recommendScore(s, dist);
      return { ...s, distanceKm: dist, recScore };
    });
    enriched.sort((a, b) => b.recScore - a.recScore);

    const take = Math.min(Number(limit) || 30, 60);
    const result = enriched.slice(0, take);
    const badgeMap = this.ai.badges(result);
    return {
      stores: result.map((s) => ({ ...s, badge: badgeMap.get(s.id) || null })),
      hasLocation,
      tips: this.ai.tips(result, hasLocation, gov),
    };
  }
}
