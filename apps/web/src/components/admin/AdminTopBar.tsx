'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, getUser, logout } from '@/lib/api';

const SKINS = [
  { id: 'night', icon: '🌙', label: 'ليلي', dot: '#6C3DF5' },
  { id: 'light', icon: '☀️', label: 'فاتح زجاجي', dot: '#F59E0B' },
  { id: 'royal', icon: '👑', label: 'ملكي ذهبي', dot: '#D97706' },
];

// 🛠️ الشريط العلوي الخاص بلوحة تحكم المنصة — هوية الإدارة + أنماط + تنبيهات + تثبيت
export default function AdminTopBar({ skin = 'night' }: { skin?: string }) {
  const path = usePathname();
  const [alertCount, setAlertCount] = useState(0);
  const [adminName, setAdminName] = useState('');
  const [installEvt, setInstallEvt] = useState<any>(null);
  const [skinOpen, setSkinOpen] = useState(false);

  function chooseSkin(id: string) {
    localStorage.setItem('yz_admin_skin', id);
    window.dispatchEvent(new CustomEvent('yz-admin-skin', { detail: id }));
    setSkinOpen(false);
  }

  useEffect(() => {
    setAdminName(getUser()?.name || '');
    let live = true;
    const fetchCount = () => api('/admin/alerts')
      .then(r => { if (live) setAlertCount(r.total || 0); })
      .catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    const onInstall = (e: any) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => { live = false; clearInterval(t); window.removeEventListener('beforeinstallprompt', onInstall); };
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 bg-slate-950/85 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-6xl mx-auto h-full px-3 flex items-center gap-2">
        {/* هوية الإدارة */}
        <Link href="/admin" className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 glow-soft"
            style={{ background: 'linear-gradient(135deg, #6C3DF5, #22D3EE)' }}>
            🛡️
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black text-white leading-tight truncate">لوحة المنصة</span>
            <span className="block text-[9px] text-purple-300 font-bold truncate">{adminName || 'الإدارة العليا'}</span>
          </span>
        </Link>

        <div className="flex-1" />

        {/* 🎨 مبدّل أنماط اللوحة */}
        <div className="relative shrink-0">
          <button onClick={() => setSkinOpen(!skinOpen)} aria-label="نمط اللوحة"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base text-gray-300 hover:bg-white/10 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            {SKINS.find(s => s.id === skin)?.icon || '🎨'}
          </button>
          {skinOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSkinOpen(false)} />
              <div className="absolute left-0 top-11 z-50 w-44 glass-strong rounded-2xl p-2 shadow-2xl anim-fade-up">
                <div className="text-[10px] font-extrabold text-gray-400 px-2 pb-1.5">🎨 نمط لوحتك</div>
                {SKINS.map(s => (
                  <button key={s.id} onClick={() => chooseSkin(s.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      skin === s.id ? 'bg-purple-600/15 text-gray-900' : 'text-gray-600 hover:bg-black/5'
                    }`}>
                    <span className="w-5 h-5 rounded-full shrink-0 shadow-inner" style={{ background: s.dot }} />
                    {s.icon} {s.label}
                    {skin === s.id && <span className="mr-auto text-purple-600">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 📱 تثبيت تطبيق اللوحة — يظهر عند توفره */}
        {installEvt && (
          <button onClick={async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); }}
            className="text-[10px] font-extrabold text-white px-3 py-1.5 rounded-full anim-soft-pulse shrink-0"
            style={{ background: 'linear-gradient(135deg, #059669, #0D9488)' }}>
            📱 ثبّت التطبيق
          </button>
        )}

        {/* 🔔 التنبيهات */}
        <Link href="/admin/alerts" aria-label="تنبيهات الإدارة"
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all shrink-0 ${
            path === '/admin/alerts' ? 'text-white' : 'text-gray-300 hover:bg-white/10'
          }`}
          style={path === '/admin/alerts' ? { background: 'var(--primary)' } : { background: 'rgba(255,255,255,0.06)' }}>
          🔔
          {alertCount > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center anim-pulse-glow">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </Link>

        {/* 👁️ معاينة المنصة */}
        <Link href="/" aria-label="معاينة المنصة"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base text-teal-300 hover:bg-white/10 transition-all shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          👁️
        </Link>

        {/* خروج */}
        <button onClick={() => logout()} aria-label="تسجيل الخروج"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base text-red-300 hover:bg-white/10 transition-all shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          ⏻
        </button>
      </div>
    </header>
  );
}
