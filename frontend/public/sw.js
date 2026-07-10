const CACHE_NAME = 'roomcanvas-shell-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/branding/logo.svg',
  '/branding/logo.png',
  '/branding/favicon-32x32.png',
  '/branding/favicon-16x16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Do not cache API requests
  if (url.pathname.startsWith('/api') || url.port === '8000') {
    return;
  }
  
  // For navigation requests or static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        // Network first for non-cached files
        return fetch(event.request).then(networkResponse => {
          // If it's a valid response from same origin, we could optionally cache it here.
          // But a minimal app shell caching is requested.
          return networkResponse;
        });
      })
  );
});
