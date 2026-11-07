const CACHE_NAME = 'rituales-tickets-v3.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css?v=3.0',
  './js/storage.js?v=3.0',
  './js/sync.js?v=3.0',
  './js/dashboard.js?v=3.0',
  './js/sales.js?v=3.0',
  './js/inventory.js?v=3.0',
  './js/ui.js?v=3.0',
  './assets/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Network first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
