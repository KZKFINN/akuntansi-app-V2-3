
self.addEventListener('install', event => {
  const cacheName = 'akuntansi-auth-v1';
  const assets = ['/', '/index.html', '/style.css', '/script.js', '/manifest.json', '/icon-192.png', '/icon-512.png', 'https://cdn.jsdelivr.net/npm/chart.js', 'https://unpkg.com/lucide/dist/lucide.min.js'];
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
    return caches.open('akuntansi-auth-v1').then(cache => { cache.put(event.request, res.clone()); return res; });
  }).catch(()=>caches.match('/index.html'))));
});
