import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { StoreTypesService } from './store-types.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';

// إدارة أنواع المتاجر — صلاحية «المتاجر»
@Controller('admin/store-types')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('stores'))
export class StoreTypesController {
  constructor(private storeTypes: StoreTypesService) {}

  @Get()
  list() {
    return this.storeTypes.list();
  }

  // 🤖 توليد ذكي: الاسم → إعداد كامل مقترح (معاينة قبل الحفظ)
  @Post('ai-generate')
  aiGenerate(@Body() body: { name: string }) {
    return this.storeTypes.aiGenerate(body.name);
  }

  @Post()
  create(@Body() body: any) {
    return this.storeTypes.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.storeTypes.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storeTypes.remove(id);
  }
}
