// ═══════════════════════════════════════════════════════════════
//  🛡️ مكتبة يمن زون للأمن والحماية — محدد المعدل الانزلاقي
//  نافذة انزلاقية في الذاكرة لكل مفتاح (نطاق + IP)
//  تُستدعى من: جدار الحماية الأمامي + حارس نقاط الدخول الحساسة
// ═══════════════════════════════════════════════════════════════

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  private ops = 0;

  constructor(private sweepEvery = 500) {}

  // يعيد true إذا سُمح بالطلب (ويسجله) — false إذا تجاوز الحد
  allow(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    let arr = (this.hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= limit) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);

    // 🧹 كنس دوري للذاكرة كل N عملية — يمنع تراكم المفاتيح الميتة
    if (++this.ops % this.sweepEvery === 0) this.sweep(windowMs);
    return true;
  }

  // عدد الطلبات الحالية ضمن النافذة دون تسجيل طلب جديد
  count(key: string, windowMs: number): number {
    const now = Date.now();
    return (this.hits.get(key) || []).filter((t) => now - t < windowMs).length;
  }

  // كنس المفاتيح التي انتهت نوافذها
  sweep(windowMs: number) {
    const now = Date.now();
    for (const [k, v] of this.hits) {
      const fresh = v.filter((t) => now - t < windowMs);
      if (fresh.length) this.hits.set(k, fresh);
      else this.hits.delete(k);
    }
  }

  // إحصاء تشخيصي (للوحة الأمن)
  get size(): number { return this.hits.size; }
}

// مصنع جاهز: محدد بذاكرة مستقلة
export function createLimiter(sweepEvery = 500): SlidingWindowLimiter {
  return new SlidingWindowLimiter(sweepEvery);
}
