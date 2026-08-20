import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

// ⚡ كاش موحّد — Redis تلقائياً عند توفر REDIS_URL، وإلا ذاكرة محلية بـ TTL
// لا يكسر الإقلاع أبداً: أي خلل في Redis يعيدنا للذاكرة المحلية صامتاً
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger('Cache');
  private memory = new Map<string, { v: any; exp: number }>();
  private redis: any = null;
  private hits = 0;
  private misses = 0;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) return;
    try {
      // تحميل كسول — الحزمة اختيارية
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require('ioredis');
      this.redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
      this.redis.on('error', () => { this.redis = null; });
      this.redis.connect().then(() => this.logger.log('متصل بـ Redis')).catch(() => { this.redis = null; });
    } catch {
      this.redis = null;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const raw = await this.redis.get(key);
        if (raw != null) { this.hits++; return JSON.parse(raw); }
        this.misses++;
        return null;
      }
    } catch { this.redis = null; }
    const e = this.memory.get(key);
    if (e && e.exp > Date.now()) { this.hits++; return e.v as T; }
    if (e) this.memory.delete(key);
    this.misses++;
    return null;
  }

  async set(key: string, value: any, ttlSec = 60): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.set(key, JSON.stringify(value), 'EX', Math.max(1, ttlSec));
        return;
      }
    } catch { this.redis = null; }
    // سقف حماية للذاكرة — 5000 مفتاح كحد أقصى
    if (this.memory.size > 5000) this.memory.clear();
    this.memory.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
  }

  async del(...keys: string[]): Promise<void> {
    for (const k of keys) this.memory.delete(k);
    try {
      if (this.redis && keys.length) await this.redis.del(...keys);
    } catch { /* الذاكرة المحلية تكفي */ }
  }

  // اقرأ من الكاش أو احسب وخزّن
  async wrap<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit != null) return hit;
    const v = await fn();
    await this.set(key, v, ttlSec);
    return v;
  }

  stats() {
    return {
      driver: this.redis ? 'redis' : 'memory',
      memoryEntries: this.memory.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses ? Math.round((this.hits / (this.hits + this.misses)) * 100) : 0,
    };
  }

  onModuleDestroy() {
    try { this.redis?.disconnect?.(); } catch {}
  }
}
