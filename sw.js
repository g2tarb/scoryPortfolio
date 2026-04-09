/**
 * SCORY — Service Worker
 * Cache les assets statiques pour un chargement instantane au 2e visit.
 */
const CACHE_NAME = "scory-v7";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./defaut.css",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./i18n.js",
  "./chatbot.js",
  "./booking.js",
  "./particles.js",
  "./three-neural.js",
  "./three-water.js",
  "./aurora.js",
  "./universe.js",
  "./nebula-flaynn.js",
  "./cursor.js",
  "./audio.js",
  "./image/fond4Day.jpg",
  "./image/fondClara.jpg",
  "./image/fondFlaynn.jpg",
  "./image/fondAnimus.png",
  "./image/4dayMobile.jpg",
  "./image/claramartinezMobile.jpg",
  "./image/flaynnMobile.jpg",
  "./image/animusMobile.jpeg",
  "./image/og-image.jpg",
  "./manifest.json",
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
