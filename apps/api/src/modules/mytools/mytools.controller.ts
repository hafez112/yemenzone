import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import { MyToolsService } from './mytools.service';

// 🧰 خدمات المستخدم — تتطلب تسجيل الدخول (عميل أو بائع)
// كل خدمة يضيفها المستخدم لها قاعدة بيانات خاصة به (data) لا يراها غيره
@Controller('v1/my-tools')
@UseGuards(AuthGuard)
export class MyToolsController {
  constructor(private svc: MyToolsService) {}

  @Get()
  list(@CurrentUser() u: any) { return this.svc.list(u.typ, u.sub); }

  @Post(':slug')
  add(@CurrentUser() u: any, @Param('slug') slug: string) { return this.svc.add(u.typ, u.sub, slug); }

  @Delete(':slug')
  remove(@CurrentUser() u: any, @Param('slug') slug: string) { return this.svc.remove(u.typ, u.sub, slug); }

  @Get(':slug/data')
  getData(@CurrentUser() u: any, @Param('slug') slug: string) { return this.svc.getData(u.typ, u.sub, slug); }

  @Put(':slug/data')
  saveData(@CurrentUser() u: any, @Param('slug') slug: string, @Body() body: any) {
    return this.svc.saveData(u.typ, u.sub, slug, body?.data);
  }
}
