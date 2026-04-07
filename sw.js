/**
 * SCORY — Service Worker
 * Cache les assets statiques pour un chargement instantane au 2e visit.
 */
const CACHE_NAME = "scory-v3";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./defaut.css",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./image/fond4Day.jpg",
  "./image/fondClara.jpg",
  "./image/fondFlaynn.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Network first pour le HTML, cache first pour les assets
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
