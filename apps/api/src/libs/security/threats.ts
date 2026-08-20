// ═══════════════════════════════════════════════════════════════
//  🛡️ مكتبة يمن زون للأمن والحماية — محرك تحليل التهديدات
//  تحليل سجلات الأمن: درجة تهديد + مشتبه بهم + توصيات
//  (منطق نقي بلا تبعيات — يُستدعى من ذكاء مركز الأمن)
// ═══════════════════════════════════════════════════════════════

export interface SecurityLogEntry {
  event: string;
  ip: string | null;
  userType?: string | null;
  createdAt: Date | string;
  details?: any;
}

export interface Suspect { ip: string; fails: number; total: number; severity: 'high' | 'medium' }
export type ThreatLevel = 'low' | 'medium' | 'high';

export interface ThreatReport {
  threat: number;           // درجة التهديد 0-100
  level: ThreatLevel;
  suspects: Suspect[];
  recommendations: { icon: string; text: string }[];
  oddHours: string[];       // ساعات نشاط مريب بعد منتصف الليل
  stats: { fails: number; otpFails: number; bans: number; total: number };
}

// درجة التهديد من الإحصاءات الخام (0-100)
export function scoreThreat(stats: { fails: number; suspects: number; otpFails: number; bans: number }): number {
  let threat = 0;
  threat += Math.min(stats.fails * 3, 40);
  threat += Math.min(stats.suspects * 10, 30);
  threat += Math.min(stats.otpFails * 5, 15);
  threat += stats.bans > 0 ? 10 : 0;
  return Math.min(threat, 100);
}

// مستوى التهديد من الدرجة
export function threatLevel(score: number): ThreatLevel {
  return score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
}

// التحليل الكامل لسجلات فترة زمنية → تقرير تهديد جاهز للوحة
export function analyzeSecurityLogs(logs: SecurityLogEntry[]): ThreatReport {
  const byIp: Record<string, { fails: number; total: number; events: Set<string> }> = {};
  const byHour: Record<number, number> = {};
  let fails = 0, otpFails = 0, bans = 0;

  for (const l of logs) {
    const hour = new Date(l.createdAt).getHours();
    byHour[hour] = (byHour[hour] || 0) + 1;
    if (l.event.includes('fail') || l.event.includes('denied')) fails++;
    if (l.event.includes('otp') && l.event.includes('fail')) otpFails++;
    if (l.event === 'ban') bans++;
    if (l.ip) {
      byIp[l.ip] = byIp[l.ip] || { fails: 0, total: 0, events: new Set() };
      byIp[l.ip].total++;
      byIp[l.ip].events.add(l.event);
      if (l.event.includes('fail')) byIp[l.ip].fails++;
    }
  }

  // المشتبه بهم: 5+ إخفاقات أو 3+ إخفاقات مع 3+ أنواع أحداث مشبوهة
  const suspects: Suspect[] = Object.entries(byIp)
    .filter(([, v]) => v.fails >= 5 || (v.fails >= 3 && v.events.size >= 3))
    .map(([ip, v]): Suspect => ({ ip, fails: v.fails, total: v.total, severity: v.fails >= 10 ? 'high' : 'medium' }))
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 10);

  const threat = scoreThreat({ fails, suspects: suspects.length, otpFails, bans });
  const level = threatLevel(threat);

  // ساعات الذروة المشبوهة (1-5 فجراً بنشاط مرتفع)
  const oddHours = Object.entries(byHour)
    .filter(([h, c]) => (+h >= 1 && +h <= 5) && c >= 10)
    .map(([h]) => `${h}:00`);

  const recommendations: { icon: string; text: string }[] = [];
  if (suspects.length) recommendations.push({ icon: '🚫', text: `احظر ${suspects.length} عنوان IP مشتبه فوراً (أخطرها ${suspects[0].ip} بـ ${suspects[0].fails} محاولة فاشلة)` });
  if (oddHours.length) recommendations.push({ icon: '🌙', text: `نشاط مريب بعد منتصف الليل (${oddHours.join('، ')}) — راجع السجلات` });
  if (otpFails >= 3) recommendations.push({ icon: '🔐', text: 'محاولات تخمين OTP متكررة — فكّر بتقصير صلاحية الرمز' });
  if (level === 'low' && !recommendations.length) recommendations.push({ icon: '✅', text: 'لا تهديدات ملحوظة — المنصة آمنة' });

  return { threat, level, suspects, recommendations, oddHours, stats: { fails, otpFails, bans, total: logs.length } };
}
