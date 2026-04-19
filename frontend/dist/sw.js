const CACHE = 'edupulse-v1';
const OFFLINE_URL = '/';

// Cache app shell on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([OFFLINE_URL, '/manifest.json']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for API calls, cache-first for assets
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) {
    // Always go to network for API
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'Offline' }), { headers: { 'Content-Type': 'application/json' } })));
  } else if (e.request.mode === 'navigate') {
    // Navigation: network first, fallback to cached shell
    e.respondWith(
      fetch(e.request).catch(() => caches.match(OFFLINE_URL))
    );
  } else {
    // Assets: cache first
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
  }
});
