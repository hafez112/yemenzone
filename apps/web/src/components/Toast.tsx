'use client';
import { useEffect, useState } from 'react';

// نظام التنبيهات المنبثقة — Toast عند كل عملية
let push: (msg: string, type: 'success' | 'error') => void;
export function toast(msg: string, type: 'success' | 'error' = 'success') {
  if (push) push(msg, type);
}

export default function ToastHost() {
  const [items, setItems] = useState<{ id: number; msg: string; type: string }[]>([]);

  useEffect(() => {
    push = (msg, type) => {
      const id = Date.now();
      setItems(prev => [...prev, { id, msg, type }]);
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3500);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-xs">
      {items.map(i => (
        <div
          key={i.id}
          className={`px-4 py-3 rounded-xl text-white font-bold shadow-lg animate-bounce-in ${
            i.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        >
          {i.type === 'success' ? '✅ ' : '⚠️ '}{i.msg}
        </div>
      ))}
    </div>
  );
}
