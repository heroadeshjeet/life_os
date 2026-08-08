/**
 * Life_OS v2 — Service Worker.
 *
 * Caches the app shell for offline use. Uses a network-first strategy
 * for API routes and a cache-first strategy for static assets.
 */
const CACHE_NAME = "life-os-v2-2026-08";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/favicon.svg",
  "/icons/apple-touch-icon.svg",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Ignore failures — we'll cache on demand
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for navigation, cache-first for assets
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Skip non-GET requests
  if (req.method !== "GET") return;

  // Skip Chrome extension requests
  if (req.url.startsWith("chrome-extension://")) return;

  // Skip cross-origin requests (like Google Fonts)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation requests (HTML pages)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            return cached || caches.match("/");
          });
        })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
