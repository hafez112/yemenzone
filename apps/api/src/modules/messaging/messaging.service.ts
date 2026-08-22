import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingAiService } from './messaging-ai.service';
import { encryptSecret, decryptSecret, maskSecret } from '../../common/crypto.util';

// 📨 خدمة المراسلة المركزية: تعويض القوالب + الإرسال عبر المزود + التسجيل
@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService, private ai: MessagingAiService) {}

  // تعويض المتغيرات في النص
  private render(body: string, vars: Record<string, string>) {
    return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  }

  // الإرسال المركزي — لا يرمي أخطاء أبداً حتى لا يعطّل العمليات الأساسية
  async send(event: string, phone: string, vars: Record<string, string> = {}) {
    try {
      const tpl = await this.prisma.messageTemplate.findUnique({ where: { event } });
      if (!tpl || !tpl.isActive) return { sent: false, reason: 'template_disabled' };

      const body = this.render(tpl.body, vars);
      const channel = tpl.channel === 'both' ? 'sms' : tpl.channel;
      const provider = await this.prisma.messagingProvider.findFirst({
        where: { isActive: true, OR: [{ channel: channel as any }, { channel: 'both' }] },
      });

      // بدون مزود: محاكاة (تسجيل فقط)
      if (!provider) {
        await this.log(event, channel as any, phone, body, 'simulated', null, null);
        return { sent: false, reason: 'no_provider', simulated: true };
      }

      // 💬 واتساب يشترط الصيغة الدولية بالأرقام فقط: اليمني المحلي 7XXXXXXXX → 9677XXXXXXXX
      const waPhone = phone.startsWith('+') ? phone.slice(1)
        : /^7\d{8}$/.test(phone) ? `967${phone}`
        : phone.replace(/^00/, '');

      // إرسال حقيقي عبر API المزود — 🔐 المفتاح يُفك تشفيره لحظة الاستخدام فقط
      try {
        const apiKey = decryptSecret(provider.apiKey) || '';
        const url = this.render(provider.apiUrl, { phone, waPhone, message: encodeURIComponent(body), apiKey });
        const payload = provider.template
          ? JSON.parse(this.render(provider.template, { phone, waPhone, message: body, apiKey }))
          : { phone, message: body };
        const res = await fetch(url, {
          method: provider.method || 'POST',
          headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
          body: provider.method === 'GET' ? undefined : JSON.stringify(payload),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await this.log(event, channel as any, phone, body, 'sent', provider.name, null);
        return { sent: true, provider: provider.name };
      } catch (e: any) {
        await this.log(event, channel as any, phone, body, 'failed', provider.name, e.message);
        return { sent: false, reason: 'provider_error', error: e.message };
      }
    } catch {
      return { sent: false, reason: 'internal' };
    }
  }

  private log(event: string, channel: any, phone: string, body: string, status: string, provider: string | null, error: string | null) {
    return this.prisma.messageLog.create({ data: { event, channel, phone, body, status, provider, error } });
  }

  // ── الإدارة: المزودون — 🎭 المفاتيح تُقنَّع قبل الوصول للمتصفح ──
  async providers() {
    const list = await this.prisma.messagingProvider.findMany({ orderBy: { createdAt: 'desc' } });
    return list.map((p) => ({ ...p, apiKey: maskSecret(p.apiKey) }));
  }

  saveProvider(body: { id?: string; channel: string; name: string; apiUrl: string; method?: string; apiKey?: string; template?: string; isActive?: boolean }) {
    const data: any = {
      channel: body.channel,
      name: body.name,
      apiUrl: body.apiUrl,
      method: body.method || 'POST',
      template: body.template || null,
      isActive: body.isActive ?? true,
    };
    // 🔐 المفتاح يُخزَّن مشفّراً — وعند التعديل: الحقل الفارغ يُبقي القيمة الحالية
    if (!body.id || body.apiKey) data.apiKey = encryptSecret(body.apiKey);
    if (body.id) return this.prisma.messagingProvider.update({ where: { id: body.id }, data });
    return this.prisma.messagingProvider.create({ data });
  }

  async toggleProvider(id: string) {
    const p = await this.prisma.messagingProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('المزود غير موجود');
    return this.prisma.messagingProvider.update({ where: { id }, data: { isActive: !p.isActive } });
  }

  deleteProvider(id: string) {
    return this.prisma.messagingProvider.delete({ where: { id } });
  }

  // ── الإدارة: القوالب ──
  async templates() {
    const tpls = await this.prisma.messageTemplate.findMany({ orderBy: { event: 'asc' } });
    return {
      templates: tpls.map((t) => ({
        ...t,
        analysis: this.ai.analyzeTemplate(t.event, t.body, t.channel),
        preset: this.ai.EVENT_PRESETS[t.event] || null,
      })),
      presets: this.ai.EVENT_PRESETS,
    };
  }

  saveTemplate(body: { event: string; channel?: string; body: string; isActive?: boolean }) {
    const data = {
      channel: (body.channel || 'sms') as any,
      body: body.body,
      isActive: body.isActive ?? true,
    };
    return this.prisma.messageTemplate.upsert({
      where: { event: body.event },
      update: data,
      create: { event: body.event, ...data },
    });
  }

  async toggleTemplate(id: string) {
    const t = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('القالب غير موجود');
    return this.prisma.messageTemplate.update({ where: { id }, data: { isActive: !t.isActive } });
  }

  // 💬 إعداد واتساب السريع (WhatsApp Cloud API من ميتا) — بضغطة واحدة:
  // ينشئ المزود ويحوّل قوالب OTP والطلبات والحجوزات إلى قناة واتساب
  async whatsappQuickSetup(body: { token: string; phoneNumberId: string }) {
    const token = (body.token || '').trim();
    const phoneNumberId = (body.phoneNumberId || '').trim();
    if (!token || !phoneNumberId) throw new BadRequestException('أدخل رمز الوصول ومعرّف رقم الهاتف');

    // المزود: رابط ميتا + قالب JSON الرسمي (الرقم الدولي {waPhone} يُحسب تلقائياً)
    const existing = await this.prisma.messagingProvider.findFirst({ where: { name: 'WhatsApp Cloud API' } });
    const data = {
      channel: 'whatsapp' as any,
      name: 'WhatsApp Cloud API',
      apiUrl: `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      method: 'POST',
      template: JSON.stringify({
        messaging_product: 'whatsapp',
        to: '{waPhone}',
        type: 'text',
        text: { preview_url: false, body: '{message}' },
      }),
      isActive: true,
    };
    if (existing) {
      await this.prisma.messagingProvider.update({ where: { id: existing.id }, data: { ...data, apiKey: encryptSecret(token) } });
    } else {
      await this.prisma.messagingProvider.create({ data: { ...data, apiKey: encryptSecret(token) } });
    }

    // تحويل القوالب الأساسية إلى واتساب (تُنشأ بالنص المقترح إن لم تكن موجودة)
    const events = ['otp', 'order_new', 'order_status', 'booking_status', 'card_verify'];
    for (const event of events) {
      const preset = this.ai.EVENT_PRESETS[event];
      await this.prisma.messageTemplate.upsert({
        where: { event },
        update: { channel: 'whatsapp', isActive: true },
        create: { event, channel: 'whatsapp', body: preset?.suggested || '{code}', isActive: true },
      });
    }
    return { ok: true, message: '💬 فُعّل واتساب بنجاح — أرسل رسالة تجريبية للتأكد' };
  }

  // إرسال تجريبي
  testSend(event: string, phone: string) {
    const preset = this.ai.EVENT_PRESETS[event];
    const sampleVars: Record<string, string> = {
      code: '123456', name: 'عميل تجريبي', number: 'ORD-000001',
      store: 'متجر التجربة', total: '5000 ريال', status: 'مؤكد',
      plan: 'الاحترافية', driver: 'أحمد السائق', driverPhone: '770000001',
    };
    return this.send(event, phone, preset ? sampleVars : sampleVars);
  }

  // ── السجل والإحصائيات ──
  async logs(q?: { event?: string; status?: string; take?: number }) {
    return this.prisma.messageLog.findMany({
      where: {
        ...(q?.event ? { event: q.event } : {}),
        ...(q?.status ? { status: q.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(q?.take || 100, 200),
    });
  }

  async stats() {
    const [total, failed, simulated, sent, activeTemplates, providers] = await Promise.all([
      this.prisma.messageLog.count(),
      this.prisma.messageLog.count({ where: { status: 'failed' } }),
      this.prisma.messageLog.count({ where: { status: 'simulated' } }),
      this.prisma.messageLog.count({ where: { status: 'sent' } }),
      this.prisma.messageTemplate.count({ where: { isActive: true } }),
      this.prisma.messagingProvider.count({ where: { isActive: true } }),
    ]);
    const byEvent = await this.prisma.messageLog.groupBy({ by: ['event'], _count: true });
    return {
      total, failed, simulated, sent, activeTemplates, providers,
      byEvent: Object.fromEntries(byEvent.map((b) => [b.event, b._count])),
      tips: this.ai.statsTips({ total, failed, simulated, activeTemplates, providers }),
    };
  }
}
