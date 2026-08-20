'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// ═══ خطّاف قفل الميزات — يفحص ميزات المتجر الفعالة من الخادم ═══
// الاستخدام: const gate = useFeatureGate('analytics'); ثم إن gate.locked اعرض FeatureLock
export function useFeatureGate(feature: string) {
  const [state, setState] = useState<{ checking: boolean; locked: boolean; store: any }>({
    checking: true, locked: false, store: null,
  });

  useEffect(() => {
    let live = true;
    api('/stores/my')
      .then((s) => { if (live) setState({ checking: false, locked: !s.features?.[feature], store: s }); })
      .catch(() => { if (live) setState({ checking: false, locked: false, store: null }); });
    return () => { live = false; };
  }, [feature]);

  return state;
}
