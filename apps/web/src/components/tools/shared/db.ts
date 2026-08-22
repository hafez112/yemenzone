'use client';
import { useEffect, useRef, useState } from 'react';
import { loadToolData, saveToolData, sessionType } from '@/lib/tool-db';

// 🗄️ خطاف قاعدة بيانات الخدمة الموحّد — قلب كل الخدمات المدفوعة
// • بدون دخول: يعمل على localStorage فقط
// • مع دخول: قاعدة بيانات الخدمة في الحساب هي المرجع، وتندمج معها النسخة المحلية (السحابي يكسب)
// • الحفظ مؤجل 800ms لجمع التعديلات المتتالية
export function useToolDB<T>(slug: string, initial: T, lsKey: string) {
  const [data, setData] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const cloudOn = useRef(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    let local: T = initial;
    try { const raw = localStorage.getItem(lsKey); if (raw) local = JSON.parse(raw); } catch {}
    if (sessionType()) {
      loadToolData<T>(slug).then((cloud) => {
        cloudOn.current = true;
        const empty = (v: any) => v == null || (Array.isArray(v) && v.length === 0);
        let merged: T;
        if (!empty(cloud) && Array.isArray(cloud) && Array.isArray(local) && local.length) {
          // دمج ذكي للمصفوفات ذات المعرفات — السحابي أولاً ثم ما فُقد من المحلي
          const ids = new Set((cloud as any[]).map((c) => c?.id));
          merged = [...(cloud as any[]), ...(local as any[]).filter((l) => !ids.has(l?.id))] as T;
        } else {
          merged = (!empty(cloud) ? cloud : local) as T;
        }
        setData(merged);
        // رفع أولي إن كانت السحابة فارغة والمحلي فيه بيانات، أو الدمج أضاف عناصر
        if (JSON.stringify(merged) !== JSON.stringify(cloud) && !empty(merged)) {
          saveToolData(slug, merged).catch(() => {});
        }
        setReady(true);
      }).catch(() => { setData(local); setReady(true); });
    } else {
      setData(local); setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(lsKey, JSON.stringify(data)); } catch {}
    if (cloudOn.current) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { saveToolData(slug, data).catch(() => {}); }, 800);
    }
  }, [data, ready]);

  return { data, setData, ready, isCloud: cloudOn.current };
}
