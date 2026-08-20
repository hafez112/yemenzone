// 🧪 اختبارات آلية للمنطق المالي والحماية — بلا أي حزم إضافية
// التشغيل داخل حاوية الـ API (Node 22): npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcCommission, settlementNet, serialNumber, safeName, safeFolder } from '../src/common/money.ts';

test('عمولة المنصة: نسبة مئوية بدقة كسرين', () => {
  assert.equal(calcCommission(10000, 5), 500);
  assert.equal(calcCommission(9999, 2.5), 249.98);
  assert.equal(calcCommission(0, 5), 0);
  assert.equal(calcCommission(1500, 0), 0);
});

test('العمولة لا تكون سالبة أبداً مهما كان الإدخال', () => {
  assert.equal(calcCommission(-500, 5), 0);
  assert.equal(calcCommission(1000, -3), 0);
  assert.equal(calcCommission(NaN, 5), 0);
  assert.equal(calcCommission(1000, NaN), 0);
});

test('صافي التسوية = المبيعات − العمولة − الاسترجاعات (بحد أدنى صفر)', () => {
  assert.equal(settlementNet(10000, 500, 0), 9500);
  assert.equal(settlementNet(10000, 500, 1200), 8300);
  assert.equal(settlementNet(1000, 800, 500), 0); // استرجاعات تجاوزت — لا سالب
});

test('الأرقام التسلسلية: 6 خانات مبطنة', () => {
  assert.equal(serialNumber('ST', 42), 'ST-000042');
  assert.equal(serialNumber('ORD', 123456), 'ORD-123456');
  assert.equal(serialNumber('ST', -5), 'ST-000000');
});

test('safeName يمنع اختراق المسارات', () => {
  assert.equal(safeName('../../etc/passwd'), 'etc_passwd');
  assert.equal(safeName('صورة المنتج.jpg'), 'صورة المنتج.jpg');
  assert.equal(safeName('a<b>c.jpg'), 'a_b_c.jpg');
  assert.equal(safeName(''), 'file');
});

test('safeFolder ينظف أسماء المجلدات', () => {
  assert.equal(safeFolder('../../secret'), 'secret');
  assert.equal(safeFolder('شعبان 2026'), 'شعبان 2026');
});
