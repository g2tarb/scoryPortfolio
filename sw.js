/**
 * SCORY — Service Worker v8
 * Cache les assets statiques + CDN critiques pour resilience totale.
 */
const CACHE_NAME = "scory-v17";
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
  "./aurora.js",
  "./universe.js",
  "./cursor.js",
  "./audio.js",
  "./manifest.json",
  "./fondAnime/secureEats.mp4",
];

// CDN critiques — cache au premier usage (stale-while-revalidate)
const CDN_ORIGINS = ["unpkg.com", "fonts.googleapis.com", "fonts.gstatic.com"];

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
  const url = new URL(e.request.url);

  // HTML: network first, fallback cache
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // CDN (Three.js, GSAP, Lenis, Fonts): stale-while-revalidate
  // Sert depuis le cache immediatement + met a jour en arriere-plan
  if (CDN_ORIGINS.some((origin) => url.hostname.includes(origin))) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((cached) => {
          const fetchPromise = fetch(e.request).then((response) => {
            if (response.ok) cache.put(e.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Tout le reste: cache first, fallback network
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
