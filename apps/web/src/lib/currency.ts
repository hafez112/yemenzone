// 💱 نظام العملات للعرض — الأسعار الأساسية بالريال اليمني (عملة المنصة الافتراضية)
// التحويل للعرض فقط — الدفع الفعلي يبقى بالعملة الأساسية
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

// 🪙 هوك العملة — يرجع العملة المختارة ودالة تنسيق تحوّل من العملة الافتراضية
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

  // تنسيق سعر أساسي (بالعملة الافتراضية) → العملة المختارة
  const fmt = (amount: number): string => {
    if (!state) return `${Number(amount).toLocaleString()} ر.ي`;
    const { cur, def } = state;
    if (cur.code === def.code) return `${Number(amount).toLocaleString()} ${cur.symbol}`;
    const converted = (Number(amount) * cur.rateToUsd) / def.rateToUsd;
    return `${smartRound(converted)} ${cur.symbol}`;
  };

  return { list: state?.list || [], cur: state?.cur || null, fmt, ready: !!state };
}
