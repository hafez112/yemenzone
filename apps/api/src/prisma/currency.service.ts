import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { convertMoney } from '../common/money';

export type CurrencyRow = {
  code: string;
  name: string;
  symbol: string;
  rateToUsd: number;
  isDefault: boolean;
  isActive: boolean;
};

/**
 * محوّل العملات المركزي — يقرأ العملات والأسعار التي تحددها إدارة المنصة
 * rateToUsd = كم وحدة من العملة تساوي 1 دولار
 */
@Injectable()
export class CurrencyService {
  private cache: { at: number; rows: CurrencyRow[] } | null = null;
  private readonly ttl = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  /** كل العملات المعروفة (نشطة وغير نشطة) — للسجلات التاريخية */
  async all(): Promise<CurrencyRow[]> {
    if (this.cache && Date.now() - this.cache.at < this.ttl) return this.cache.rows;
    const rows = await this.prisma.currency.findMany({ orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] });
    const mapped = rows.map((c: any) => ({
      code: c.code, name: c.name, symbol: c.symbol,
      rateToUsd: Number(c.rateToUsd), isDefault: c.isDefault, isActive: c.isActive,
    }));
    this.cache = { at: Date.now(), rows: mapped };
    return mapped;
  }

  /** العملات النشطة فقط — للعمليات الجديدة */
  async active(): Promise<CurrencyRow[]> {
    return (await this.all()).filter((c) => c.isActive);
  }

  /** العملة الافتراضية النشطة للمنصة */
  async default(): Promise<CurrencyRow> {
    const list = await this.all();
    return list.find((c) => c.isDefault && c.isActive) || list.find((c) => c.isDefault) || list[0]
      || { code: 'YER', name: 'ريال يمني', symbol: 'ر.ي', rateToUsd: 250, isDefault: true, isActive: true };
  }

  /** التحقق من كود عملة لعملية جديدة — يجب أن تكون نشطة */
  async requireActive(code?: string): Promise<CurrencyRow> {
    if (!code) return this.default();
    const c = (await this.all()).find((x) => x.code === String(code).toUpperCase());
    if (!c || !c.isActive) throw new BadRequestException(`العملة ${code} غير متاحة — اختر عملة نشطة من إعدادات المنصة`);
    return c;
  }

  /** جلب عملة معروفة حتى لو غير نشطة (للسجلات التاريخية) */
  async known(code?: string): Promise<CurrencyRow> {
    if (!code) return this.default();
    const c = (await this.all()).find((x) => x.code === String(code).toUpperCase());
    return c || this.default();
  }

  /** تحويل مبلغ من عملة إلى أخرى بأسعار الإدارة الحالية */
  async convert(amount: number, fromCode: string | undefined, toCode: string | undefined): Promise<number> {
    const from = await this.known(fromCode);
    const to = await this.known(toCode);
    if (from.code === to.code) return Math.round((Number(amount) || 0) * 100) / 100;
    return convertMoney(amount, from.rateToUsd, to.rateToUsd);
  }

  invalidate() { this.cache = null; }
}
