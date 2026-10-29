import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Skeleton } from "@/components/ledger/home";
import { useLedger } from "@/lib/ledger/store";
import appCss from "../styles.css?url";

const APP_NAME = "my Mouny - إدارة المصاريف والخزنة المالية";

function RootShell() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (import.meta.env.DEV) {
        // في بيئة التطوير، إلغاء تسجيل الـ Service Worker وتنظيف الكاش لتفادي تعارض Vite HMR والشاشات البيضاء
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().catch(() => {});
          }
        });
      } else {
        const registerSW = () => {
          const base =
            typeof window !== "undefined" && window.location.pathname.startsWith("/My-Mouny")
              ? "/My-Mouny/"
              : (typeof window !== "undefined" && window.location.pathname.startsWith("/Zaker-MB")
                ? "/Zaker-MB/"
                : "/");
          navigator.serviceWorker
            .register(`${base}sw.js`, { scope: base })
            .then((reg) => {
              console.log("[my Mouny SW] Registered successfully:", reg.scope);
              reg.update().catch(() => {});
              // تسجيل Background Sync إذا كان مدعوماً
              if ("sync" in reg && typeof (reg as any).sync?.register === "function") {
                (reg as any).sync.register("sync-ledger").catch(() => {});
              }
              // تسجيل Periodic Sync إذا كان مدعوماً
              if ("periodicSync" in reg && typeof (reg as any).periodicSync?.register === "function") {
                (reg as any).periodicSync
                  .register("daily-balance-check", { minInterval: 24 * 60 * 60 * 1000 })
                  .catch(() => {});
              }
            })
            .catch((err) => console.warn("[ذاكر SW] Registration error:", err));

          // تفعيل التخزين الدائم غير القابل للمسح (Persistent Storage) لحفظ كافة الحسابات والخزائن محلياً
          if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then((granted) => {
              if (granted) {
                console.log("[ذاكر] تم تفعيل التخزين الدائم المحلي 100% (Persistent Storage Active)");
              }
            }).catch(() => {});
          }
        };

        if (document.readyState === "complete" || document.readyState === "interactive") {
          registerSW();
        } else {
          window.addEventListener("load", registerSW);
        }
      }
    }
  }, []);

  return (
    <>
      <PreviewHostBridge />
      <AuthProvider>
        <Suspense fallback={<Skeleton />}>
          <Outlet />
        </Suspense>
      </AuthProvider>
      <Scripts />
    </>
  );
}

function RootComponent() {
  const lang = useLedger((s) => s.lang);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      document.title = APP_NAME;
    }
  }, [lang]);

  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(e) {
                  if (e.target && e.target.tagName === 'LINK' && e.target.rel === 'stylesheet') {
                    if (!sessionStorage.getItem('css_heal')) {
                      sessionStorage.setItem('css_heal', '1');
                      if ('caches' in window) {
                        caches.keys().then(function(keys) {
                          return Promise.all(keys.map(function(k) { return caches.delete(k); }));
                        }).then(function() {
                          location.reload();
                        });
                      } else {
                        location.reload();
                      }
                    }
                  }
                }, true);

                if ('serviceWorker' in navigator) {
                  var isDevHost = location.port === '8080' || location.port === '8888' || location.port === '5173';
                  if (isDevHost) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
                    });
                    if ('caches' in window) {
                      caches.keys().then(function(keys) {
                        for (var i = 0; i < keys.length; i++) {
                          caches.delete(keys[i]);
                        }
                      });
                    }
                  } else {
                    var swBase = location.pathname.startsWith('/My-Mouny')
                      ? '/My-Mouny/'
                      : (location.pathname.startsWith('/Zaker-MB') ? '/Zaker-MB/' : '/');
                    navigator.serviceWorker.register(swBase + 'sw.js', { scope: swBase }).then(function(reg) {
                      console.log('[my Mouny SW] Head SW registered:', reg.scope);
                      if ('sync' in reg && reg.sync) {
                        reg.sync.register('sync-ledger').catch(function(){});
                      }
                      if ('periodicSync' in reg && reg.periodicSync) {
                        reg.periodicSync.register('daily-balance-check', { minInterval: 24 * 60 * 60 * 1000 }).catch(function(){});
                      }
                    }).catch(function(err) {
                      console.warn('[ذاكر SW] Head SW register error:', err);
                    });
                  }
                }
              }
            `,
          }}
        />
        <HeadContent />
      </head>
      <body>
        <RootShell />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { title: APP_NAME },
      { name: "theme-color", content: "#0284c7" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "my Mouny" },
      { name: "application-name", content: "my Mouny" },
      {
        name: "description",
        content:
          "my Mouny: تطبيق إدارة الأموال والمصاريف والحسابات والخزنة المالية المشفرة محلياً 100% بدون إنترنت وبدون خوادم.",
      },
      {
        httpEquiv: "Content-Security-Policy",
        content:
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://grok.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://grok.com; connect-src 'self' ws: http://localhost:* https://localhost:* https://grok.com; base-uri 'self'; form-action 'self';",
      },
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      { name: "referrer", content: "no-referrer" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap",
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  component: RootComponent,
});
