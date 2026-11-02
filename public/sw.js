// my Mouny - Offline-first Service Worker for GitHub Pages subpath
const CACHE_NAME = "my-mouny-v2";
const SCOPE_BASE = "/My-Mouny/";
const INDEX_URL = SCOPE_BASE + "index.html";
const MANIFEST_URL = SCOPE_BASE + "manifest.json";

// Export scripts replace this list with every built JS/CSS asset.
const PRECACHE_ASSETS = [
  SCOPE_BASE,
  INDEX_URL,
  MANIFEST_URL,
  SCOPE_BASE + "favicon.png",
  SCOPE_BASE + "favicon.svg",
  SCOPE_BASE + "favicon.ico",
  SCOPE_BASE + "apple-touch-icon.png",
  SCOPE_BASE + "icons/icon-192.png",
  SCOPE_BASE + "icons/icon-512.png",
  SCOPE_BASE + "icons/icon-maskable.png",
  SCOPE_BASE + "screenshots/screenshot-mobile.png",
  SCOPE_BASE + "screenshots/screenshot-desktop.png",
  SCOPE_BASE + "fonts/ibm-plex-arabic-400.woff2",
  SCOPE_BASE + "fonts/ibm-plex-arabic-500.woff2",
  SCOPE_BASE + "fonts/ibm-plex-arabic-600.woff2",
  SCOPE_BASE + "fonts/ibm-plex-arabic-700.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE_ASSETS.map((url) => cache.add(url)));
    await cache.add(INDEX_URL);
    await cache.add(MANIFEST_URL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedIndex = await cache.match(INDEX_URL, { ignoreSearch: true });
      if (cachedIndex) {
        try {
          const networkResponse = await fetch(INDEX_URL, { cache: "no-store" });
          if (networkResponse.ok) await cache.put(INDEX_URL, networkResponse.clone());
        } catch (_) {}
        return cachedIndex;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          await cache.put(INDEX_URL, networkResponse.clone());
          return networkResponse;
        }
      } catch (_) {}
      return new Response("<!doctype html><html lang=\"ar\" dir=\"rtl\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>my Mouny</title><body></body></html>", {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) {
      fetch(request).then((response) => {
        if (response.ok) return cache.put(request, response.clone());
      }).catch(() => undefined);
      return cached;
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) await cache.put(request, networkResponse.clone());
      return networkResponse;
    } catch (_) {
      return new Response("", { status: 503, statusText: "Offline asset unavailable" });
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") self.skipWaiting();
});