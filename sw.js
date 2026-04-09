// Lifecycle Manager — Service Worker v2
// Cache version — bump this number any time you deploy new files
const CACHE = 'lifecycle-v13';

const SHELL = [
  '/',
  '/index.html',
  '/vineyard.html',
  '/harvest.html',
  '/cellar.html',
  '/cellar-journal.html',
  '/blending-lab.html',
  '/skus.html',
  '/finance.html',
  '/financial-dashboard.html',
  '/suppliers.html',
  '/overhead-opex.html',
  '/vintage-manager.html',
  '/inventory.html',
  '/labor-rates.html',
  '/task-library.html',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — delete ALL old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    }).catch(() => {
      if (e.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
