// 🧪 اختبارات محرك الرؤى — يغذي التقارير الأسبوعية والتحليلات
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trendOf, stockLevel, analyzeSeries } from '../src/libs/ai/insights.engine';

test('trendOf يصنف الاتجاهات صحيحاً', () => {
  assert.equal(trendOf(50), 'rising');
  assert.equal(trendOf(-30), 'falling');
  assert.equal(trendOf(2), 'stable');
  assert.equal(trendOf(null), 'insufficient');
});

test('stockLevel ينبه على المخزون المنخفض', () => {
  assert.equal(stockLevel(0).level, 'empty');
  assert.equal(stockLevel(2).level, 'low');
  assert.equal(stockLevel(10).level, 'ok');
  assert.equal(stockLevel(50).level, 'high');
});

test('analyzeSeries تحسب النمو والاتجاه بين آخر فترتين', () => {
  const s = analyzeSeries([
    { label: 'أ', total: 100 }, { label: 'ب', total: 100 },
    { label: 'ج', total: 200 }, { label: 'د', total: 300 },
  ]);
  assert.equal(s.growth, 50);          // (300-200)/200
  assert.equal(s.trend, 'rising');
  assert.equal(s.best?.label, 'د');
  assert.ok((s.forecast ?? 0) > 0);

  const falling = analyzeSeries([{ label: 'أ', total: 500 }, { label: 'ب', total: 100 }]);
  assert.equal(falling.growth, -80);
  assert.equal(falling.trend, 'falling');

  const sparse = analyzeSeries([{ label: 'أ', total: 0 }]);
  assert.equal(sparse.trend, 'insufficient');
});
