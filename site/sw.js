// Offline Service Worker for ID Recovery Kit
const CACHE_NAME = 'id-recovery-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app/',
  './app/index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Always prioritize local cache for total offline privacy
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(e.request).catch(() => {
        // Fallback to cached index for navigation
        if (e.request.mode === 'navigate') {
          return caches.match('./app/index.html') || caches.match('./index.html');
        }
      });
    })
  );
});
