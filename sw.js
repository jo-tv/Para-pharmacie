const CACHE_NAME = 'myapp-static-v1';
const FILES_TO_CACHE = [
  '/',
  '/ajouter',
  '/caisse',
  '/ticket',
  '/facture',
  '/product',
  '/css/admin.css',
  '/css/caisse.css',
  '/css/ticket.css',
  '/css/facture.css',
  '/css/Dashboard.css',
  '/css/product.css',
  '/js/app.js',
  '/js/admin.js',
  '/js/caisse.js',
  '/js/ticket.js',
  '/js/facture.js',
  '/js/Dashboard.js',
  '/js/product.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then((cached) => {
      if (cached) return cached;
      return fetch(evt.request)
        .then((resp) => {
          // نسخ للـcache فقط للطلبات من نفس الأصل
          if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, respClone));
          return resp;
        })
        .catch(() => {
          // صفحة بديلة أو أيقونة عند الـoffline
          if (evt.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
    })
  );
});
