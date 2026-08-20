import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { encryptSecret, decryptSecret, maskSecret } from '../../common/crypto.util';
import { UPLOADS_DIR } from '../../common/upload';
import { sanitizeText } from '../../libs/security';
import {
  answerAssistant, generateProductDescription,
  normalizeArabic, ASSISTANT_TOPICS,
} from '../../libs/ai';

// ═══════════════════════════════════════════════════════════════
//  🤖 مركز الذكاء الاصطناعي — يدير الذكاء المحلي والخارجي
//  الإعدادات في Setting (ai.config) + المزودون في AiProvider
//  الافتراضي: الذكاء المحلي — الخارجي لا يعمل إلا بأمر الإدارة
// ═══════════════════════════════════════════════════════════════

const CONFIG_KEY = 'ai.config';

export const AI_DEFAULTS = {
  localEnabled: true,      // الذكاء المحلي (مكتبة libs/ai)
  externalEnabled: false,  // الذكاء الخارجي — معطل حتى تفعّله الإدارة
  providerId: null as string | null,
  features: {
    description: true,  // توليد وصف المنتج المفصل
    whiteBg: true,      // صورة المنتج بخلفية بيضاء
    priceCheck: true,   // فحص السعر مقابل أسعار المنصة
    assistant: true,    // أيقونة المساعد في الرئيسية
  },
  assistantName: 'مساعد يمن زون الذكي',
  assistantIcon: '🤖',
  assistantWelcome: 'مرحباً بك في يمن زون 👋 اسألني عن إنشاء نشاطك أو الباقات أو أي خدمة!',
};

@Injectable()
export class AiCenterService {
  constructor(private prisma: PrismaService) {}

  // ── الإعدادات العامة ──
  async getConfig() {
    const row = await this.prisma.setting.findUnique({ where: { key: CONFIG_KEY } }).catch(() => null);
    const saved = (row?.value as any) || {};
    return {
      ...AI_DEFAULTS,
      ...saved,
      features: { ...AI_DEFAULTS.features, ...(saved.features || {}) },
    };
  }

  async updateConfig(body: any) {
    const cur = await this.getConfig();
    const next: any = { ...cur };
    if (body.localEnabled !== undefined) next.localEnabled = !!body.localEnabled;
    if (body.externalEnabled !== undefined) next.externalEnabled = !!body.externalEnabled;
    if (body.providerId !== undefined) {
      if (body.providerId) {
        const p = await this.prisma.aiProvider.findUnique({ where: { id: body.providerId } });
        if (!p) throw new BadRequestException('المزود غير موجود');
      }
      next.providerId = body.providerId || null;
    }
    if (body.features && typeof body.features === 'object') {
      next.features = { ...cur.features };
      for (const k of Object.keys(AI_DEFAULTS.features) as (keyof typeof AI_DEFAULTS.features)[]) {
        if (body.features[k] !== undefined) next.features[k] = !!body.features[k];
      }
    }
    if (body.assistantName !== undefined) next.assistantName = sanitizeText(body.assistantName, 60) || AI_DEFAULTS.assistantName;
    if (body.assistantIcon !== undefined) next.assistantIcon = sanitizeText(body.assistantIcon, 8) || AI_DEFAULTS.assistantIcon;
    if (body.assistantWelcome !== undefined) next.assistantWelcome = sanitizeText(body.assistantWelcome, 200) || AI_DEFAULTS.assistantWelcome;

    await this.prisma.setting.upsert({
      where: { key: CONFIG_KEY },
      create: { group: 'ai', key: CONFIG_KEY, value: next },
      update: { value: next },
    });
    return next;
  }

  // ── مزودو الذكاء الخارجي ──
  async listProviders() {
    const rows = await this.prisma.aiProvider.findMany({ orderBy: { createdAt: 'desc' } });
    // المفاتيح تُقنّع دائماً — لا تُرسل خاماً للواجهة أبداً
    return rows.map((p) => ({ ...p, apiKey: maskSecret(p.apiKey) }));
  }

  async createProvider(body: any) {
    const name = sanitizeText(body.name, 60);
    const baseUrl = String(body.baseUrl || '').trim().replace(/\/+$/, '');
    if (!name) throw new BadRequestException('اسم المزود مطلوب');
    if (!/^https?:\/\//i.test(baseUrl)) throw new BadRequestException('رابط الواجهة البرمجية يجب أن يبدأ بـ https://');
    const p = await this.prisma.aiProvider.create({
      data: {
        name, baseUrl,
        apiKey: encryptSecret(String(body.apiKey || '').trim() || null),
        model: sanitizeText(body.model, 80) || null,
        isActive: body.isActive !== false,
      },
    });
    return { ...p, apiKey: maskSecret(p.apiKey) };
  }

  async updateProvider(id: string, body: any) {
    const p = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('المزود غير موجود');
    const data: any = {};
    if (body.name !== undefined) data.name = sanitizeText(body.name, 60) || p.name;
    if (body.baseUrl !== undefined) {
      const u = String(body.baseUrl || '').trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(u)) throw new BadRequestException('رابط غير صالح');
      data.baseUrl = u;
    }
    if (body.model !== undefined) data.model = sanitizeText(body.model, 80) || null;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    // المفتاح لا يُحدَّث إلا إذا أُرسل مفتاح جديد صريح (المقنّع يُتجاهل)
    if (body.apiKey && typeof body.apiKey === 'string' && !body.apiKey.includes('•')) {
      data.apiKey = encryptSecret(body.apiKey.trim());
    }
    const updated = await this.prisma.aiProvider.update({ where: { id }, data });
    return { ...updated, apiKey: maskSecret(updated.apiKey) };
  }

  async deleteProvider(id: string) {
    const cfg = await this.getConfig();
    if (cfg.providerId === id) {
      await this.updateConfig({ providerId: null, externalEnabled: false });
    }
    await this.prisma.aiProvider.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('المزود غير موجود');
    });
    return { ok: true };
  }

  // فحص اتصال المزود — يدعم الواجهات المتوافقة مع OpenAI و Anthropic
  async testProvider(id: string) {
    const p = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('المزود غير موجود');
    const key = decryptSecret(p.apiKey);
    if (!key) throw new BadRequestException('أضف مفتاح API أولاً');

    const isAnthropic = /anthropic/i.test(p.baseUrl);
    const url = `${p.baseUrl}/models`;
    const headers: Record<string, string> = isAnthropic
      ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
      : { Authorization: `Bearer ${key}` };

    let ok = false, status = 0, modelsCount = 0;
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      status = res.status;
      if (res.ok) {
        ok = true;
        const data: any = await res.json().catch(() => ({}));
        modelsCount = (data?.data?.length || data?.length || 0) as number;
      }
    } catch { status = 0; }

    await this.prisma.aiProvider.update({ where: { id }, data: { lastTestAt: new Date(), lastTestOk: ok } }).catch(() => {});
    if (!ok) throw new BadRequestException(`فشل الاتصال بالمزود (رمز ${status || 'شبكة'}) — تحقق من الرابط والمفتاح`);
    return { ok: true, status, modelsCount };
  }

  // الاتصال الفعلي بالمزود الخارجي (نص → نص) — يعيد null عند أي فشل ليحل المحلي
  private async externalChat(cfg: any, prompt: string, system: string): Promise<string | null> {
    if (!cfg.externalEnabled || !cfg.providerId) return null;
    const p = await this.prisma.aiProvider.findUnique({ where: { id: cfg.providerId } }).catch(() => null);
    if (!p || !p.isActive) return null;
    const key = decryptSecret(p.apiKey);
    if (!key) return null;

    try {
      if (/anthropic/i.test(p.baseUrl)) {
        const res = await fetch(`${p.baseUrl}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: p.model || 'claude-sonnet-4-5', max_tokens: 700, system, messages: [{ role: 'user', content: prompt }] }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) return null;
        const data: any = await res.json();
        return data?.content?.[0]?.text?.trim() || null;
      }
      // متوافق مع OpenAI (OpenAI/DeepSeek/xAI/Groq/Mistral/OpenRouter...)
      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: p.model || 'gpt-4o-mini', temperature: 0.7, max_tokens: 700,
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || null;
    } catch { return null; }
  }

  private ensureFeature(cfg: any, key: keyof typeof AI_DEFAULTS.features) {
    if (!cfg.features[key]) throw new ForbiddenException('هذه الميزة الذكية معطّلة من إدارة المنصة حالياً');
    if (!cfg.localEnabled && !cfg.externalEnabled) throw new ForbiddenException('الذكاء الاصطناعي معطّل من إدارة المنصة حالياً');
  }

  // ── ✨ وصف منتج مفصّل (خارجي عند توفره — وإلا محلي) ──
  async productDescription(body: any) {
    const cfg = await this.getConfig();
    this.ensureFeature(cfg, 'description');
    const name = sanitizeText(body.name, 120);
    if (!name) throw new BadRequestException('اكتب اسم المنتج أولاً');
    const catName = sanitizeText(body.categoryName, 60);
    const details = sanitizeText(body.details, 400);

    const prompt = `اكتب وصفاً تسويقياً عربياً مفصلاً واحترافياً للمنتج التالي لمتجر إلكتروني يمني، في 4-6 أسطر مع إيموجي مناسبة ودعوة واضحة للشراء:\nالمنتج: ${name}\n${catName ? `القسم: ${catName}\n` : ''}${details ? `مواصفات: ${details}\n` : ''}اذكر الفوائد العملية وجودة المنتج وضمانه.`;
    const system = 'أنت كاتب تسويقي يمني محترف لمتجر إلكتروني. اكتب بالعربية الفصحى المبسطة بأسلوب شيق، بلا مبالغات كاذبة.';

    const external = await this.externalChat(cfg, prompt, system);
    if (external) return { text: external, source: 'external' };

    // محلي: قالب تسويقي + فقرة مواصفات مفصلة من المدخلات
    let text = generateProductDescription(name, catName || undefined);
    if (details) {
      const lines = details.split(/[،,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 6);
      if (lines.length) text += `\n\n📋 المواصفات:\n${lines.map((l) => `▪️ ${l}`).join('\n')}`;
    }
    text += '\n\n✅ جودة مضمونة | 🚚 توصيل سريع | 💵 دفع عند الاستلام';
    return { text, source: 'local' };
  }

  // ── 💲 فحص السعر مقابل أسعار المنصة (بيانات حقيقية) + رأي الخارجي اختيارياً ──
  async priceCheck(body: any) {
    const cfg = await this.getConfig();
    this.ensureFeature(cfg, 'priceCheck');
    const name = sanitizeText(body.name, 120);
    const price = Number(body.price);
    if (!name) throw new BadRequestException('اكتب اسم المنتج أولاً');
    if (!price || price <= 0) throw new BadRequestException('أدخل سعر منتجك أولاً');

    // منتجات مشابهة: كلمات الاسم (3+ أحرف) بعد التطبيع
    const tokens = normalizeArabic(name).split(' ').filter((t) => t.length >= 3).slice(0, 4);
    const similar = tokens.length
      ? await this.prisma.product.findMany({
          where: { isActive: true, price: { gt: 0 }, OR: tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' as const } })) },
          select: { name: true, price: true, store: { select: { name: true } } },
          take: 60,
        })
      : [];

    const prices = similar.map((s) => Number(s.price)).filter((n) => n > 0);
    const stats = prices.length
      ? {
          count: prices.length,
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        }
      : null;

    let verdict: string;
    let verdictColor: string;
    if (!stats) {
      verdict = 'لا توجد منتجات مشابهة في المنصة بعد — أنت السبّاق! سعّر بثقة';
      verdictColor = '#0EA5E9';
    } else if (price < stats.avg * 0.85) {
      verdict = `سعرك أقل من متوسط المنصة (${stats.avg.toLocaleString()} ر.ي) — ميزة تنافسية قوية أو فرصة لرفع هامشك`;
      verdictColor = '#059669';
    } else if (price > stats.avg * 1.15) {
      verdict = `سعرك أعلى من متوسط المنصة (${stats.avg.toLocaleString()} ر.ي) — راجع المنافسين أو برّر الفرق بجودة إضافية`;
      verdictColor = '#DC2626';
    } else {
      verdict = `سعرك ضمن متوسط المنصة (${stats.avg.toLocaleString()} ر.ي) — تسعيرة منافسة ✅`;
      verdictColor = '#F59E0B';
    }

    // رأي الذكاء الخارجي بالأسعار العالمية (إن فعّلته الإدارة)
    let aiNote: string | null = null;
    if (cfg.externalEnabled && cfg.providerId) {
      aiNote = await this.externalChat(
        cfg,
        `المنتج: ${name} — سعره المعروض ${price.toLocaleString()} ريال يمني.${stats ? ` متوسط أسعار ${stats.count} منتج مشابه في المنصة ${stats.avg.toLocaleString()} ر.ي (الأدنى ${stats.min.toLocaleString()}، الأعلى ${stats.max.toLocaleString()}).` : ''}\nقيّم السعر بإيجاز (سطرين كحد أقصى) مقارنة بالسعر العالمي المعروف لهذا المنتج، وانصح التاجر.`,
        'أنت خبير تسعير للتجارة الإلكترونية في اليمن. أجب بالعربية بإيجاز شديد وواقعية، واذكر أن الأسعار العالمية تقديرية.',
      );
    }

    return {
      stats, verdict, verdictColor, source: aiNote ? 'hybrid' : 'local', aiNote,
      samples: similar.slice(0, 5).map((s) => ({ title: s.name, price: Number(s.price), store: s.store?.name })),
    };
  }

  // ── 🖼️ صورة المنتج بخلفية بيضاء (معالجة محلية بـ sharp) ──
  async whiteBackground(file: Express.Multer.File) {
    const cfg = await this.getConfig();
    this.ensureFeature(cfg, 'whiteBg');
    if (!file) throw new BadRequestException('لم تُرسل صورة');
    const dir = path.join(UPLOADS_DIR, 'ai');
    fs.mkdirSync(dir, { recursive: true });
    const name = `wb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
    // دمج الشفافية على الأبيض + توسيط المنتج على قماش مربع أبيض
    await sharp(file.buffer)
      .flatten({ background: '#ffffff' })
      .resize(1200, 1200, { fit: 'contain', background: '#ffffff' })
      .webp({ quality: 88 })
      .toFile(path.join(dir, name));
    return { url: `/uploads/ai/${name}` };
  }

  // ── 💬 مساعد الصفحة الرئيسية ──
  async publicAssistantConfig() {
    const cfg = await this.getConfig();
    const enabled = cfg.features.assistant && (cfg.localEnabled || cfg.externalEnabled);
    return {
      enabled,
      name: cfg.assistantName,
      icon: cfg.assistantIcon,
      welcome: cfg.assistantWelcome,
      mode: cfg.externalEnabled && cfg.providerId ? 'hybrid' : 'local',
      topics: ASSISTANT_TOPICS,
    };
  }

  async assistantReply(rawMessage: string) {
    const cfg = await this.getConfig();
    if (!cfg.features.assistant || (!cfg.localEnabled && !cfg.externalEnabled)) {
      throw new ForbiddenException('المساعد الذكي معطّل حالياً');
    }
    const message = sanitizeText(rawMessage, 300);
    if (!message) throw new BadRequestException('اكتب سؤالك');

    // 1) الإجابة المحلية من قاعدة المعرفة (فورية وتعمل دائماً)
    const plans = cfg.localEnabled || cfg.externalEnabled
      ? await this.prisma.plan.findMany({
          where: { isActive: true }, orderBy: { sort: 'asc' },
          select: { name: true, priceMonthly: true, priceYearly: true },
        }).catch(() => [])
      : [];
    const local = answerAssistant(message, { plans });
    if (local.matched) return { ...local, source: 'local' };

    // 2) لم تُطابق قاعدة → الذكاء الخارجي إن فعّلته الإدارة
    const plansText = plans.map((p) => `${p.name}: ${Number(p.priceMonthly)} ر.ي/شهر`).join('، ');
    const external = await this.externalChat(
      cfg, message,
      `أنت "${cfg.assistantName}" — مساعد منصة يمن زون اليمنية للتجارة الإلكترونية (متاجر منتجات، عقارات إيجار، فنادق، مراكز خدمات). الباقات الحالية: ${plansText || 'باقة مجانية وباقات مدفوعة'}. أجب بالعربية بإيجاز (3 أسطر كحد أقصى) ووجّه المستخدم لإنشاء نشاطه أو لصفحة الباقات. لا تختلق أسعاراً غير المذكورة.`,
    );
    if (external) return { reply: external, matched: null, chips: local.chips, source: 'external' };

    // 3) بديل ودود
    return {
      reply: 'سؤال جميل! 🤔 لم أفهمه تماماً بعد — جرّب أحد المواضيع بالأسفل، أو أعد صياغة سؤالك بكلمات أبسط.',
      matched: null, chips: local.chips, source: 'fallback',
    };
  }
}
