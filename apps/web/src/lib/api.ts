// عميل API موحّد مع تجديد تلقائي للرمز
const API = process.env.NEXT_PUBLIC_API_URL || '';

let refreshing: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  const rt = localStorage.getItem('yz_refresh');
  if (!rt) return null;
  try {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) { logout(); return null; }
    const data = await res.json();
    localStorage.setItem('yz_token', data.accessToken);
    localStorage.setItem('yz_refresh', data.refreshToken);
    return data.accessToken;
  } catch { return null; }
}

export async function api(path: string, options: RequestInit = {}, retry = true): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('yz_token') : null;
  const res = await fetch(`${API}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && retry && typeof window !== 'undefined') {
    refreshing = refreshing || refreshToken().finally(() => (refreshing = null));
    const newToken = await refreshing;
    if (newToken) return api(path, options, false);
    throw new Error('الجلسة منتهية');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'حدث خطأ — حاول مجدداً');
  return data;
}

// رابط عرض صورة مرفوعة — المسارات النسبية تمر عبر بروكسي /uploads في الإنتاج
export function imgUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API}${path}`;
}

// رفع ملفات (FormData) — بدون Content-Type يدوي ليضبط المتصفح الحدود تلقائياً
export async function apiUpload(path: string, field: string, file: File, retry = true, extra?: Record<string, string>): Promise<any> {
  const token = localStorage.getItem('yz_token');
  const fd = new FormData();
  fd.append(field, file);
  if (extra) for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  const res = await fetch(`${API}/api${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (res.status === 401 && retry) {
    refreshing = refreshing || refreshToken().finally(() => (refreshing = null));
    const newToken = await refreshing;
    if (newToken) return apiUpload(path, field, file, false, extra);
    throw new Error('الجلسة منتهية');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'فشل رفع الصورة');
  return data;
}

export function saveSession(data: any, type: string) {
  localStorage.setItem('yz_token', data.accessToken);
  localStorage.setItem('yz_refresh', data.refreshToken);
  localStorage.setItem('yz_user', JSON.stringify(data.user));
  localStorage.setItem('yz_type', type);
}

export function logout() {
  ['yz_token', 'yz_refresh', 'yz_user', 'yz_type'].forEach(k => localStorage.removeItem(k));
  window.location.href = '/';
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('yz_user');
  return u ? JSON.parse(u) : null;
}
