// Minimal offline support: cache pages you've actually visited and static
// assets, so opening the app with no signal shows your last-seen data
// instead of a blank error. Nothing here queues writes — mutations are
// guarded client-side (see useOnlineGuard) instead of attempted offline,
// so there's no risk of silently losing or conflicting edits on a shared
// list. Supabase requests (a different origin) are never touched here.

const CACHE_NAME = "shopping-web-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever handle our own origin's GET requests.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  const isStaticAsset = request.url.includes("/_next/static/") || request.destination === "image";

  if (isStaticAsset) {
    // Cache-first: these are immutable, content-hashed build outputs.
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network-first: always prefer live data; fall back to the last
    // successful load of this page when there's no connection.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    );
  }
});
