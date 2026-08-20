import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityService } from '../../common/security.service';
import { UPLOADS_DIR } from '../../common/upload';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ROOT = () => path.join(UPLOADS_DIR, 'files');
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
// 🚫 امتدادات خطرة لا تُرفع أبداً (تنفيذية/تخريبية)
const BLOCKED_EXTS = ['.html', '.htm', '.js', '.mjs', '.php', '.sh', '.exe', '.bat', '.htaccess'];

// اسم مجلد/ملف آمن — يمنع الخروج من الجذر
const safeName = (s: string) => s.replace(/[\\\/\.\.]{1,}/g, '').replace(/[^\w\u0600-\u06FF\-\. ]/g, '').trim().slice(0, 60);
const safeFolder = (s: string) => s.replace(/[^a-zA-Z0-9\u0600-\u06FF\-_]/g, '').slice(0, 40);

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService, private security: SecurityService) {}

  async list(folder: string, q?: string) {
    const [files, folders, stats] = await Promise.all([
      this.prisma.platformFile.findMany({
        where: {
          folder: safeFolder(folder || ''),
          ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.platformFile.groupBy({ by: ['folder'], _count: true }),
      this.prisma.platformFile.aggregate({ _count: true, _sum: { size: true } }),
    ]);
    return {
      files,
      folders: folders.filter((f) => f.folder).map((f) => ({ name: f.folder, count: f._count })),
      stats: { count: stats._count, bytes: stats._sum.size || 0 },
    };
  }

  async upload(file: Express.Multer.File, folderRaw: string, adminId: string) {
    if (!file) throw new BadRequestException('لم يُرسل ملف');
    if (file.size > MAX_SIZE) throw new BadRequestException('الحد الأقصى 20 ميجابايت للملف');
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (BLOCKED_EXTS.includes(ext)) throw new BadRequestException('هذا النوع من الملفات غير مسموح لأسباب أمنية');

    const folder = safeFolder(folderRaw || '');
    const dir = folder ? path.join(ROOT(), folder) : ROOT();
    fs.mkdirSync(dir, { recursive: true });
    const disk = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext || ''}`;
    fs.writeFileSync(path.join(dir, disk), file.buffer);

    const relPath = `/uploads/files/${folder ? folder + '/' : ''}${disk}`;
    const name = safeName(file.originalname || disk) || disk;
    const row = await this.prisma.platformFile.create({
      data: { name, path: relPath, size: file.size, mime: file.mimetype || 'application/octet-stream', folder, uploadedBy: adminId },
    });
    await this.security.log('file_upload', { userType: 'admin', userId: adminId, details: `رفع ${name} (${Math.round(file.size / 1024)}KB)` });
    return row;
  }

  async rename(id: string, name: string) {
    const f = await this.prisma.platformFile.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('الملف غير موجود');
    const clean = safeName(name);
    if (!clean) throw new BadRequestException('الاسم غير صالح');
    return this.prisma.platformFile.update({ where: { id }, data: { name: clean } });
  }

  async move(id: string, folderRaw: string) {
    const f = await this.prisma.platformFile.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('الملف غير موجود');
    const folder = safeFolder(folderRaw || '');
    if (folder === f.folder) return f;
    // نقل فعلي على القرص مع تحديث المسار
    const disk = path.basename(f.path);
    const newDir = folder ? path.join(ROOT(), folder) : ROOT();
    fs.mkdirSync(newDir, { recursive: true });
    const oldAbs = path.join(UPLOADS_DIR, f.path.replace('/uploads/', ''));
    const newAbs = path.join(newDir, disk);
    try { fs.renameSync(oldAbs, newAbs); } catch { /* الملف قد يكون مفقوداً — نحدث السجل فقط */ }
    const newPath = `/uploads/files/${folder ? folder + '/' : ''}${disk}`;
    return this.prisma.platformFile.update({ where: { id }, data: { folder, path: newPath } });
  }

  async remove(id: string, adminId: string) {
    const f = await this.prisma.platformFile.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('الملف غير موجود');
    await this.prisma.platformFile.delete({ where: { id } });
    const abs = path.join(UPLOADS_DIR, f.path.replace('/uploads/', ''));
    // حماية: لا حذف خارج جذر الملفات
    if (abs.startsWith(ROOT())) { try { fs.unlinkSync(abs); } catch {} }
    await this.security.log('file_delete', { userType: 'admin', userId: adminId, details: `حذف ${f.name}` });
    return { ok: true };
  }
}
