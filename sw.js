// my Mouny - High-Performance Offline-First Service Worker
const CACHE_NAME = "zaker-cache-v1793274559878";
const CACHE = "pwabuilder-offline-page";
const offlineFallbackPage = "offline.html";

// Determine base scope dynamically (e.g. /Zaker-MB/ or /Zaker-MB/)
const SCOPE_BASE = (self.registration && self.registration.scope)
  ? new URL(self.registration.scope).pathname
  : "/Zaker-MB/";
const cleanBase = SCOPE_BASE.endsWith("/") ? SCOPE_BASE : SCOPE_BASE + "/";

const OFFLINE_URL = `${cleanBase}offline.html`;

// Core offline assets precached on install
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
  "/Zaker-MB/widgets/balance.json",
  "/Zaker-MB/widgets/balance-data.json",
  "/Zaker-MB/assets/index-D-VBRcvp.js",
  "/Zaker-MB/assets/routes-u1dX_8lk.js",
  "/Zaker-MB/assets/styles-DX88isJf.css"
];

// 1. تثبيت الـ Service Worker وحفظ الأصول الأساسية في الكاش فوراً
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[my Mouny SW] Pre-caching core offline assets for scope:", cleanBase);
      for (const asset of PRECACHE_ASSETS) {
        try {
          const res = await fetch(asset, { cache: "reload" });
          if (res && res.status === 200) {
            await cache.put(asset, res);
          }
        } catch (err) {
          console.warn("[my Mouny SW] Precache skip:", asset, err);
        }
      }
    })
  );
});

// 2. تفعيل وتنظيف أي كاش قديم والتحكم الفوري بالمتصفح
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== CACHE) {
            console.log("[my Mouny SW] Deleting obsolete cache:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. اعتراض كافة الطلبات لتشغيل التطبيق أوفلاين 100% بدون إنترنت
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!req.url.startsWith("http://") && !req.url.startsWith("https://")) return;

  const url = new URL(req.url);

  // أ) طلبات التنقل (صفحات HTML) - العمل أوفلاين التام
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          // محاولة جلب أحدث نسخة إذا وُجد إنترنت
          const networkResp = await fetch(req);
          if (networkResp && networkResp.status === 200) {
            cache.put(req, networkResp.clone());
            cache.put(cleanBase, networkResp.clone());
            cache.put(`${cleanBase}index.html`, networkResp.clone());
            return networkResp;
          }
        } catch (_) {
          // انقطاع تام للإنترنت (أوفلاين)
        }

        // استرجاع واجهة التطبيق فوراً من الكاش لتعمل بدون نت
        const cachedApp =
          (await cache.match(req, { ignoreSearch: true })) ||
          (await cache.match(cleanBase, { ignoreSearch: true })) ||
          (await cache.match(`${cleanBase}index.html`, { ignoreSearch: true })) ||
          (await cache.match(OFFLINE_URL, { ignoreSearch: true })) ||
          (await cache.match("offline.html", { ignoreSearch: true }));

        if (cachedApp) {
          return cachedApp;
        }

        // لو لم يُعثر على الصفحة، محاولة كاش PWABuilder أو كاش بديل
        const pwaCache = await caches.open(CACHE);
        const pwaCached = await pwaCache.match(offlineFallbackPage);
        if (pwaCached) return pwaCached;

        return new Response(
          `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>my Mouny أوفلاين</title><style>body{font-family:sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}button{background:#0284c7;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-size:16px;cursor:pointer}</style></head><body><div><h1>my Mouny</h1><p>التطبيق يعمل بوضع الأوفلاين التام - بياناتك محفوظة محلياً</p><button onclick="location.reload()">تحديث</button></div></body></html>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })()
    );
    return;
  }

  // ب) الأصول والملفات (JS, CSS, خطوط، صور، أيقونات) - استراتيجية Cache-First سريعة
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // تحديث صامت في الخلفية لو الإنترنت متاح
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // إذا لم يكن مخزناً في الكاش، جلب من الشبكة وتخزينه
      return fetch(req)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === location.origin ||
              url.hostname.includes("fonts.googleapis.com") ||
              url.hostname.includes("fonts.gstatic.com"))
          ) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
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

// 1. Background Sync (مزامنة العمليات المالية عند عودة الاتصال)
self.addEventListener("sync", (event) => {
  console.log("[ذاكر SW] Background sync event triggered:", event.tag);
  if (
    event.tag === "sync-ledger" ||
    event.tag === "zaker-tx-sync" ||
    event.tag === "content-sync"
  ) {
    event.waitUntil(Promise.resolve());
  }
});

// 2. Periodic Background Sync (مزامنة دورية في الخلفية)
self.addEventListener("periodicsync", (event) => {
  console.log("[ذاكر SW] Periodic sync event triggered:", event.tag);
  if (
    event.tag === "content-sync" ||
    event.tag === "get-latest-content" ||
    event.tag === "daily-balance-check" ||
    event.tag === "daily-check" ||
    event.tag === "zaker-balance-sync"
  ) {
    event.waitUntil(Promise.resolve());
  }
});

// 3. Push Notifications (إشعارات تنبيهات المصاريف)
self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.text() : "تنبيه جديد من ذاكر";
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

// 4. النقر على الإشعار وفتح التطبيق
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
