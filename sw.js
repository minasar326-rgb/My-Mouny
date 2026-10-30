// my Mouny - High-Performance Offline-First Service Worker
const CACHE_NAME = "mymouny-cache-v1793399890198";
const CACHE = "pwabuilder-offline-page";
const offlineFallbackPage = "offline.html";

// Determine base scope dynamically (e.g. /My-Mouny/ or /My-Mouny/)
const SCOPE_BASE = (self.registration && self.registration.scope)
  ? new URL(self.registration.scope).pathname
  : (self.location.pathname.includes("Zaker-MB") ? "/My-Mouny/" : "/My-Mouny/");
const cleanBase = SCOPE_BASE.endsWith("/") ? SCOPE_BASE : SCOPE_BASE + "/";

const OFFLINE_URL = `${cleanBase}offline.html`;

// Core offline assets precached on install
const PRECACHE_ASSETS = [
  "/My-Mouny/",
  "/My-Mouny",
  "/My-Mouny/index.html",
  "/My-Mouny/?source=pwa",
  "/My-Mouny/offline.html",
  "/My-Mouny/manifest.json",
  "/My-Mouny/favicon.png",
  "/My-Mouny/favicon.svg",
  "/My-Mouny/favicon.ico",
  "/My-Mouny/apple-touch-icon.png",
  "/My-Mouny/privacy.html",
  "/My-Mouny/icons/icon-192.png",
  "/My-Mouny/icons/icon-512.png",
  "/My-Mouny/icons/icon-maskable.png",
  "/My-Mouny/screenshots/screenshot-mobile.png",
  "/My-Mouny/screenshots/screenshot-desktop.png",
  "/My-Mouny/widgets/balance.json",
  "/My-Mouny/widgets/balance-data.json",
  "/My-Mouny/assets/index-ErckaXqX.js",
  "/My-Mouny/assets/routes-Bmgxousz.js",
  "/My-Mouny/assets/styles-DXMoGe4s.css"
];

// 1. تثبيت الـ Service Worker وحفظ الأصول الأساسية وصفحة الأوفلاين في الكاش فوراً
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      // أ) كاش PWABuilder القياسي لصفحة الأوفلاين
      try {
        const pwaCache = await caches.open(CACHE);
        const offlineResp = await fetch(OFFLINE_URL, { cache: "reload" });
        if (offlineResp && offlineResp.status === 200) {
          await pwaCache.put(offlineFallbackPage, offlineResp.clone());
          await pwaCache.put(OFFLINE_URL, offlineResp.clone());
        }
      } catch (err) {
        console.warn("[my Mouny SW] PWABuilder cache preload warning:", err);
      }

      // ب) كاش الأصول الكاملة للتطبيق
      const cache = await caches.open(CACHE_NAME);
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
    })()
  );
});

// 2. تفعيل وتنظيف أي كاش قديم والاستحواذ الفوري على الصفحات
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

  // أ) طلبات التنقل (صفحات HTML) - العمل أوفلاين الدائم 100% فوراً
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const altBase = cleanBase.endsWith("/") ? cleanBase.slice(0, -1) : cleanBase;

        // 1. محاولة استرجاع واجهة التطبيق فوراً من الكاش في 1 ميلي ثانية (0ms تأخير للأوفلاين)
        const cachedApp =
          (await cache.match(req, { ignoreSearch: true })) ||
          (await cache.match(cleanBase, { ignoreSearch: true })) ||
          (await cache.match(altBase, { ignoreSearch: true })) ||
          (await cache.match(`${cleanBase}index.html`, { ignoreSearch: true })) ||
          (await cache.match(`${cleanBase}?source=pwa`, { ignoreSearch: true }));

        if (cachedApp) {
          // إذا وجد اتصال بالإنترنت، قم بتحديث الكاش صامتاً في الخلفية دون تعطيل المستخدم
          if (self.navigator?.onLine) {
            fetch(req)
              .then((networkResp) => {
                if (networkResp && networkResp.status === 200) {
                  cache.put(req, networkResp.clone());
                  cache.put(cleanBase, networkResp.clone());
                  cache.put(altBase, networkResp.clone());
                  cache.put(`${cleanBase}index.html`, networkResp.clone());
                }
              })
              .catch(() => {});
          }
          return cachedApp;
        }

        // 2. إذا لم يكن في الكاش (مثل أول زيارة)، جلبه من الشبكة وحفظه
        try {
          const networkResp = await fetch(req);
          if (networkResp && networkResp.status === 200) {
            cache.put(req, networkResp.clone());
            cache.put(cleanBase, networkResp.clone());
            cache.put(altBase, networkResp.clone());
            cache.put(`${cleanBase}index.html`, networkResp.clone());
            return networkResp;
          }
        } catch (_) {
          // أوفلاين تام وبدون كاش مسبق
        }

        // 3. محاولة كاش صفحة الأوفلاين الاحتياطية
        try {
          const pwaCache = await caches.open(CACHE);
          const pwaCached =
            (await pwaCache.match(OFFLINE_URL)) ||
            (await pwaCache.match(offlineFallbackPage)) ||
            (await cache.match(OFFLINE_URL));
          if (pwaCached) return pwaCached;
        } catch (_) {}

        return new Response(
          `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>my Mouny - أوفلاين</title><style>body{font-family:sans-serif;background:#0d1520;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}button{background:#d97706;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:16px;cursor:pointer}</style></head><body><div><h1>my Mouny</h1><p>تطبيق الخزنة والمصاريف يعمل أوفلاين 100%</p><button onclick="location.reload()">إعادة المحاولة</button></div></body></html>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })()
    );
    return;
  }

  // ب) الأصول والملفات (JS, CSS, خطوط، صور، أيقونات) - استراتيجية Cache-First سريعة وآمنة
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

      // إذا لم يكن مخزناً في الكاش، طلب من الشبكة وتخزينه
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
        .catch(async () => {
          // في حالة عدم توفر اتصال بالشبكة للأصل المطلوب
          if (req.headers.get("accept")?.includes("image/")) {
            const cachedIcon = await caches.match(`${cleanBase}icons/icon-192.png`);
            if (cachedIcon) return cachedIcon;
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" fill="#0284c7"/><text x="50%" y="50%" font-size="28" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">my Mouny</text></svg>',
              { headers: { "Content-Type": "image/svg+xml" } }
            );
          }
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        });
    })
  );
});

// ==========================================
// قدرات PWABuilder المتقدمة (Sync & Push)
// ==========================================

// 1. Background Sync (مزامنة العمليات المحلية عند عودة الاتصال)
self.addEventListener("sync", (event) => {
  console.log("[my Mouny SW] Background sync event triggered:", event.tag);
  if (
    event.tag === "sync-ledger" ||
    event.tag === "mouny-tx-sync" ||
    event.tag === "content-sync"
  ) {
    event.waitUntil(Promise.resolve());
  }
});

// 2. Periodic Background Sync (مزامنة دورية في الخلفية)
self.addEventListener("periodicsync", (event) => {
  console.log("[my Mouny SW] Periodic sync event triggered:", event.tag);
  if (
    event.tag === "content-sync" ||
    event.tag === "get-latest-content" ||
    event.tag === "daily-balance-check" ||
    event.tag === "daily-check" ||
    event.tag === "mouny-balance-sync"
  ) {
    event.waitUntil(Promise.resolve());
  }
});

// 3. Push Notifications (إشعارات المعاملات والخزنة)
self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.text() : "تنبيه من my Mouny - إدارة المصاريف والخزنة";
  event.waitUntil(
    self.registration.showNotification("my Mouny", {
      body: payload,
      icon: `${cleanBase}icons/icon-192.png`,
      badge: `${cleanBase}icons/icon-192.png`,
      dir: "rtl",
      lang: "ar"
    })
  );
});

// 4. النقر على الإشعار وفتح التطبيق
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = cleanBase;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ((client.url.includes("My-Mouny") || client.url.includes("Zaker-MB")) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 5. التحديث الفوري المباشر عبر رسائل النافذة
self.addEventListener("message", (event) => {
  if (event.data && (event.data.type === "SKIP_WAITING" || event.data === "skipWaiting")) {
    self.skipWaiting();
  }
});
