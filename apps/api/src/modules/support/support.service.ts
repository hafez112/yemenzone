import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupportAiService } from './support-ai.service';
import { sanitizeText } from '../../libs/security';
import { decryptSecret } from '../../common/crypto.util';

// 🎧 خدمة الدعم الفني — تذاكر العملاء والبائعين + رد تلقائي ذكي + لوحة الاقتراحات
// الإعدادات في Setting (support.config) | وضع الذكاء يتبع ai.config (محلي افتراضي — خارجي بأمر الإدارة)

const SETTINGS_KEY = 'support.config';

export const SUPPORT_DEFAULTS = {
  autoReplyEnabled: true, // الرد الآلي خارج ساعات الدوام
  autoFrom: 22,           // من الساعة 10 مساءً
  autoTo: 8,              // إلى الساعة 8 صباحاً (بتوقيت السيرفر)
  workNote: 'ساعات دوام الدعم: 8 صباحاً — 10 مساءً',
};

const CATEGORIES = ['support', 'inquiry', 'suggestion', 'complaint'];
const STATUSES = ['open', 'answered', 'closed'];
const IDEA_STATUSES = ['new', 'studying', 'planned', 'done', 'declined'];
const MSG_MAX = 2000;
const SUBJECT_MAX = 120;

type Msg = { from: 'user' | 'admin' | 'ai'; text: string; at: string; by?: string };

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private ai: SupportAiService,
  ) {}

  // ── الإعدادات ──
  async getSettings() {
    const row = await this.prisma.setting.findUnique({ where: { key: SETTINGS_KEY } }).catch(() => null);
    return { ...SUPPORT_DEFAULTS, ...((row?.value as any) || {}) };
  }

  async updateSettings(body: any) {
    const cur = await this.getSettings();
    const next: any = { ...cur };
    if (body.autoReplyEnabled !== undefined) next.autoReplyEnabled = !!body.autoReplyEnabled;
    if (body.autoFrom !== undefined) {
      const h = Math.max(0, Math.min(23, Number(body.autoFrom)));
      if (Number.isNaN(h)) throw new BadRequestException('ساعة البداية غير صالحة');
      next.autoFrom = h;
    }
    if (body.autoTo !== undefined) {
      const h = Math.max(0, Math.min(23, Number(body.autoTo)));
      if (Number.isNaN(h)) throw new BadRequestException('ساعة النهاية غير صالحة');
      next.autoTo = h;
    }
    if (body.workNote !== undefined) next.workNote = sanitizeText(body.workNote, 120) || cur.workNote;
    await this.prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      create: { group: 'general', key: SETTINGS_KEY, value: next },
      update: { value: next },
    });
    return next;
  }

  // هل نحن الآن داخل نافذة الرد الآلي؟ (تدعم النوافذ العابرة لمنتصف الليل)
  private inAutoWindow(cfg: any): boolean {
    const h = new Date().getHours();
    return cfg.autoFrom <= cfg.autoTo
      ? h >= cfg.autoFrom && h < cfg.autoTo
      : h >= cfg.autoFrom || h < cfg.autoTo;
  }

  // ── معلومات المستخدم ──
  private async userInfo(userType: string, userId: string) {
    const model: any = userType === 'seller' ? this.prisma.seller : this.prisma.customer;
    const u = await model.findUnique({ where: { id: userId }, select: { name: true, phone: true } }).catch(() => null);
    return { name: u?.name || '', phone: u?.phone || '' };
  }

  // ── العميل/البائع: إنشاء تذكرة ──
  async create(userType: 'customer' | 'seller', userId: string, body: any) {
    const category = CATEGORIES.includes(body?.category) ? body.category : 'support';
    const subject = sanitizeText(body?.subject, SUBJECT_MAX);
    const text = sanitizeText(body?.message, MSG_MAX);
    if (!subject) throw new BadRequestException('اكتب عنواناً مختصراً لرسالتك');
    if (!text) throw new BadRequestException('اكتب رسالتك أولاً');

    // حد أقصى للتذاكر المفتوحة — حماية من الإغراق
    const openCount = await this.prisma.supportTicket.count({
      where: { userType, userId, status: { not: 'closed' } },
    });
    if (openCount >= 10) throw new BadRequestException('لديك 10 تذاكر مفتوحة — انتظر رد الإدارة على إحداها أولاً');

    const info = await this.userInfo(userType, userId);
    const messages: Msg[] = [{ from: 'user', text, at: new Date().toISOString() }];
    const cfg = await this.getSettings();
    let autoReplied = false;

    // 🤖 الرد الآلي الذكي في الأوقات المحددة (خارج الدوام)
    if (cfg.autoReplyEnabled && this.inAutoWindow(cfg)) {
      const { reply } = this.ai.autoReply(`${subject}\n${text}`, userType, info.name);
      messages.push({ from: 'ai', text: reply, at: new Date().toISOString() });
      autoReplied = true;
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userType, userId,
        userName: info.name, userPhone: info.phone,
        category, subject,
        priority: this.ai.priority(`${subject} ${text}`),
        messages: messages as any,
        autoReplied,
        ideaStatus: category === 'suggestion' ? 'new' : null,
      },
    });
    return { ticket: this.publicView(ticket), autoReplied, settings: { workNote: cfg.workNote } };
  }

  // ── العميل/البائع: تذاكري ──
  async mine(userType: string, userId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userType, userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    const cfg = await this.getSettings();
    return {
      tickets: tickets.map((t) => this.publicView(t)),
      workNote: cfg.workNote,
      autoActive: cfg.autoReplyEnabled && this.inAutoWindow(cfg),
    };
  }

  // ── العميل/البائع: رد على تذكرتي ──
  async userReply(userType: string, userId: string, id: string, body: any) {
    const t = await this.ownedTicket(userType, userId, id);
    if (t.status === 'closed') throw new BadRequestException('التذكرة مغلقة — أنشئ تذكرة جديدة إن لزم');
    const text = sanitizeText(body?.message, MSG_MAX);
    if (!text) throw new BadRequestException('اكتب رسالتك أولاً');
    const messages = [...(t.messages as any as Msg[]), { from: 'user' as const, text, at: new Date().toISOString() }];
    const updated = await this.prisma.supportTicket.update({
      where: { id: t.id },
      data: { messages: messages as any, status: 'open' }, // رد المستخدم يعيدها للمفتوحة
    });
    return { ticket: this.publicView(updated) };
  }

  private async ownedTicket(userType: string, userId: string, id: string) {
    const t = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!t || t.userType !== userType || t.userId !== userId) throw new NotFoundException('التذكرة غير موجودة');
    return t;
  }

  // عرض للمستخدم: بلا حقول إدارية
  private publicView(t: any) {
    return {
      id: t.id, category: t.category, subject: t.subject, status: t.status,
      messages: t.messages, autoReplied: t.autoReplied, ideaStatus: t.ideaStatus,
      createdAt: t.createdAt, updatedAt: t.updatedAt,
    };
  }

  // ═══════════════ الإدارة ═══════════════

  async adminList(q: { status?: string; userType?: string; category?: string }) {
    const where: any = {};
    if (q.status && STATUSES.includes(q.status)) where.status = q.status;
    if (q.userType && ['customer', 'seller'].includes(q.userType)) where.userType = q.userType;
    if (q.category && CATEGORIES.includes(q.category)) where.category = q.category;
    const tickets = await this.prisma.supportTicket.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 200 });
    const all = await this.prisma.supportTicket.findMany({ where: { status: { not: 'closed' } }, select: { status: true, priority: true, category: true, ideaStatus: true, createdAt: true } });
    return {
      tickets,
      insights: this.ai.insights(all),
      counts: {
        open: all.filter((t) => t.status === 'open').length,
        answered: all.filter((t) => t.status === 'answered').length,
        ideas: all.filter((t) => t.category === 'suggestion').length,
      },
    };
  }

  async adminReply(id: string, adminId: string, body: any) {
    const t = await this.mustFind(id);
    if (t.status === 'closed') throw new BadRequestException('التذكرة مغلقة — أعد فتحها أولاً');
    const text = sanitizeText(body?.message, MSG_MAX);
    if (!text) throw new BadRequestException('اكتب الرد أولاً');
    const messages = [...(t.messages as any as Msg[]), { from: 'admin' as const, text, at: new Date().toISOString(), by: adminId }];
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { messages: messages as any, status: 'answered', aiDraft: null, aiDraftSrc: null },
    });
    await this.notifications.push(t.userType as any, t.userId, {
      icon: '🎧', title: 'رد جديد من الدعم الفني',
      body: `ردّت الإدارة على: ${t.subject}`,
      link: t.userType === 'seller' ? '/seller/support' : '/customer/support',
    }).catch(() => {});
    return { ticket: updated };
  }

  async adminSetStatus(id: string, status: string) {
    if (!STATUSES.includes(status)) throw new BadRequestException('حالة غير صالحة');
    await this.mustFind(id);
    return this.prisma.supportTicket.update({ where: { id }, data: { status } });
  }

  // 💡 حالة الاقتراح في مسار التطوير
  async adminSetIdeaStatus(id: string, ideaStatus: string) {
    if (!IDEA_STATUSES.includes(ideaStatus)) throw new BadRequestException('حالة اقتراح غير صالحة');
    const t = await this.mustFind(id);
    if (t.category !== 'suggestion') throw new BadRequestException('هذه التذكرة ليست اقتراحاً');
    const updated = await this.prisma.supportTicket.update({ where: { id }, data: { ideaStatus } });
    if (ideaStatus === 'done') {
      await this.notifications.push(t.userType as any, t.userId, {
        icon: '🎉', title: 'اقتراحك أصبح حقيقة!',
        body: `نفّذنا اقتراحك: ${t.subject} — شكراً لمساهمتك في تطوير يمن زون`,
        link: t.userType === 'seller' ? '/seller/support' : '/customer/support',
      }).catch(() => {});
    }
    return { ticket: updated };
  }

  // 💡 لوحة الاقتراحات — الاستفادة من أفكار العملاء والبائعين
  async ideasBoard() {
    const ideas = await this.prisma.supportTicket.findMany({
      where: { category: 'suggestion' },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    const by = (s: string) => ideas.filter((i) => (i.ideaStatus || 'new') === s);
    return {
      ideas,
      funnel: {
        new: by('new').length, studying: by('studying').length,
        planned: by('planned').length, done: by('done').length, declined: by('declined').length,
      },
    };
  }

  // 🤖 توليد مسودة رد ذكي وتخزينها — خارجي إن فعّلته الإدارة، وإلا محلي
  async aiDraft(id: string) {
    const t = await this.mustFind(id);
    const msgs = t.messages as any as Msg[];
    const lastUser = [...msgs].reverse().find((m) => m.from === 'user');
    const sourceText = `${t.subject}\n${lastUser?.text || ''}`;

    // الذكاء الخارجي — فقط إن فعّلته الإدارة من مركز الذكاء
    const aiCfg = await this.prisma.setting.findUnique({ where: { key: 'ai.config' } }).catch(() => null);
    const cfg: any = (aiCfg?.value as any) || {};
    if (cfg.externalEnabled && cfg.providerId) {
      const external = await this.externalChat(cfg.providerId, sourceText, this.ai.externalSystem());
      if (external) {
        await this.prisma.supportTicket.update({ where: { id }, data: { aiDraft: external, aiDraftSrc: 'external' } });
        return { draft: external, source: 'external', topic: null };
      }
    }
    // المحلي (الافتراضي)
    const { draft, topic } = this.ai.localDraft(sourceText, t.userType, t.userName);
    await this.prisma.supportTicket.update({ where: { id }, data: { aiDraft: draft, aiDraftSrc: 'local' } });
    return { draft, source: 'local', topic };
  }

  // اتصال خارجي بنفس نمط مركز الذكاء — معطّل تماماً ما لم تفعّله الإدارة
  private async externalChat(providerId: string, prompt: string, system: string): Promise<string | null> {
    const p = await this.prisma.aiProvider.findUnique({ where: { id: providerId } }).catch(() => null);
    if (!p || !p.isActive) return null;
    const key = decryptSecret(p.apiKey);
    if (!key) return null;
    try {
      if (/anthropic/i.test(p.baseUrl)) {
        const res = await fetch(`${p.baseUrl}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: p.model || 'claude-sonnet-4-5', max_tokens: 500, system, messages: [{ role: 'user', content: prompt }] }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) return null;
        const data: any = await res.json();
        return data?.content?.[0]?.text?.trim() || null;
      }
      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: p.model || 'gpt-4o-mini', temperature: 0.6, max_tokens: 500,
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || null;
    } catch { return null; }
  }

  private async mustFind(id: string) {
    const t = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('التذكرة غير موجودة');
    return t;
  }
}
