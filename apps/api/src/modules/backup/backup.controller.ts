import { Body, Controller, Delete, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { AuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { PermsGuard } from '../../common/guards/admin-perms.guard';
import { CurrentUser } from '../../common/decorators';
import { BackupService } from './backup.service';
import type { Response } from 'express';

// النسخ الاحتياطي — صلاحية security لحساسيته
@Controller('admin/backups')
@UseGuards(AuthGuard, RolesGuard('admin'), PermsGuard('security'))
export class BackupController {
  constructor(private svc: BackupService) {}

  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() body: any) { return this.svc.create(body?.note); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }

  // ♻️ استعادة — تستبدل كل البيانات الحالية بمحتوى النسخة
  @Post(':id/restore') restore(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.restore(id, user?.sub);
  }

  @Get('download/:filename')
  download(@Param('filename') filename: string, @Res() res: Response) {
    const p = this.svc.filePath(filename);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(p);
  }
}
