import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import { ApiKeyGuard } from './api-key.guard';
import { PublicApiService } from './public-api.service';

// ═══ البائع: إدارة مفاتيحه واستخدامه ═══
@Controller('seller/api')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerApiController {
  constructor(private svc: PublicApiService) {}

  @Get('keys') keys(@CurrentUser() u: any) { return this.svc.myKeys(u.sub); }
  @Post('keys') create(@CurrentUser() u: any, @Body() body: any) { return this.svc.createKey(u.sub, body); }
  @Patch('keys/:id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.updateKey(u.sub, id, body); }
  @Delete('keys/:id') revoke(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.revokeKey(u.sub, id); }
  @Get('usage') usage(@CurrentUser() u: any) { return this.svc.usage(u.sub); }
}

// ═══ API العام للمطورين — يتطلب مفتاح API ═══
@Controller('open-api/v1')
export class OpenApiController {
  constructor(private svc: PublicApiService) {}

  @UseGuards(ApiKeyGuard())
  @Get('ping')
  ping(@Req() req: any) {
    return { ok: true, store: req.apiStore.name, keyPrefix: req.apiKey.prefix, time: new Date().toISOString() };
  }

  @UseGuards(ApiKeyGuard('store:read'))
  @Get('store')
  store(@Req() req: any) { return this.svc.storeInfo(req.apiStore); }

  @UseGuards(ApiKeyGuard('products:read'))
  @Get('products')
  products(@Req() req: any, @Query() q: any) { return this.svc.listProducts(req.apiStore, q); }

  @UseGuards(ApiKeyGuard('products:read'))
  @Get('products/:id')
  product(@Req() req: any, @Param('id') id: string) { return this.svc.productDetails(req.apiStore, id); }

  @UseGuards(ApiKeyGuard('orders:write'))
  @Post('orders')
  createOrder(@Req() req: any, @Body() body: any) { return this.svc.createOrder(req.apiStore, body); }

  @UseGuards(ApiKeyGuard('orders:read'))
  @Get('orders/track')
  track(@Req() req: any, @Query('number') number: string, @Query('phone') phone: string) {
    return this.svc.trackOrder(req.apiStore, number, phone);
  }
}
