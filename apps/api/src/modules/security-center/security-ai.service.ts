import { Injectable } from '@nestjs/common';
import { analyzeSecurityLogs, SecurityLogEntry, ThreatReport } from '../../libs/security';

// 🤖 ذكاء الأمن المحلي: تحليل التهديدات وكشف أنماط الهجوم
//    أوامر التحليل تُستدعى من مكتبة libs/security (محرك التهديدات)
@Injectable()
export class SecurityAiService {
  // تحليل سجلات آخر 24 ساعة → مستوى تهديد + مشتبه بهم + توصيات
  analyze(logs: SecurityLogEntry[]): ThreatReport {
    return analyzeSecurityLogs(logs);
  }
}
