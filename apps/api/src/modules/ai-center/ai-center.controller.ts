import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiCenterService } from './ai-center.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { CurrentUser } from '../../common/decorators';

// ═══ إدارة الذكاء الاصطناعي — المدير الخارق أو من يملك صلاحية ai ═══
@Controller('admin/ai')
@UseGuards(AuthGuard, RolesGuard('admin'))
export class AdminAiController {
  constructor(private ai: AiCenterService) {}

  @UseGuards(PermsGuard('ai'))
  @Get('config')
  getConfig() { return this.ai.getConfig(); }

  @UseGuards(PermsGuard('ai'))
  @Put('config')
  updateConfig(@Body() body: any) { return this.ai.updateConfig(body); }

  @UseGuards(PermsGuard('ai'))
  @Get('providers')
  providers() { return this.ai.listProviders(); }

  @UseGuards(PermsGuard('ai'))
  @Post('providers')
  createProvider(@Body() body: any) { return this.ai.createProvider(body); }

  @UseGuards(PermsGuard('ai'))
  @Patch('providers/:id')
  updateProvider(@Param('id') id: string, @Body() body: any) { return this.ai.updateProvider(id, body); }

  @UseGuards(PermsGuard('ai'))
  @Delete('providers/:id')
  deleteProvider(@Param('id') id: string) { return this.ai.deleteProvider(id); }

  @UseGuards(PermsGuard('ai'))
  @Post('providers/:id/test')
  testProvider(@Param('id') id: string) { return this.ai.testProvider(id); }
}

// ═══ أدوات البائع الذكية — وصف مفصّل + فحص سعر + خلفية بيضاء ═══
@Controller('seller/ai')
@UseGuards(AuthGuard, RolesGuard('seller'))
export class SellerAiController {
  constructor(private ai: AiCenterService) {}

  @Post('description')
  description(@Body() body: any) { return this.ai.productDescription(body); }

  @Post('price-check')
  priceCheck(@Body() body: any) { return this.ai.priceCheck(body); }

  @Post('white-bg')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new BadRequestException('صور فقط'), false);
      cb(null, true);
    },
  }))
  whiteBg(@UploadedFile() file: Express.Multer.File) { return this.ai.whiteBackground(file); }

  // ═══ 🤖 الإضافة الذكية للمنتجات — خدمة مدفوعة مرتبطة بالمتجر ═══

  @Get('smart-add/settings')
  smartAddSettings(@CurrentUser() u: any) { return this.ai.smartAddSettings(u.sub); }

  @Post('smart-add/settings')
  saveSmartAddSettings(@CurrentUser() u: any, @Body() body: any) { return this.ai.saveSmartAddSettings(u.sub, body); }

  @UseGuards(RateLimit(10, 60_000, 'smart-add-suggest'))
  @Post('smart-add/suggest')
  smartAddSuggest(@CurrentUser() u: any, @Body() body: any) { return this.ai.suggestProducts(u.sub, body); }

  @UseGuards(RateLimit(20, 60_000, 'smart-add-add'))
  @Post('smart-add/add')
  smartAddAdd(@CurrentUser() u: any, @Body() body: any) { return this.ai.quickAddProduct(u.sub, body); }
}

// ═══ عام — إعداد المساعد ومحادثته (بحد معدل صارم) ═══
@Controller('v1/ai')
export class PublicAiController {
  constructor(private ai: AiCenterService) {}

  @Get('config')
  assistantConfig() { return this.ai.publicAssistantConfig(); }

  @UseGuards(RateLimit(10, 60_000, 'ai-assistant'))
  @Post('assistant')
  assistant(@Body() body: any) { return this.ai.assistantReply(body?.message); }
}
