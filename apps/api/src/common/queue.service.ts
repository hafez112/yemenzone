import { Injectable, Logger } from '@nestjs/common';

// 📦 طوابير مهام خفيفة داخل العملية — تنفيذ متسلسل لكل طابور مع إحصاءات
// تمنع تضارب المهام الثقيلة (نسخ احتياطي، بث جماعي) ولا تحجب طلبات الويب
@Injectable()
export class QueueService {
  private readonly logger = new Logger('Queue');
  private tails = new Map<string, Promise<any>>();
  private counts = new Map<string, { done: number; failed: number; running: boolean }>();

  // أضف مهمة لطابور — تُنفذ بعد اكتمال ما قبلها في نفس الطابور
  enqueue<T>(queue: string, job: () => Promise<T>): Promise<T> {
    const tail = this.tails.get(queue) || Promise.resolve();
    const c = this.counts.get(queue) || { done: 0, failed: 0, running: false };
    this.counts.set(queue, c);
    c.running = true;
    const run = tail
      .catch(() => {})
      .then(async () => {
        try {
          const r = await job();
          c.done++;
          return r;
        } catch (e: any) {
          c.failed++;
          this.logger.warn(`[${queue}] فشلت مهمة: ${e?.message}`);
          throw e;
        } finally {
          c.running = false;
        }
      });
    this.tails.set(queue, run.catch(() => {}));
    return run;
  }

  stats() {
    const out: Record<string, any> = {};
    for (const [name, c] of this.counts) out[name] = { ...c };
    return out;
  }
}
