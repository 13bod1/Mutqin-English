const CACHE_PREFIX = 'adel-mostafa-pwa-';
const CACHE_NAME = CACHE_PREFIX + 'v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/offline.html',
];

// Helper to determine if a request contains protected video content
function isProtectedMedia(requestUrl) {
  const path = new URL(requestUrl, self.location.origin).pathname.toLowerCase();
  return /\.(?:mp4|m3u8|m4s|ts|webm|mpd|key)$/.test(path)
    || /\/(?:storage|api|rest|auth)\//.test(path)
    || path.includes('/recorded%20lecture/') || path.includes('live-stream');
}

function safeNotificationTarget(value) {
  try {
    const target = new URL(value || '/', self.location.origin);
    if (target.origin === self.location.origin && ['http:', 'https:'].includes(target.protocol)) {
      return target.href;
    }
  } catch (_) { /* Invalid payload targets fall back to this application. */ }
  return new URL('/', self.location.origin).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Only this explicit public asset list may participate in cache lookup.
  // Never look up authenticated/API/media responses, even if an old cache contains one.
  if (request.method !== 'GET' || url.origin !== self.location.origin
      || isProtectedMedia(request.url) || request.headers.has('Authorization')
      || (!STATIC_ASSETS.includes(url.pathname) && request.mode !== 'navigate') || url.search) {
    return;
  }
  event.respondWith(fetch(request).catch(async () => {
    if (request.mode === 'navigate') return caches.match('/offline.html');
    const cached = await caches.match(request);
    return cached || Response.error();
  }));
});

// Web Push Notification Handling
self.addEventListener('push', (event) => {
  let payload = { title: 'Mr. Adel Mostafa Academy', body: 'New update available!', url: '/' };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: { url: safeNotificationTarget(payload.url) },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = safeNotificationTarget(event.notification.data?.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
