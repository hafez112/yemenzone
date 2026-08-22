// 🧪 اختبارات توحيد أرقام الجوال — المسار الحرج: تسجيل/دخول/OTP/طلبات
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, phoneVariants, sanitizePhone } from '../src/libs/security/sanitize';

test('الرقم اليمني المحلي يُقبل كما هو', () => {
  assert.equal(normalizePhone('777123456'), '777123456');
  assert.equal(normalizePhone('700000000'), '700000000');
});

test('الرقم اليمني الدولي يُوحَّد إلى المحلي (توافق الحسابات القديمة)', () => {
  assert.equal(normalizePhone('+967777123456'), '777123456');
  assert.equal(normalizePhone('967777123456'), '777123456');
  assert.equal(normalizePhone('00967777123456'), '777123456');
});

test('المسافات والرموز لا تفسد الرقم', () => {
  assert.equal(normalizePhone('+967 777 123 456'), '777123456');
  assert.equal(normalizePhone('  777-123-456 '), '777123456');
});

test('الأرقام الأجنبية تُحفظ بالصيغة الدولية', () => {
  assert.equal(normalizePhone('+966512345678'), '+966512345678');
  assert.equal(normalizePhone('+201012345678'), '+201012345678');
  assert.equal(normalizePhone('00966512345678'), '+966512345678');
});

test('الأرقام الفاسدة تُرفض', () => {
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('999999999'), null); // يمني لا يبدأ بـ 7
  assert.equal(normalizePhone('abc'), null);
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone(undefined), null);
});

test('صيغ البحث تغطي كل التخزينات القديمة المحتملة', () => {
  const v = phoneVariants('777123456');
  assert.ok(v.includes('777123456'));
  assert.ok(v.includes('+967777123456'));
  assert.ok(v.includes('967777123456'));
  assert.ok(v.includes('00967777123456'));
  // الأجنبي: صيغة واحدة فقط
  assert.deepEqual(phoneVariants('+966512345678'), ['+966512345678']);
});

test('sanitizePhone يزيل المحارف الخطيرة', () => {
  assert.equal(sanitizePhone('+967777123456<script>'), '+967777123456');
  assert.equal(sanitizePhone('77+71++23456'), '777123456'); // + في المنتصف تُزال
});
