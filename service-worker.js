self.addEventListener('install', event => {
  const cacheName = 'akuntansi-pro-v1';
  const assets = ['/', '/index.html', '/style.css', '/script.js', '/manifest.json', '/icon-192.png', '/icon-512.png'];
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
    return caches.open('akuntansi-pro-v1').then(cache => { cache.put(event.request, res.clone()); return res; });
  }).catch(()=>caches.match('/index.html'))));
});
