import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../common/queue.service';
import { BackupAiService } from './backup-ai.service';
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
}
