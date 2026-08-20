import { Injectable } from '@nestjs/common';

// 🤖 ذكاء محلي: نصائح صحّة النسخ الاحتياطية
@Injectable()
export class BackupAiService {
  tips(records: { size: number | null; createdAt: Date }[], tableCounts: Record<string, number>) {
    const tips: string[] = [];
    if (!records.length) {
      tips.push('🚨 لا توجد أي نسخة احتياطية — أنشئ أول نسخة الآن قبل فوات الأوان');
      tips.push('💡 القاعدة الذهبية: نسخة يومية أسبوعياً محفوظة خارج الخادم');
      return tips;
    }
    const last = records[0];
    const ageHours = (Date.now() - new Date(last.createdAt).getTime()) / 3600000;
    if (ageHours > 168) tips.push(`🚨 آخر نسخة منذ ${Math.floor(ageHours / 24)} يوم — خطر حقيقي! انسخ أسبوعياً على الأقل`);
    else if (ageHours > 48) tips.push(`⚠️ آخر نسخة منذ ${Math.floor(ageHours / 24)} يوم — المنصة تنمو، اجعلها يومية`);
    else tips.push(`✅ نسختك حديثة (منذ ${Math.max(Math.floor(ageHours), 1)} ساعة) — استمر`);

    // نمو الحجم
    if (records.length >= 2 && last.size && records[records.length - 1].size) {
      const growth = ((last.size - records[records.length - 1].size!) / records[records.length - 1].size!) * 100;
      if (growth > 50) tips.push(`📈 حجم البيانات نما ${Math.round(growth)}% منذ أقدم نسخة — راجع مساحة القرص دورياً`);
    }
    // أكبر الجداول
    const top = Object.entries(tableCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) tips.push(`🗄️ أكبر الجداول: ${top.map(([t, c]) => `${t} (${c.toLocaleString('en')})`).join('، ')}`);
    if (records.length >= 10) tips.push(`🧹 لديك ${records.length} نسخة — احتفظ بآخر 5 واحذف الأقدم لتوفير المساحة`);
    tips.push('💾 حمّل نسخة على جهازك أو تخزين سحابي — النسخة على نفس الخادم لا تحمي من عطل القرص');
    return tips;
  }
}
