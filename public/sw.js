const CACHE = 'ca-firm-v1';
const PRECACHE = ['/', '/index.html', '/manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) return;
  e.respondWith(caches.match(e.request).then(cached => {
    const net = fetch(e.request).then(res => { if (res?.status===200) { const c=res.clone(); caches.open(CACHE).then(ca=>ca.put(e.request,c)); } return res; }).catch(()=>cached);
    return cached||net;
  }));
});
