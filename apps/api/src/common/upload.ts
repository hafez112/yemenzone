import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ═══ رفع الصور الموحد — ضغط WebP تلقائي، أسماء عشوائية آمنة ═══
export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

export function imageFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.startsWith('image/')) return cb(new BadRequestException('ملفات الصور فقط مسموحة'), false);
  cb(null, true);
}

// حفظ صورة واحدة → /uploads/[subdir/]name.webp
export async function saveImage(file: Express.Multer.File, subdir = '', maxSize = 1200): Promise<string> {
  if (!file) throw new BadRequestException('لم تُرسل صورة');
  const dir = subdir ? path.join(UPLOADS_DIR, subdir) : UPLOADS_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
  await sharp(file.buffer)
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(dir, name));
  return `/uploads/${subdir ? subdir + '/' : ''}${name}`;
}

// ═══ رفع الفيديو — يُحفظ كما هو (لا يمر عبر sharp) ═══
const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.m4v'];

export function videoFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!file.mimetype.startsWith('video/') && !VIDEO_EXTS.includes(ext)) {
    return cb(new BadRequestException('ملفات الفيديو فقط مسموحة (mp4 / webm / mov)'), false);
  }
  cb(null, true);
}

// حفظ فيديو → /uploads/videos/name.ext
export async function saveVideo(file: Express.Multer.File, subdir = 'videos'): Promise<string> {
  if (!file) throw new BadRequestException('لم يُرسل فيديو');
  const ext = path.extname(file.originalname || '').toLowerCase();
  const safeExt = VIDEO_EXTS.includes(ext) ? ext : '.mp4';
  const dir = path.join(UPLOADS_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
  fs.writeFileSync(path.join(dir, name), file.buffer);
  return `/uploads/${subdir}/${name}`;
}
