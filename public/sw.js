const CACHE_NAME = 'my-site-cache-v1';
const urlsToCache = [
  '/',
  '/ajouter',
  '/product',
  '/caisse',
  '/ticket',
  '/manifest.json',

  // 🖼️ أيقونات
  '/icons/icon-192.png',
  '/icons/icon-512.png',

  // 🎨 CSS
  '/css/admin.css',
  '/css/caisse.css',
  '/css/Dashboard.css',
  '/css/facture.css',
  '/css/login.css',
  '/css/product.css',
  '/css/ticket.css',

  // ⚙️ JavaScript
  '/js/admin.js',
  '/js/caisse.js',
  '/js/Dashboard.js',
  '/js/facture.js',
  '/js/login.js',
  '/js/product.js',
  '/js/ticket.js',
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});