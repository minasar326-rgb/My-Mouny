import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const vercelStatic = path.join(root, ".vercel", "output", "static");
const distDir = path.join(root, "dist");
const REPO_NAME = "Zaker-MB";
const REPO_BASE = "/Zaker-MB/";

console.log(`Exporting production build for GitHub Pages into: ${distDir} (Base: ${REPO_BASE})`);

// 1. Clean and recreate dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. Copy all files from .vercel/output/static to dist
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyDir(vercelStatic, distDir);

// 3. Render HTML using the production SSR engine
const serverFunc = await import(
  "file:///" + path.join(root, ".vercel", "output", "functions", "__server.func", "index.mjs").replace(/\\/g, "/")
);
const handler = serverFunc.default;
const req = new Request("http://localhost:8080/");
const res = await handler.fetch(req);

if (res.status !== 200) {
  throw new Error(`SSR renderer returned HTTP ${res.status}`);
}

let html = await res.text();

// 4. Adapt paths for GitHub Pages subpath
function fixPaths(str) {
  let s = str;
  // Convert any previous /Zaker-MB/, /Zaker-m/, /zaker/, or /My-Mouny/ to new REPO_BASE
  s = s.replaceAll('/Zaker-MB/', REPO_BASE);
  s = s.replaceAll('/Zaker-m/', REPO_BASE);
  s = s.replaceAll('/zaker/', REPO_BASE);
  s = s.replaceAll('/My-Mouny/', REPO_BASE);

  // Replace in HTML attributes
  s = s.replaceAll('href="/assets/', `href="${REPO_BASE}assets/`);
  s = s.replaceAll('src="/assets/', `src="${REPO_BASE}assets/`);
  s = s.replaceAll('href="/icons/', `href="${REPO_BASE}icons/`);
  s = s.replaceAll('src="/icons/', `src="${REPO_BASE}icons/`);
  s = s.replaceAll('href="/favicon.', `href="${REPO_BASE}favicon.`);
  s = s.replaceAll('href="/apple-touch-icon', `href="${REPO_BASE}apple-touch-icon`);
  s = s.replaceAll('href="/manifest.json"', `href="${REPO_BASE}manifest.json"`);

  // Replace inside JS backticks, double quotes, and single quotes
  s = s.replaceAll('`/assets/', `\`${REPO_BASE}assets/`);
  s = s.replaceAll('"/assets/', `"${REPO_BASE}assets/`);
  s = s.replaceAll("'/assets/", `'${REPO_BASE}assets/`);

  s = s.replaceAll('`/icons/', `\`${REPO_BASE}icons/`);
  s = s.replaceAll('"/icons/', `"${REPO_BASE}icons/`);
  s = s.replaceAll("'/icons/", `'${REPO_BASE}icons/`);

  s = s.replaceAll('`/screenshots/', `\`${REPO_BASE}screenshots/`);
  s = s.replaceAll('"/screenshots/', `"${REPO_BASE}screenshots/`);
  s = s.replaceAll("'/screenshots/", `'${REPO_BASE}screenshots/`);

  s = s.replaceAll('`/favicon.', `\`${REPO_BASE}favicon.`);
  s = s.replaceAll('"/favicon.', `"${REPO_BASE}favicon.`);
  s = s.replaceAll("'/favicon.", `'${REPO_BASE}favicon.`);

  s = s.replaceAll('`/apple-touch-icon', `\`${REPO_BASE}apple-touch-icon`);
  s = s.replaceAll('"/apple-touch-icon', `"${REPO_BASE}apple-touch-icon`);

  s = s.replaceAll('`/manifest.json`', `\`${REPO_BASE}manifest.json\``);
  s = s.replaceAll('"/manifest.json"', `"${REPO_BASE}manifest.json"`);

  s = s.replaceAll('`/sw.js`', `\`${REPO_BASE}sw.js\``);
  s = s.replaceAll('"/sw.js"', `"${REPO_BASE}sw.js"`);

  s = s.replaceAll('/Zaker-MB/', REPO_BASE);
  s = s.replaceAll('/Zaker-m/', REPO_BASE);
  s = s.replaceAll('/Zaker-MB', REPO_BASE.slice(0, -1));
  s = s.replaceAll("location.pathname.startsWith('/Zaker-MB')", `location.pathname.startsWith('${REPO_BASE.slice(0, -1)}')`);
  s = s.replaceAll("'/Zaker-MB/'", `'${REPO_BASE}'`);
  s = s.replaceAll('"/Zaker-MB/"', `"${REPO_BASE}"`);

  // Idempotently clean any double prefix
  s = s.replaceAll(`${REPO_BASE}${REPO_NAME}/`, REPO_BASE);
  return s;
}

html = fixPaths(html);

// Clean up platform-specific dynamic middleware artifacts not present on static GitHub Pages
html = html.replace(/<link rel="manifest" href="\/__grok\/manifest\.webmanifest">/g, '');
html = html.replace(new RegExp(`<link rel="manifest" href="${REPO_BASE}__grok\\/manifest\\.webmanifest">`, 'g'), '');
html = html.replace(/<script src="https:\/\/grok\.com\/grok-app-builder\/extensions\.js"[^>]*><\/script>/g, '');
html = html.replace(/<meta name="twitter:card"[^>]*>/g, '');
html = html.replace(/<meta property="og:title"[^>]*>/g, '');
html = html.replace(/<link rel="apple-touch-icon" href="[^"]*__grok[^"]*">/g, '');

// Remove X-Frame-Options meta tag (only allowed in HTTP headers, not meta tags)
html = html.replace(/<meta http-equiv="X-Frame-Options"[^>]*>/gi, '');

// Strictly ensure app title and mobile install name is "my Mouny"
html = html.replace(/<title>[^<]*<\/title>/gi, '<title>my Mouny</title>');
html = html.replace(/<meta[^>]*apple-mobile-web-app-title[^>]*>/gi, '<meta name="apple-mobile-web-app-title" content="my Mouny">');
html = html.replace(/<meta[^>]*application-name[^>]*>/gi, '<meta name="application-name" content="my Mouny">');

// Verify actual CSS and JS filenames in dist/assets
const assetsDir = path.join(distDir, "assets");
let actualCss = "";
let actualJs = "";
let actualRoutes = "";

if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  actualCss = assetFiles.find((f) => f.startsWith("styles-") && f.endsWith(".css")) || "";
  actualJs = assetFiles.find((f) => f.startsWith("index-") && f.endsWith(".js")) || "";
  actualRoutes = assetFiles.find((f) => f.startsWith("routes-") && f.endsWith(".js")) || "";

  if (actualCss) {
    html = html.replace(/(?:\/[A-Za-z0-9_-]+)?\/assets\/styles-[A-Za-z0-9_-]+\.css/g, `${REPO_BASE}assets/${actualCss}`);
  }
  if (actualJs) {
    html = html.replace(/(?:\/[A-Za-z0-9_-]+)?\/assets\/index-[A-Za-z0-9_-]+\.js/g, `${REPO_BASE}assets/${actualJs}`);
  }
  if (actualRoutes) {
    html = html.replace(/(?:\/[A-Za-z0-9_-]+)?\/assets\/routes-[A-Za-z0-9_-]+\.js/g, `${REPO_BASE}assets/${actualRoutes}`);
  }
  html = html.replaceAll(`${REPO_BASE}${REPO_NAME}/`, REPO_BASE);
}

// Ensure correct Title and Brand Meta
html = html.replace(/<title>.*?<\/title>/gi, `<title>ذاكر - تطبيق إدارة المصاريف والخزنة</title>`);
html = html.replace(/content="my Mouny"/gi, `content="ذاكر"`);
html = html.replace(/my Mouny: خزنتك المالية الذكية والمشفرة محلياً/gi, `ذاكر: تطبيق إدارة المصاريف والخزنة الذكية والمشفرة محلياً`);

// Ensure CSS stylesheet link is present in <head>
if (actualCss && !html.includes(actualCss)) {
  const cssLinks = `
  <link rel="stylesheet" href="${REPO_BASE}assets/${actualCss}" data-precedence="default" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" data-precedence="default" />
  <meta name="theme-color" content="#0284c7" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="my Mouny" />
  <meta name="application-name" content="my Mouny" />
  <meta name="description" content="my Mouny: خزنتك المالية الذكية والمشفرة محلياً - أوفلاين 100% دون خوادم." />
  <link rel="icon" type="image/png" href="${REPO_BASE}favicon.png" />
  <link rel="icon" type="image/svg+xml" href="${REPO_BASE}favicon.svg" />
  <link rel="apple-touch-icon" href="${REPO_BASE}apple-touch-icon.png" />
  <link rel="modulepreload" href="${REPO_BASE}assets/${actualJs}" />
  ${actualRoutes ? `<link rel="modulepreload" href="${REPO_BASE}assets/${actualRoutes}" />` : ''}
</head>`;
  html = html.replace('</head>', cssLinks);
}

// Ensure canonical manifest link and immediate Service Worker registration in <head>
if (!html.includes('<link rel="manifest"')) {
  html = html.replace('</head>', `  <link rel="manifest" href="${REPO_BASE}manifest.json">\n</head>`);
}

if (!html.includes('navigator.serviceWorker.register')) {
  const immediateSwScript = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('${REPO_BASE}sw.js', { scope: '${REPO_BASE}' })
          .then(function(r) {
            console.log('[my Mouny PWA] ServiceWorker registered with scope:', r.scope);
            if ('sync' in r && r.sync) { r.sync.register('sync-ledger').catch(function(){}); }
            if ('periodicSync' in r && r.periodicSync) { r.periodicSync.register('daily-balance-check', { minInterval: 24 * 60 * 60 * 1000 }).catch(function(){}); }
          })
          .catch(function(e) { console.warn('[my Mouny PWA] ServiceWorker registration warning:', e); });
      });
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function(){});
      }
    }
  </script>
</head>`;
  html = html.replace('</head>', immediateSwScript);
}

// Ensure client bundle scripts and TanStack stream are present in <body>
if (actualJs && !html.includes('<script type="module"')) {
  const hydrationBody = `
<!--$--><!--$--><main class="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 animate-pulse"><div class="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"><div class="flex items-center gap-3"><div class="size-10 rounded-xl bg-line/60"></div><div><div class="h-4 w-28 bg-line/80 rounded mb-1.5"></div><div class="h-3 w-48 bg-line/50 rounded"></div></div></div><div class="h-8 w-24 bg-line/60 rounded-xl"></div></div><div class="mb-6 h-12 rounded-2xl border border-line bg-surface p-1.5 flex gap-2"><div class="h-full flex-1 bg-accent/20 rounded-xl"></div><div class="h-full flex-1 bg-line/30 rounded-xl"></div><div class="h-full flex-1 bg-line/30 rounded-xl"></div></div><div class="rounded-2xl border border-line bg-surface p-5 mb-4"><div class="h-3 w-32 bg-line/60 rounded mb-2"></div><div class="h-10 w-44 bg-line/80 rounded mb-2"></div><div class="h-3 w-40 bg-line/50 rounded"></div></div><div class="grid grid-cols-2 gap-3 mb-4"><div class="h-28 rounded-2xl border border-line bg-surface p-4"></div><div class="h-28 rounded-2xl border border-line bg-surface p-4"></div></div></main><!--/$--><!--/$-->
<script data-tsr-stream-part="">(self.$R=self.$R||{})["tsr"]=[];self.$_TSR={h(){this.hydrated=!0,this.c()},e(){this.streamEnded=!0,this.c()},c(){this.hydrated&&this.streamEnded&&(delete self.$_TSR,delete self.$R.tsr)},p(e){this.initialized?e():this.buffer.push(e)},buffer:[]};$_TSR.router=($R=>$R[0]={manifest:$R[1]={routes:$R[2]={__root__:$R[3]={preloads:$R[4]=["${REPO_BASE}assets/${actualJs}"],scripts:$R[5]=[$R[6]={attrs:$R[7]={type:"module",async:!0,src:"${REPO_BASE}assets/${actualJs}"}}]},"/":$R[8]={preloads:$R[9]=["${REPO_BASE}assets/${actualRoutes}"]}}},matches:$R[10]=[$R[11]={i:"__root__ ",u:${Date.now()},s:"success",ssr:!0},$R[12]={i:"  ",u:${Date.now()},s:"success",ssr:!0}]})($R["tsr"]);$_TSR.e();{let s=document.currentScript,p;while((p=s.previousElementSibling)&&p.hasAttribute('data-tsr-stream-part'))p.remove();s.remove()}</script>
<script type="module" async="" src="${REPO_BASE}assets/${actualJs}"></script>`;

  if (html.includes('<div id="root"></div>')) {
    html = html.replace('<div id="root"></div>', `<div id="root"></div>\n${hydrationBody}`);
  } else if (html.includes('</body>')) {
    html = html.replace('</body>', `${hydrationBody}\n</body>`);
  } else {
    html += hydrationBody;
  }
}

// 5. Write index.html, 404.html, and .nojekyll
fs.writeFileSync(path.join(distDir, "index.html"), html, "utf8");
fs.writeFileSync(path.join(distDir, "404.html"), html, "utf8");
fs.writeFileSync(path.join(distDir, ".nojekyll"), "");

// 6. Patch JS asset bundles in dist/assets so runtime stylesheet & dynamic imports use REPO_BASE
if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  for (const file of assetFiles) {
    if (file.endsWith(".js")) {
      const filePath = path.join(assetsDir, file);
      let content = fs.readFileSync(filePath, "utf8");
      content = fixPaths(content);
      fs.writeFileSync(filePath, content, "utf8");
    }
  }
}

// 7. Update manifest.json inside dist with correct paths
const sourceManifestPath = path.join(root, "public", "manifest.json");
const manifestPath = path.join(distDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(sourceManifestPath, "utf8"));
  manifest.name = "ذاكر - تطبيق إدارة المصاريف والخزنة";
  manifest.short_name = "ذاكر";
  manifest.id = `https://minasar326-rgb.github.io${REPO_BASE}`;
  manifest.start_url = `${REPO_BASE}?source=pwa`;
  manifest.scope = REPO_BASE;
  if (Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons.map((ic) => {
      const cleanSrc = ic.src.replace(/^\/(?:My-Mouny|Zaker-m|Zaker-MB|zaker)\//, "/");
      return {
        ...ic,
        src: `${REPO_BASE}${cleanSrc.startsWith("/") ? cleanSrc.slice(1) : cleanSrc}`,
      };
    });
  }
  if (Array.isArray(manifest.screenshots)) {
    manifest.screenshots = manifest.screenshots.map((sc) => {
      const cleanSrc = sc.src.replace(/^\/(?:My-Mouny|Zaker-m|Zaker-MB|zaker)\//, "/");
      return {
        ...sc,
        src: `${REPO_BASE}${cleanSrc.startsWith("/") ? cleanSrc.slice(1) : cleanSrc}`,
      };
    });
  }
  if (Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts = manifest.shortcuts.map((sh) => ({
      ...sh,
      url: REPO_BASE,
      icons: Array.isArray(sh.icons)
        ? sh.icons.map((ic) => {
            const cleanSrc = ic.src.replace(/^\/(?:My-Mouny|Zaker-m|Zaker-MB|zaker)\//, "/");
            return {
              ...ic,
              src: `${REPO_BASE}${cleanSrc.startsWith("/") ? cleanSrc.slice(1) : cleanSrc}`,
            };
          })
        : undefined,
    }));
  }
  if (Array.isArray(manifest.file_handlers)) {
    manifest.file_handlers = manifest.file_handlers.map((fh) => ({
      ...fh,
      action: REPO_BASE,
    }));
  }
  if (manifest.share_target) {
    manifest.share_target = {
      ...manifest.share_target,
      action: REPO_BASE,
    };
  }
  if (Array.isArray(manifest.protocol_handlers)) {
    manifest.protocol_handlers = manifest.protocol_handlers.map((ph) => ({
      ...ph,
      url: `${REPO_BASE}?action=%s`,
    }));
  }
  if (Array.isArray(manifest.widgets)) {
    manifest.widgets = manifest.widgets.map((w) => ({
      ...w,
      ms_ac_template: `${REPO_BASE}widgets/balance.json`,
      data: `${REPO_BASE}widgets/balance-data.json`,
      screenshots: Array.isArray(w.screenshots)
        ? w.screenshots.map((sc) => {
            const cleanSrc = sc.src.replace(/^\/(?:My-Mouny|Zaker-m|Zaker-MB|zaker)\//, "/");
            return {
              ...sc,
              src: `${REPO_BASE}${cleanSrc.startsWith("/") ? cleanSrc.slice(1) : cleanSrc}`,
            };
          })
        : undefined,
    }));
  }
  if (manifest.note_taking) {
    manifest.note_taking.new_note_url = `${REPO_BASE}?action=new_note`;
  }
  if (manifest.tab_strip && manifest.tab_strip.new_tab_button) {
    manifest.tab_strip.new_tab_button.url = REPO_BASE;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

// 8. Update sw.js in dist with correct precache URLs and cache invalidation
const swPath = path.join(distDir, "sw.js");
const sourceSwPath = path.join(root, "public", "sw.js");
fs.copyFileSync(sourceSwPath, swPath);
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, "utf8");

  const staticAssetFiles = fs.existsSync(assetsDir)
    ? fs.readdirSync(assetsDir).map((f) => `${REPO_BASE}assets/${f}`)
    : [];

  const precacheList = [
    REPO_BASE,
    `${REPO_BASE}index.html`,
    `${REPO_BASE}offline.html`,
    `${REPO_BASE}manifest.json`,
    `${REPO_BASE}favicon.png`,
    `${REPO_BASE}favicon.svg`,
    `${REPO_BASE}apple-touch-icon.png`,
    `${REPO_BASE}icons/icon-192.png`,
    `${REPO_BASE}icons/icon-512.png`,
    `${REPO_BASE}icons/icon-maskable.png`,
    `${REPO_BASE}screenshots/screenshot-mobile.png`,
    `${REPO_BASE}screenshots/screenshot-desktop.png`,
    `${REPO_BASE}widgets/balance.json`,
    `${REPO_BASE}widgets/balance-data.json`,
    ...staticAssetFiles,
  ];

  // Update PRECACHE_ASSETS
  swContent = swContent.replace(
    /const PRECACHE_ASSETS = \[[^\]]*\];/s,
    `const PRECACHE_ASSETS = ${JSON.stringify(precacheList, null, 2)};`
  );

  // Bump Cache Name with timestamp to invalidate any stale browser SW cache
  const timestamp = Date.now();
  swContent = swContent.replace(
    /const CACHE_NAME = "[^"]*";/,
    `const CACHE_NAME = "zaker-cache-v${timestamp}";`
  );

  swContent = fixPaths(swContent);
  fs.writeFileSync(swPath, swContent, "utf8");
}

// Copy offline.html to dist
const sourceOfflineHtml = path.join(root, "public", "offline.html");
const distOfflineHtml = path.join(distDir, "offline.html");
if (fs.existsSync(sourceOfflineHtml)) {
  fs.copyFileSync(sourceOfflineHtml, distOfflineHtml);
}

// Copy widgets to dist and root
const sourceWidgetsDir = path.join(root, "public", "widgets");
const distWidgetsDir = path.join(distDir, "widgets");
const rootWidgetsDir = path.join(root, "widgets");
if (fs.existsSync(sourceWidgetsDir)) {
  copyDir(sourceWidgetsDir, distWidgetsDir);
  copyDir(sourceWidgetsDir, rootWidgetsDir);
}

// 9. Mirror static entry files to repository root for dual-mode deployment (branch root or gh-pages)
const rootFilesToSync = ["404.html", "manifest.json", "sw.js", ".nojekyll", "offline.html", "index.html"];
for (const file of rootFilesToSync) {
  const src = path.join(distDir, file);
  const dest = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Also ensure root assets directory exists for root-serving fallback
const rootAssetsDir = path.join(root, "assets");
if (fs.existsSync(assetsDir)) {
  copyDir(assetsDir, rootAssetsDir);
}

console.log(`GitHub Pages static export completed successfully with all asset paths mapped to ${REPO_BASE}!`);
