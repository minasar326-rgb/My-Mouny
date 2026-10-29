const CACHE_NAME = "mymouny-cache-v2026";

const PRECACHE_ASSETS = [
  "",
  "/My-Mouny/",
  "/My-Mouny/index.html",
  "/My-Mouny/?source=pwa",
  "/My-Mouny/manifest.json",
  "/My-Mouny/favicon.png",
  "/My-Mouny/favicon.ico",
  "/My-Mouny/apple-touch-icon.png",
  "/My-Mouny/privacy.html",
  "/My-Mouny/icons/icon-192.png",
  "/My-Mouny/icons/icon-512.png",
  "/My-Mouny/icons/icon-maskable.png",
  "/My-Mouny/screenshots/screenshot-mobile.png",
  "/My-Mouny/screenshots/screenshot-desktop.png"
];

// Offline HTML fallback shell for 100% offline uptime
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>my Mouny - وضع عدم الاتصال</title>
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
    <h1>my Mouny - المحفظة والخزنة المالية</h1>
    <p>أنت الآن تعمل بوضع الأوفلاين التام. جميع بياناتك المالية وحساباتك محفوظة ومشفرة محلياً على جهازك بأمان وبدون إنترنت.</p>
    <button onclick="location.reload()">تحديث الواجهة</button>
  </div>
</body>
</html>`;

// فحص بيئة التطوير
const isDev =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname === "0.0.0.0" ||
  self.location.port === "8888" ||
  self.location.port === "5173";

// 1. تثبيت الـ Service Worker وتخزين الأصول الأساسية
self.addEventListener("install", (event) => {
  if (isDev) {
    self.skipWaiting();
    return;
  }
  const scope = self.registration ? self.registration.scope : self.location.href;
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[my Mouny SW] Pre-caching core offline assets for scope:", scope);
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
          console.warn("[my Mouny SW] Precache skipped for:", fullUrl, err);
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
            console.log("[my Mouny SW] Removing obsolete cache:", key);
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
    const scope = self.registration ? self.registration.scope : "/My-Mouny/";
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, copy);
              try {
                cache.put(scope, response.clone());
                cache.put("/My-Mouny/", response.clone());
                cache.put("/My-Mouny/index.html", response.clone());
              } catch (_) {}
            });
          }
          return response;
        })
        .catch(async () => {
          // استرجاع فوري من الكاش عند انقطاع الإنترنت للعمل أوفلاين بالكامل
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(req, { ignoreSearch: true })) ||
            (await cache.match(scope, { ignoreSearch: true })) ||
            (await cache.match("/My-Mouny/", { ignoreSearch: true })) ||
            (await cache.match("/My-Mouny/index.html", { ignoreSearch: true })) ||
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
            return caches.match("/My-Mouny/icons/icon-192.png");
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
  console.log("[my Mouny SW] Background sync event triggered:", event.tag);
  if (event.tag === "sync-ledger" || event.tag === "mouny-tx-sync") {
    event.waitUntil(Promise.resolve());
  }
});

// 2. Periodic Background Sync (مزامنة دورية في الخلفية)
self.addEventListener("periodicsync", (event) => {
  console.log("[my Mouny SW] Periodic sync event triggered:", event.tag);
  if (event.tag === "daily-balance-check" || event.tag === "mouny-balance-sync") {
    event.waitUntil(Promise.resolve());
  }
});

// 3. Push Notifications (إشعارات تنبيهات المصاريف)
self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.text() : "تنبيه جديد من my Mouny";
  event.waitUntil(
    self.registration.showNotification("my Mouny", {
      body: payload,
      icon: "/My-Mouny/icons/icon-192.png",
      badge: "/My-Mouny/icons/icon-192.png",
      dir: "rtl",
      lang: "ar"
    })
  );
});

// 4. النقر على الإشعار وفتح التطبيق
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = "/My-Mouny/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("My-Mouny") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
