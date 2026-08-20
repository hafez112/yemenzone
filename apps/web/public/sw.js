// يمن زون — Service Worker: تخزين ذكي للتصفح السريع والعمل دون اتصال + إشعارات فورية
const VERSION = 'yz-v3';
const STATIC_CACHE = `${VERSION}-static`;

// الأصول الأساسية تُخزن عند التثبيت — كل عنصر بمعزل عن الآخر حتى لا يُسقط عنصر مفقود التثبيت كله
const CORE = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // طلبات API: الشبكة دائماً — لا تخزين لبيانات متغيرة
  if (url.pathname.startsWith('/api/')) return;

  // الصفحات: الشبكة أولاً مع نسخة مخزنة عند انقطاع الاتصال
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // الأصول الثابتة والصور المرفوعة: الكاش أولاً ثم الشبكة
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetching = fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || fetching;
      })
    );
  }
});

// ═══ 🔔 إشعارات الويب الفورية — تصل حتى والمتصفح مغلق ═══
self.addEventListener('push', (e) => {
  let data = { title: 'يمن زون', body: '', url: '/' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      data: { url: data.url || '/' },
    })
  );
});

// النقر على الإشعار يفتح الرابط المقصود (أو يركّز التبويب القائم)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
