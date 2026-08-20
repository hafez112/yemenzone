import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';

// 🗂️ مدير ملفات المنصة — رفع/تنظيم/حذف كل ملفات المنصة مع سجل قاعدة بيانات
@Controller('admin/files')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('files'))
export class FilesController {
  constructor(private svc: FilesService) {}

  @Get()
  list(@Query('folder') folder = '', @Query('q') q?: string) {
    return this.svc.list(folder, q);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(@UploadedFile() file: Express.Multer.File, @Body('folder') folder: string, @CurrentUser() u: any) {
    return this.svc.upload(file, folder || '', u.sub);
  }

  @Patch(':id/rename')
  rename(@Param('id') id: string, @Body() body: { name: string }) {
    return this.svc.rename(id, body.name || '');
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() body: { folder: string }) {
    return this.svc.move(id, body.folder || '');
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.remove(id, u.sub);
  }
}
