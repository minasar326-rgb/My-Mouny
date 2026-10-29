const CACHE_NAME = "zaker-mb-cache-v1";

const PRECACHE_ASSETS = [
  "",
  "manifest.json",
  "favicon.png",
  "apple-touch-icon.png",
  "privacy.html",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable.png",
  "screenshots/screenshot-mobile.png",
  "screenshots/screenshot-desktop.png"
];

// فحص ما إذا كان العنوان هو بيئة تطوير (Vite dev server)
const isDev =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname === "0.0.0.0" ||
  self.location.port === "8888" ||
  self.location.port === "5173" ||
  self.location.hostname.startsWith("192.168.") ||
  self.location.hostname.startsWith("10.") ||
  self.location.hostname.startsWith("26.") ||
  self.location.hostname.startsWith("172.");

// تثبيت الـ Service Worker وتخزين الملفات الأساسية مسبقاً (في الإنتاج فقط)
self.addEventListener("install", (event) => {
  if (isDev) {
    self.skipWaiting();
    return;
  }
  const scope = self.registration ? self.registration.scope : self.location.href;
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[ServiceWorker] Pre-caching core offline assets (v10)");
      for (const rel of PRECACHE_ASSETS) {
        const fullUrl = new URL(rel, scope).href;
        try {
          await cache.add(fullUrl);
        } catch (err) {
          console.warn("[ServiceWorker] Precache skipped for", fullUrl, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// تفعيل وحذف أي كاش قديم واستلام التحكم فوراً
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// فحص المسارات الداخلية لبيئة التطوير لمنع تداخلها مع الكاش
function isDevInternal(url) {
  return (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/__vite") ||
    url.pathname.includes("node_modules/.vite") ||
    url.pathname.startsWith("/__server") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.includes(".vite") ||
    url.pathname.includes("@fs") ||
    url.searchParams.has("t")
  );
}

// التعامل مع الطلبات: العمل أوفلاين بنسبة 100% وبدون شاشات بيضاء
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // تجاهل أي بروتوكول غير http أو https (مثل chrome-extension:// أو blob: أو data:)
  if (!req.url.startsWith("http://") && !req.url.startsWith("https://")) return;

  // في بيئة التطوير، السماح لـ Vite بالتعامل مع كافة الطلبات مباشرة دون اعتراض
  if (isDev) {
    return;
  }

  const url = new URL(req.url);

  // تخطي ملفات بيئة التطوير الخاصة بـ Vite
  if (isDevInternal(url)) {
    return;
  }

  // استراتيجية طلبات التنقل (صفحات HTML): Network First لضمان تحميل أحدث ملفات CSS و JS دائماً، مع Fallback للكاش فوراً عند انقطاع الإنترنت (Offline)
  if (req.mode === "navigate") {
    const scope = self.registration ? self.registration.scope : "/";
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, copy);
              try {
                cache.put(scope, response.clone());
              } catch (_) {}
            });
          }
          return response;
        })
        .catch(async () => {
          // في حالة عدم وجود إنترنت، استرجاع الصفحة من الكاش فوراً للعمل أوفلاين
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(req, { ignoreSearch: true })) ||
            (await cache.match(scope, { ignoreSearch: true })) ||
            (await cache.match("/", { ignoreSearch: true }));

          if (cached) return cached;

          return new Response(
            `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>ذاكر</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:50px 20px;background:#f4f1eb;color:#1c1a17"><h2>ذاكر</h2><p style="color:#666">أنت الآن تعمل دون اتصال بالإنترنت.</p><button onclick="location.reload()" style="padding:10px 24px;border-radius:10px;background:#0d9488;color:#fff;border:none;cursor:pointer;font-weight:bold;margin-top:20px">تحديث</button></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // في بيئة التطوير، عدم كاش أصول Vite الديناميكية
  if (isDev && (url.pathname.includes("/node_modules/") || url.pathname.startsWith("/src/"))) {
    return;
  }

  // استراتيجية الأصول الثابتة (CSS, JS, الخطوط, الصور): Cache First مع تحديث بالخلفية
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // تحديث في الخلفية
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
        .catch((err) => {
          console.warn("[ServiceWorker] Fetch failed:", req.url, err);
        });
    })
  );
});
