import { Injectable } from '@nestjs/common';
import {
  ACTIVITY_KEYWORDS, KIND_PRESETS, KIND_TIPS, CATEGORY_SUGGESTIONS,
  categoryById, scoreKeywords,
  generateStoreDescription, suggestTheme,
} from '../../libs/ai';

// إعادة تصدير للتوافق مع الاستخدامات القائمة
export { PRODUCT_CATEGORIES } from '../../libs/ai';

// ═══════════════════════════════════════════════════════════
//  خدمة الذكاء المحلي للمتاجر — أوامرها تُستدعى من مكتبة libs/ai
//  (محرك قواعد ذكي يحلل نشاط التاجر وينشئ إعدادات اللوحة المناسبة)
// ═══════════════════════════════════════════════════════════
@Injectable()
export class LocalAiService {

  // 1) تحليل اسم المتجر وكشف نشاطه تلقائياً (من مكتبة النصوص) — المنتجات والمطاعم والمولات
  detectCategory(storeName: string, kind: string): string | null {
    if (kind !== 'products' && kind !== 'restaurants' && kind !== 'malls') return null;
    return scoreKeywords(storeName, ACTIVITY_KEYWORDS).key;
  }

  // 2) الإعداد الذكي الكامل للوحة التاجر
  generateSetup(input: { kind: string; name: string; category?: string }) {
    const { kind, name } = input;
    const category = input.category || this.detectCategory(name, kind) || 'food';
    const preset = KIND_PRESETS[kind] || KIND_PRESETS.products;

    // وصف تسويقي + هوية بصرية — من محرك التوليد (لون دافئ برتقالي للمطاعم، بنفسجي فاخر للمولات)
    const catInfo = categoryById(category);
    const description = generateStoreDescription(kind, name, catInfo);
    const theme = suggestTheme(kind, category, kind === 'restaurants' ? '#EA580C' : kind === 'malls' ? '#7C3AED' : catInfo?.color);

    // تصنيفات مقترحة جاهزة للإنشاء — للمطاعم: أقسام منيو كاملة، للمولات: أصناف سوق شامل
    const suggestedCategories = kind === 'products'
      ? [{ name: catInfo?.name || 'عام', icon: catInfo?.icon || '📦' }]
      : kind === 'restaurants'
        ? CATEGORY_SUGGESTIONS.restaurants
        : kind === 'malls'
          ? CATEGORY_SUGGESTIONS.malls
          : [];

    return {
      detectedCategory: kind === 'products' || kind === 'restaurants' || kind === 'malls' ? category : null,
      categoryInfo: catInfo || null,
      description,
      theme,
      dashboard: {
        modules: preset.modules,
        quickActions: preset.quickActions,
        terms: preset.terms,
      },
      suggestedCategories,
      tips: KIND_TIPS[kind] || [],
    };
  }
}
