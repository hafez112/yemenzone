// 💱 نظام العملات الحقيقي — العملات وأسعار الصرف تحددها إدارة المنصة
// كل مبلغ له عملة مصدر؛ العرض يحوّلها إلى العملة المختارة بأسعار الإدارة الحالية
'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export interface Cur {
  code: string;
  name: string;
  symbol: string;
  rateToUsd: number; // كم وحدة من العملة = 1 دولار
  isDefault: boolean;
}

let cache: Promise<Cur[]> | null = null;

// جلب العملات النشطة مرة واحدة لكل تحميل
export function loadCurrencies(): Promise<Cur[]> {
  if (!cache) {
    cache = fetch(`${API}/api/v1/currencies`)
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? d : []))
      .catch(() => []);
  }
  return cache;
}

export function selectCurrency(code: string) {
  localStorage.setItem('yz_cur', code);
  window.dispatchEvent(new Event('yz-cur'));
}

function smartRound(v: number): string {
  // عملات كبيرة الوحدة (دولار/ريال سعودي) بكسرين، والصغيرة بلا كسور
  return v >= 100 ? Math.round(v).toLocaleString('en-US') : (Math.round(v * 100) / 100).toLocaleString('en-US');
}

// تحويل رقمي صرف بين عملتين بأسعار الإدارة (rateToUsd)
export function convertAmount(amount: number, from: Cur | undefined, to: Cur | undefined): number {
  const a = Number(amount) || 0;
  if (!from || !to || from.code === to.code) return a;
  if (!from.rateToUsd || !to.rateToUsd) return a;
  return Math.round(((a * to.rateToUsd) / from.rateToUsd) * 100) / 100;
}

// 🪙 هوك العملة — العملة المختارة + تنسيق/تحويل واعيان بعملة المصدر
export function useCurrency() {
  const [state, setState] = useState<{ list: Cur[]; cur: Cur; def: Cur } | null>(null);

  useEffect(() => {
    let live = true;
    const init = () =>
      loadCurrencies().then((list) => {
        if (!list.length || !live) return;
        const def = list.find((c) => c.isDefault) || list[0];
        const sel = list.find((c) => c.code === localStorage.getItem('yz_cur')) || def;
        setState({ list, cur: sel, def });
      });
    init();
    const on = () => init();
    window.addEventListener('yz-cur', on);
    return () => { live = false; window.removeEventListener('yz-cur', on); };
  }, []);

  const findCur = (code?: string): Cur | undefined =>
    code ? state?.list.find((c) => c.code === String(code).toUpperCase()) : undefined;

  // تحويل رقمي: من عملة المصدر (افتراضياً عملة المنصة) إلى عملة معينة أو المختارة
  const convert = (amount: number, fromCode?: string, toCode?: string): number => {
    if (!state) return Number(amount) || 0;
    const from = findCur(fromCode) || state.def;
    const to = findCur(toCode) || state.cur;
    return convertAmount(amount, from, to);
  };

  // تنسيق مبلغ بعملته المصدر (fromCode) محوّلاً للعرض بالعملة المختارة
  // ملاحظة: استدعاء fmt(amount) بلا fromCode يفترض أن المبلغ بعملة المنصة الافتراضية
  const fmt = (amount: number, fromCode?: string): string => {
    if (!state) return `${Number(amount).toLocaleString()} ر.ي`;
    const { cur, def } = state;
    // عملة مصدر غير معروفة (تاريخية/معطلة) → اعرض الرقم كما هو مع رمزها
    if (fromCode && !findCur(fromCode)) {
      return `${Number(amount).toLocaleString()} ${String(fromCode).toUpperCase()}`;
    }
    const from = findCur(fromCode) || def;
    if (from.code === cur.code) return `${Number(amount).toLocaleString()} ${cur.symbol}`;
    const converted = convertAmount(amount, from, cur);
    return `${smartRound(converted)} ${cur.symbol}`;
  };

  return { list: state?.list || [], cur: state?.cur || null, def: state?.def || null, fmt, convert, ready: !!state };
}
