self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('petvax-store').then((cache) => cache.addAll([
      'index.html',
      'style.css',
      'app.js',
      'manifest.json',
      'happy.png'
    ])),
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});