const CACHE_NAME = "khazinti-cache-v8";

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/privacy.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable.png",
  "/screenshots/screenshot-mobile.png",
  "/screenshots/screenshot-desktop.png"
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
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[ServiceWorker] Pre-caching core offline assets (v7)");
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn("[ServiceWorker] Precache skipped for", url);
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

  // استراتيجية طلبات التنقل (صفحات HTML)
  if (req.mode === "navigate") {
    // في بيئة التطوير المحلية (localhost/127.0.0.1)، جلب النسخة المباشرة دائماً لتجنب تعارض HMR
    if (isDev) {
      event.respondWith(
        fetch(req).catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = (await cache.match(req, { ignoreSearch: true })) || (await cache.match("/", { ignoreSearch: true }));
          return cached || new Response("Offline in development mode", { status: 503 });
        })
      );
      return;
    }

    // في بيئة الإنتاج: Cache First فوري (0ms) مع تحديث في الخلفية
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = (await cache.match(req, { ignoreSearch: true })) || (await cache.match("/", { ignoreSearch: true }));

        // مهمة جلب التحديث من الشبكة وتخزينه في الخلفية
        const networkFetchPromise = fetch(req)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              cache.put("/", copy);
            }
            return response;
          })
          .catch(() => null);

        // إذا كانت الصفحة موجودة في الكاش، نعيدها فوراً وبدون أي انتظار (Instant Load!)
        if (cached) {
          event.waitUntil(networkFetchPromise);
          return cached;
        }

        // في أول زيارة خالص ولم يتم التخزين بعد، ننتظر استجابة الشبكة
        const networkResponse = await networkFetchPromise;
        if (networkResponse) return networkResponse;

        // Fallback في حال انقطاع الشبكة تماماً قبل التخزين
        return new Response(
          `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>خزينتي</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:50px 20px;background:#f4f1eb;color:#1c1a17"><h2>خزينتي - الخزنة المالية</h2><p style="color:#666">التطبيق يعمل دون إنترنت. يرجى الضغط أدناه لتحديث الصفحة.</p><button onclick="location.reload()" style="padding:10px 24px;border-radius:10px;background:#0d9488;color:#fff;border:none;cursor:pointer;font-weight:bold;margin-top:20px">تحديث الصفحة</button></body></html>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })()
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
