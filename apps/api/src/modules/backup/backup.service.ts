import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../common/queue.service';
import { BackupAiService } from './backup-ai.service';
import { maskSecret } from '../../common/crypto.util';
import { sanitizeText } from '../../libs/security';
import * as fs from 'fs';
import * as path from 'path';

// الجداول المصدّرة (تُستثنى الجداول المؤقتة: OTP والجلسات)
const TABLES = [
  'seller', 'customer', 'adminUser', 'storeType', 'store', 'category', 'product',
  'order', 'orderItem', 'returnRequest', 'rentalUnit', 'rentalBooking', 'hotelRoom', 'roomBooking',
  'serviceItem', 'serviceRequest', 'review', 'storeLike', 'plan', 'subscription',
  'coupon', 'paymentGateway', 'payment', 'cardBatch', 'paymentCard', 'customerCard',
  'cardTopup', 'wallet', 'walletTransaction', 'withdrawalRequest', 'settlement', 'driver',
  'deliveryCompany', 'storeDeliveryCompany', 'storeDriver', 'platformFile', 'messagingProvider', 'messageTemplate',
  'complaint', 'platformService', 'platformServiceOrder', 'slide', 'customPage',
  'messageLog', 'setting', 'themeBackup', 'currency', 'governorate', 'securityLog',
  'bannedIp', 'trustedDevice', 'apiKey', 'apiUsage',
  // 🆕 جداول كانت تُفقد من النسخ (الإصلاح الرئيسي): الإعلانات والتنبيهات والبث
  // وجلسات التوثيق والمدونة والبحث والإحالات والنقاط
  'ad', 'notification', 'broadcast', 'verificationRequest', 'blogPost',
  'searchQuery', 'referral', 'pointsTransaction',
  // 🆕 اكتمال النسخة: وسائل دفع المتجر ومصاريفه وتنبيهات المخزون والدردشة والتدقيق
  'storePaymentMethod', 'storeDeliveryMethod', 'expense', 'pushSubscription',
  'conversation', 'chatMessage', 'stockAlert', 'pwaRequest', 'auditLog',
  // 🆕 آلة البيع: المفضلة والأسئلة والسلال (الجلسات 1-3)
  'wishlistItem', 'productQuestion', 'cartItem',
  // 🆕 اكتمال شامل: البطاقات والأدوات والسوق الحر والدعم والمشاركات العامة
  'cardEditRequest', 'toolPurchase', 'platformTool', 'userTool',
  'bizListing', 'bioLink', 'quickSell', 'usedListing', 'priceAlert',
  'buyerRequest', 'requestReply', 'sharedDoc', 'supportTicket', 'aiProvider',
];

// جداول مؤقتة تُمسح عند الاستعادة لتحرير المراجع (لا تُنسخ أصلاً)
const TRANSIENT_TABLES = ['session', 'otpCode'];

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService, private ai: BackupAiService, private queue: QueueService) {}

  private ensureDir() {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  async create(note?: string) {
    // 📦 طابور «backup» — نسخة واحدة تعمل في كل لحظة مهما تكررت الطلبات
    return this.queue.enqueue('backup', () => this.createNow(note));
  }

  private async createNow(note?: string) {
    this.ensureDir();
    const data: Record<string, any[]> = {};
    const counts: Record<string, number> = {};
    let totalRows = 0;
    for (const t of TABLES) {
      try {
        const rows = await (this.prisma as any)[t].findMany();
        data[t] = rows;
        counts[t] = rows.length;
        totalRows += rows.length;
      } catch { /* جدول غير موجود — تجاوز */ }
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `yz-backup-${stamp}.json`;
    const payload = {
      app: 'yemen-zone', version: 1, createdAt: new Date().toISOString(),
      tables: counts, totalRows, data,
    };
    const filePath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8');
    const size = fs.statSync(filePath).size;
    const record = await this.prisma.backupRecord.create({
      data: { filename, size, note: note?.trim() || `${totalRows} سجل من ${TABLES.length} جدول` },
    });
    return { ...record, totalRows };
  }

  async list() {
    this.ensureDir();
    const records = await this.prisma.backupRecord.findMany({ orderBy: { createdAt: 'desc' } });
    // عدادات الجداول الحالية للذكاء
    const counts: Record<string, number> = {};
    for (const t of ['order', 'product', 'store', 'customer', 'payment', 'messageLog', 'securityLog']) {
      try { counts[t] = await (this.prisma as any)[t].count(); } catch {}
    }
    const withFiles = records.map((r) => ({ ...r, exists: fs.existsSync(path.join(BACKUP_DIR, r.filename)) }));
    const totalSize = withFiles.filter((r) => r.exists).reduce((s, r) => s + (r.size || 0), 0);
    return { backups: withFiles, dir: BACKUP_DIR, tableCount: TABLES.length, totalSize, tips: this.ai.tips(records, counts) };
  }

  filePath(filename: string): string {
    // حماية من path traversal
    if (!/^yz-backup-[\w-]+\.json$/.test(filename)) throw new BadRequestException('اسم ملف غير صالح');
    const p = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(p)) throw new NotFoundException('الملف غير موجود');
    return p;
  }

  async remove(id: string) {
    const r = await this.prisma.backupRecord.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('النسخة غير موجودة');
    const p = path.join(BACKUP_DIR, r.filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    await this.prisma.backupRecord.delete({ where: { id } });
    return { ok: true };
  }

  // ♻️ استعادة نسخة: مسح شامل ثم إدراج محتوى النسخة — داخل معاملة واحدة (الكل أو لا شيء)
  async restore(id: string, adminId?: string) {
    const r = await this.prisma.backupRecord.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('النسخة غير موجودة');
    const p = path.join(BACKUP_DIR, r.filename);
    if (!fs.existsSync(p)) throw new NotFoundException('ملف النسخة مفقود من القرص — أعد رفعه للخادم');
    let payload: any;
    try { payload = JSON.parse(fs.readFileSync(p, 'utf-8')); }
    catch { throw new BadRequestException('ملف النسخة تالف ولا يمكن قراءته'); }
    if (payload?.app !== 'yemen-zone' || !payload?.data || typeof payload.data !== 'object') {
      throw new BadRequestException('هذا الملف ليس نسخة احتياطية صالحة لمنصة يمن زون');
    }
    const data = payload.data as Record<string, any[]>;

    let restored = 0;
    let tables = 0;
    await this.prisma.$transaction(async (tx) => {
      // 1) مسح الجداول المؤقتة أولاً (جلسات/OTP) لتحرير مراجع المستخدمين
      for (const t of TRANSIENT_TABLES) {
        try { await (tx as any)[t].deleteMany(); } catch { /* تجاوز */ }
      }
      // 2) مسح بترتيب عكسي — الأبناء قبل الآباء
      for (const t of [...TABLES].reverse()) {
        if (!data[t]) continue;
        try { await (tx as any)[t].deleteMany(); } catch { /* جدول غير موجود بهذه النسخة من القاعدة */ }
      }
      // 3) إدراج بالترتيب الأصلي — الآباء قبل الأبناء، على دفعات
      for (const t of TABLES) {
        const rows = data[t];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        try {
          for (let i = 0; i < rows.length; i += 500) {
            await (tx as any)[t].createMany({ data: rows.slice(i, i + 500) });
          }
          restored += rows.length;
          tables += 1;
        } catch (e: any) {
          throw new BadRequestException(`فشلت استعادة جدول "${t}" — تُرجم عن كل شيء. (${String(e?.message || e).slice(0, 120)})`);
        }
      }
    }, { timeout: 180000, maxWait: 20000 });

    await this.prisma.securityLog.create({
      data: { event: 'db.restore', userType: 'admin', userId: adminId || null, details: { file: r.filename, restored, tables } },
    }).catch(() => {});
    return { ok: true, restored, tables, file: r.filename };
  }

  // ═══════════════ 🛡️ النسخ الخارجي التلقائي (pg_dump + تيليجرام) ═══════════════
  // الإعدادات في Setting (backup.offsite) — حاوية yz-backup تقرأها وتنفذ يومياً

  async offsite() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'backup.offsite' } }).catch(() => null);
    const cfg: any = (row?.value as any) || {};
    let status: any = null;
    try { status = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'offsite-status.json'), 'utf8')); } catch {}
    const dumps: any[] = [];
    for (const sub of ['daily', 'weekly']) {
      try {
        for (const f of fs.readdirSync(path.join(BACKUP_DIR, sub)).filter((x) => x.endsWith('.dump'))) {
          const st = fs.statSync(path.join(BACKUP_DIR, sub, f));
          dumps.push({ file: `${sub}/${f}`, size: st.size, at: st.mtime });
        }
      } catch {}
    }
    dumps.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    return {
      settings: {
        enabled: !!cfg.enabled,
        hour: cfg.hour ?? 3,
        tgChatId: cfg.tgChatId || '',
        tgToken: cfg.tgToken ? maskSecret(cfg.tgToken) : '',
        configured: !!(cfg.tgToken && cfg.tgChatId),
      },
      status,
      dumps: dumps.slice(0, 20),
    };
  }

  async offsiteSettings(body: any) {
    const row = await this.prisma.setting.findUnique({ where: { key: 'backup.offsite' } }).catch(() => null);
    const cur: any = (row?.value as any) || {};
    const next: any = { ...cur };
    if (body.enabled !== undefined) next.enabled = !!body.enabled;
    if (body.hour !== undefined) {
      const h = Number(body.hour);
      if (Number.isNaN(h) || h < 0 || h > 23) throw new BadRequestException('الساعة غير صالحة (0-23)');
      next.hour = h;
    }
    if (body.tgChatId !== undefined) next.tgChatId = sanitizeText(body.tgChatId, 40);
    // التوكن: يُحدَّث فقط إن أُدخلت قيمة جديدة غير مقنّعة
    if (body.tgToken && !String(body.tgToken).includes('•')) next.tgToken = sanitizeText(body.tgToken, 80);
    await this.prisma.setting.upsert({
      where: { key: 'backup.offsite' },
      create: { group: 'general', key: 'backup.offsite', value: next },
      update: { value: next },
    });
    return { ok: true };
  }

  // 🚀 نسخة فورية — ملف إشارة تلتقطه حاوية النسخ خلال 60 ثانية
  async offsiteTrigger() {
    this.ensureDir();
    fs.writeFileSync(path.join(BACKUP_DIR, 'TRIGGER_NOW'), String(Date.now()));
    return { ok: true, message: 'طُلبت نسخة فورية — تبدأ خلال دقيقة وتصلك على تيليجرام' };
  }

  // 🔗 اختبار الربط بتيليجرام
  async offsiteTest() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'backup.offsite' } }).catch(() => null);
    const cfg: any = (row?.value as any) || {};
    if (!cfg.tgToken || !cfg.tgChatId) throw new BadRequestException('أدخل توكن البوت ومعرّف المحادثة واحفظ أولاً');
    try {
      const res = await fetch(`https://api.telegram.org/bot${cfg.tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cfg.tgChatId,
          text: '✅ تم ربط النسخ الاحتياطي لمنصة يمن زون بنجاح!\nستصلك النسخ اليومية الكاملة هنا تلقائياً 🛡️',
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const data: any = await res.json();
      if (!data.ok) throw new Error(data.description || 'رفض تيليجرام الطلب');
      return { ok: true };
    } catch (e: any) {
      throw new BadRequestException(`فشل الاتصال: ${String(e?.message || e).slice(0, 140)} — تحقق من التوكن والمعرّف`);
    }
  }
}
