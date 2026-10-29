// This is the "Offline page" service worker for Zaker PWA

const CACHE = "pwabuilder-offline-page";
const CACHE_NAME = "pwabuilder-offline-page";
const offlineFallbackPage = "offline.html";

const PRECACHE_ASSETS = [
  "/Zaker-MB/",
  "/Zaker-MB/index.html",
  "/Zaker-MB/offline.html",
  "/Zaker-MB/manifest.json",
  "/Zaker-MB/favicon.png",
  "/Zaker-MB/favicon.svg",
  "/Zaker-MB/apple-touch-icon.png",
  "/Zaker-MB/icons/icon-192.png",
  "/Zaker-MB/icons/icon-512.png",
  "/Zaker-MB/icons/icon-maskable.png",
  "/Zaker-MB/screenshots/screenshot-mobile.png",
  "/Zaker-MB/screenshots/screenshot-desktop.png",
  "/Zaker-MB/assets/index-BttYB3t7.js",
  "/Zaker-MB/assets/routes-DhsRr4z7.js",
  "/Zaker-MB/assets/styles-8sycsV0k.css"
];

// 1. Install Event: Cache offline fallback page and all core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      console.log("[ذاكر SW] Pre-caching offline fallback page and assets...");
      try {
        await cache.add(new Request(offlineFallbackPage, { cache: "reload" }));
      } catch (e) {
        console.warn("[ذاكر SW] offlineFallbackPage cache skipped:", e);
      }
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(new Request(asset, { cache: "reload" }));
        } catch (err) {
          console.warn("[ذاكر SW] Precache asset skipped:", asset, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up old caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE) {
            console.log("[ذاكر SW] Deleting obsolete cache:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Respond offline with cached app shell or offline fallback page
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!req.url.startsWith("http://") && !req.url.startsWith("https://")) return;

  // Handle navigation requests (loading an HTML page)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResp = await fetch(req);
          if (networkResp && networkResp.status === 200) {
            const cache = await caches.open(CACHE);
            cache.put(req, networkResp.clone());
            cache.put("/Zaker-MB/", networkResp.clone());
            cache.put("/Zaker-MB/index.html", networkResp.clone());
          }
          return networkResp;
        } catch (error) {
          // If network fails (offline), serve the cached app or fallback page
          const cache = await caches.open(CACHE);
          const cachedApp =
            (await cache.match(req, { ignoreSearch: true })) ||
            (await cache.match("/Zaker-MB/", { ignoreSearch: true })) ||
            (await cache.match("/Zaker-MB/index.html", { ignoreSearch: true }));

          if (cachedApp) {
            return cachedApp;
          }

          const cachedResp =
            (await cache.match(offlineFallbackPage)) ||
            (await cache.match("/Zaker-MB/offline.html"));

          return cachedResp;
        }
      })()
    );
    return;
  }

  // Handle static assets (JS, CSS, Images, Fonts): Cache-First with Network Fallback
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Update asset in background if online
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          if (req.headers.get("accept")?.includes("image/")) {
            return caches.match("/Zaker-MB/icons/icon-192.png");
          }
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        });
    })
  );
});

// ==========================================
// قدرات PWABuilder المتقدمة (Sync & Push)
// ==========================================

self.addEventListener("sync", (event) => {
  console.log("[ذاكر SW] Background sync event triggered:", event.tag);
  if (event.tag === "zaker-tx-sync" || event.tag === "sync-ledger") {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener("periodicsync", (event) => {
  console.log("[ذاكر SW] Periodic sync event triggered:", event.tag);
  if (event.tag === "zaker-balance-sync" || event.tag === "daily-check") {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.text() : "تنبيه من تطبيق ذاكر";
  event.waitUntil(
    self.registration.showNotification("ذاكر", {
      body: payload,
      icon: "/Zaker-MB/icons/icon-192.png",
      badge: "/Zaker-MB/icons/icon-192.png",
      dir: "rtl",
      lang: "ar"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = "/Zaker-MB/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("Zaker-MB") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
