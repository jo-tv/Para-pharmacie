self.addEventListener("install", (event) => {
  // تثبيت سريع بدون كاش
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // تفعيل مباشر
  clients.claim();
});

// يمكن ترك fetch فاضي أو بدون أي معالجة
self.addEventListener("fetch", (event) => {
  // هنا نسمح لكل الطلبات تمر عادي بدون كاش
});