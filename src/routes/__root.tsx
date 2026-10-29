import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Skeleton } from "@/components/ledger/home";
import { useLedger } from "@/lib/ledger/store";
import appCss from "../styles.css?url";

const APP_NAME = "ذاكر";

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
            typeof window !== "undefined" && window.location.pathname.startsWith("/Zaker-MB")
              ? "/Zaker-MB/"
              : "/";
          navigator.serviceWorker
            .register(`${base}sw.js`, { scope: base })
            .then((reg) => {
              console.log("[SW] Registered successfully:", reg.scope);
              reg.update().catch(() => {});
            })
            .catch((err) => console.warn("[SW] Registration error:", err));
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
      document.title = lang === "ar" ? "ذاكر - تطبيق إدارة المصاريف والخزنة" : (lang === "el" ? "Zaker - Διαχείριση Εξόδων" : "Zaker - Expense & Vault Manager");
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
                  var isDevHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.port === '8888';
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
                    var swBase = location.pathname.startsWith('/Zaker-MB') ? '/Zaker-MB/' : '/';
                    navigator.serviceWorker.register(swBase + 'sw.js', { scope: swBase }).then(function(reg) {
                      console.log('[ذاكر] Head SW registered:', reg.scope);
                    }).catch(function(err) {
                      console.warn('[ذاكر] Head SW register error:', err);
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
      { name: "theme-color", content: "#1c1a17" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "ذاكر" },
      {
        name: "description",
        content: "ذاكر: تطبيق إدارة المصاريف والخزنة الذكية والمشفرة محلياً - أوفلاين 100% دون خوادم.",
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
