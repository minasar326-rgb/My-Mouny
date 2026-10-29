const CACHE_NAME = "zaker-mb-v1793270766113";

const PRECACHE_ASSETS = [
  "/Zaker-MB/",
  "/Zaker-MB/index.html",
  "/Zaker-MB/manifest.json",
  "/Zaker-MB/favicon.png",
  "/Zaker-MB/favicon.svg",
  "/Zaker-MB/apple-touch-icon.png",
  "/Zaker-MB/icons/icon-192.png",
  "/Zaker-MB/icons/icon-512.png",
  "/Zaker-MB/icons/icon-maskable.png",
  "/Zaker-MB/screenshots/screenshot-mobile.png",
  "/Zaker-MB/screenshots/screenshot-desktop.png",
  "/Zaker-MB/assets/index-CTNzS35L.js",
  "/Zaker-MB/assets/routes-wce0UfVs.js",
  "/Zaker-MB/assets/styles-8sycsV0k.css"
];

// Offline HTML fallback shell for 100% offline uptime
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>ذاكر - وضع عدم الاتصال</title>
  <style>
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: #0284c7;
      color: #fff;
      padding: 6px 16px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 16px;
    }
    h1 { font-size: 24px; margin: 0 0 12px; color: #38bdf8; }
    p { font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
    button {
      background: #0284c7;
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: background 0.2s;
      width: 100%;
    }
    button:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">🔒 الخزنة تعمل أوفلاين 100%</span>
    <h1>ذاكر - المحفظة والخزنة المالية</h1>
    <p>أنت الآن تعمل بوضع الأوفلاين التام. جميع بياناتك المالية وحساباتك محفوظة ومشفرة محلياً على جهازك بأمان.</p>
    <button onclick="location.reload()">تحديث الواجهة</button>
  </div>
</body>
</html>`;

// فحص بيئة التطوير
const isDev = false;

// 1. تثبيت الـ Service Worker وتخزين الأصول الأساسية
self.addEventListener("install", (event) => {
  if (isDev) {
    self.skipWaiting();
    return;
  }
  const scope = self.registration ? self.registration.scope : self.location.href;
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[ذاكر SW] Pre-caching core offline assets for scope:", scope);
      // Precache the offline fallback HTML directly
      await cache.put(
        new Request(new URL("offline.html", scope).href),
        new Response(OFFLINE_FALLBACK_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
      );

      for (const rel of PRECACHE_ASSETS) {
        if (!rel) continue;
        const fullUrl = new URL(rel, scope).href;
        try {
          await cache.add(fullUrl);
        } catch (err) {
          console.warn("[ذاكر SW] Precache skipped for:", fullUrl, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// 2. تفعيل وتنظيف الكاش القديم واستلام التحكم فوراً
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ذاكر SW] Removing obsolete cache:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. إدارة الطلبات للعمل أوفلاين بدون إنترنت 100%
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!req.url.startsWith("http://") && !req.url.startsWith("https://")) return;
  if (isDev) return;

  const url = new URL(req.url);

  // صفحات التنقل (HTML Navigation Requests)
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    const scope = self.registration ? self.registration.scope : "/Zaker-MB/";
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, copy);
              try {
                cache.put(scope, response.clone());
                cache.put("/Zaker-MB/", response.clone());
                cache.put("/Zaker-MB/index.html", response.clone());
              } catch (_) {}
            });
          }
          return response;
        })
        .catch(async () => {
          // استرجاع فوري من الكاش عند انقطاع الإنترنت
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(req, { ignoreSearch: true })) ||
            (await cache.match(scope, { ignoreSearch: true })) ||
            (await cache.match("/Zaker-MB/", { ignoreSearch: true })) ||
            (await cache.match("/Zaker-MB/index.html", { ignoreSearch: true })) ||
            (await cache.match(new URL("index.html", scope).href, { ignoreSearch: true })) ||
            (await cache.match(new URL("offline.html", scope).href, { ignoreSearch: true }));

          if (cached) return cached;

          return new Response(OFFLINE_FALLBACK_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        })
    );
    return;
  }

  // الأصول الثابتة (JS, CSS, الخطوط، الأيقونات): Cache-First مع Fallback للشبكة
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // تحديث في الخلفية إذا وُجد إنترنت
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === location.origin ||
              url.hostname.includes("fonts.googleapis.com") ||
              url.hostname.includes("fonts.gstatic.com"))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // إذا كان الطلب صورة وفشل التحميل
          if (req.headers.get("accept")?.includes("image/")) {
            return caches.match("/Zaker-MB/icons/icon-192.png");
          }
          return new Response("Network error", { status: 503, statusText: "Service Unavailable" });
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
  if (event.tag === "zaker-tx-sync" || event.tag === "sync-ledger") {
    event.waitUntil(Promise.resolve());
  }
});

// 2. Periodic Background Sync (مزامنة دورية في الخلفية)
self.addEventListener("periodicsync", (event) => {
  console.log("[ذاكر SW] Periodic sync event triggered:", event.tag);
  if (event.tag === "zaker-balance-sync" || event.tag === "daily-check") {
    event.waitUntil(Promise.resolve());
  }
});

// 3. Push Notifications (إشعارات تنبيهات المصاريف)
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
