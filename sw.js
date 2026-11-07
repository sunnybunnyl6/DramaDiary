/* Drama Diary service worker: precache the app shell, then serve cache-first
   (with background refresh) so everything works 100% offline.
   Bump CACHE_VERSION whenever you deploy a new index.html. */
const CACHE_VERSION = 'v3';
const CACHE = `drama-diary-${CACHE_VERSION}`;
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => null);

      if (cached) return cached;                       // instant, offline-safe
      return refresh.then((res) =>
        res || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())
      );
    })
  );
});
