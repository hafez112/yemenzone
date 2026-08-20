import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RecoService } from './reco.service';

// 🧠 التوصيات — عامة
@Controller('v1/reco')
export class RecoController {
  constructor(private svc: RecoService) {}

  @Get('related/:productId')
  related(@Param('productId') productId: string, @Query('take') take: string) {
    return this.svc.related(productId, Math.min(12, Number(take) || 8));
  }

  @Post('by-ids')
  byIds(@Body() body: any) {
    return this.svc.byIds(Array.isArray(body.ids) ? body.ids : []);
  }

  @Get('trending')
  trending(@Query('take') take: string) {
    return this.svc.trending(Math.min(16, Number(take) || 8));
  }
}
