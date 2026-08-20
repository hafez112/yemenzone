import { Injectable } from '@nestjs/common';
import {
  CATEGORY_SUGGESTIONS, cleanName,
  generateProductDescription, suggestSalePrice,
  smartSort, storefrontProductScore, stockLevel,
} from '../../libs/ai';

// ═══════════════════════════════════════════════
//  الذكاء المحلي للمنتجات — أوامره تُستدعى من مكتبة libs/ai
//  اقتراح أصناف + توليد أوصاف + تحسين أسماء
// ═══════════════════════════════════════════════
@Injectable()
export class ProductAiService {

  // 1) اقتراح أصناف حسب نشاط المتجر
  suggestCategories(activity: string, existingNames: string[]) {
    const list = CATEGORY_SUGGESTIONS[activity] || CATEGORY_SUGGESTIONS.food;
    return list.filter(c => !existingNames.includes(c.name)).slice(0, 8);
  }

  // 2) توليد وصف منتج تسويقي ذكي
  generateDescription(productName: string, categoryName?: string) {
    return generateProductDescription(productName, categoryName);
  }

  // 3) تحسين اسم المنتج (تنسيق ذكي)
  enhanceName(raw: string): string {
    return cleanName(raw);
  }

  // 4) اقتراح سعر تخفيض ذكي
  suggestSalePrice(price: number): number | null {
    return suggestSalePrice(price);
  }

  // 5) تحليل ذكي للمخزون
  stockAdvice(stock: number): { level: string; message: string; color: string } {
    return stockLevel(stock);
  }

  // 6) ترتيب ذكي للمنتجات في واجهة المتجر
  sortProductsSmart(products: any[]): any[] {
    return smartSort(products, storefrontProductScore);
  }
}
