import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComplaintsAiService } from './complaints-ai.service';
import { ShieldService } from '../shield/shield.service';
import { WebPushService } from '../notifications/push.service';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService, private ai: ComplaintsAiService, private shield: ShieldService, private webPush: WebPushService) {}

  // تقديم شكوى — عام (العميل مسجل أو زائر)
  async submit(body: any, customerId?: string) {
    await this.shield.requireCaptcha('complaint', body.captchaId, body.captchaAnswer); // 🤖 لست روبوت
    if (!body.name?.trim() || !body.phone?.trim()) throw new BadRequestException('الاسم ورقم الجوال مطلوبان');
    if (!body.subject?.trim() || !body.message?.trim()) throw new BadRequestException('الموضوع ونص الشكوى مطلوبان');
    if (body.message.trim().length < 10) throw new BadRequestException('اكتب تفاصيل أكثر (10 أحرف على الأقل)');
    // منع التكرار: نفس الجوال + نفس الموضوع خلال ساعة
    const hourAgo = new Date(Date.now() - 3600000);
    const dup = await this.prisma.complaint.findFirst({
      where: { phone: body.phone.trim(), subject: body.subject.trim(), createdAt: { gte: hourAgo } },
    });
    if (dup) throw new BadRequestException(`شكواك مسجلة مسبقاً برقم ${dup.number} — تابعها من صفحة التتبع`);

    const number = 'CMP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { category, label } = this.ai.categorize(body.subject + ' ' + body.message);
    const priority = this.ai.priority(body.subject + ' ' + body.message);
    const complaint = await this.prisma.complaint.create({
      data: {
        number, customerId: customerId || null,
        name: body.name.trim(), phone: body.phone.trim(),
        subject: body.subject.trim(), message: body.message.trim(),
      },
    });
    // 📲 تنبيه فوري للإدارة بشكوى جديدة — يصل حتى واللوحة مغلقة
    this.webPush.sendToAdmins({
      title: `📣 شكوى جديدة ${complaint.number}`,
      body: `${body.name.trim()}: ${body.subject.trim()}`,
      url: '/admin/complaints',
    });
    return { number: complaint.number, category: label, priority };
  }

  // تتبع شكوى — برقمها والجوال
  async track(number: string, phone: string) {
    if (!number || !phone) throw new BadRequestException('رقم الشكوى والجوال مطلوبان');
    const c = await this.prisma.complaint.findFirst({
      where: { number: number.toUpperCase(), phone: phone.trim() },
    });
    if (!c) throw new NotFoundException('لم تُعثر على الشكوى — تأكد من الرقم والجوال');
    return {
      number: c.number, subject: c.subject, message: c.message,
      status: c.status, reply: c.reply, repliedAt: c.repliedAt, createdAt: c.createdAt,
      category: this.ai.categorize(c.subject + ' ' + c.message).label,
    };
  }

  // الإدارة
  async adminList(status?: string) {
    const complaints = await this.prisma.complaint.findMany({
      where: status && status !== 'all' ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const enriched = complaints.map((c) => {
      const cat = this.ai.categorize(c.subject + ' ' + c.message);
      return { ...c, category: cat.label, suggestedReply: cat.suggestedReply, priority: this.ai.priority(c.subject + ' ' + c.message) };
    });
    // عالية الأولوية والمفتوحة أولاً
    enriched.sort((a, b) => {
      const rank = (x: any) => (x.status === 'open' ? 0 : x.status === 'replied' ? 1 : 2) + (x.priority === 'high' ? -0.5 : 0);
      return rank(a) - rank(b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const all = await this.prisma.complaint.findMany({ take: 300, orderBy: { createdAt: 'desc' } });
    return { complaints: enriched, insights: this.ai.insights(all) };
  }

  async reply(id: string, reply: string) {
    if (!reply?.trim()) throw new BadRequestException('نص الرد مطلوب');
    const c = await this.prisma.complaint.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('الشكوى غير موجودة');
    return this.prisma.complaint.update({
      where: { id },
      data: { reply: reply.trim(), status: 'replied', repliedAt: new Date() },
    });
  }

  async setStatus(id: string, status: 'open' | 'closed') {
    const c = await this.prisma.complaint.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('الشكوى غير موجودة');
    return this.prisma.complaint.update({ where: { id }, data: { status } });
  }
}
