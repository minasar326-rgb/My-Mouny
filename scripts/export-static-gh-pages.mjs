import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const vercelStatic = path.join(root, ".vercel", "output", "static");
const distDir = path.join(root, "dist");
const repoFromGit = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split("/")[1] : null;
const REPO_NAME = process.env.REPO_NAME || repoFromGit || "My-Mouny";
const REPO_BASE = `/${REPO_NAME}/`;

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
  // Convert any previous /My-Mouny/ or /Zaker-m/ to new REPO_BASE
  s = s.replaceAll('/My-Mouny/', REPO_BASE);
  s = s.replaceAll('/Zaker-m/', REPO_BASE);
  s = s.replaceAll('/zaker/', REPO_BASE);

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

// Verify actual CSS and JS filenames in dist/assets
const assetsDir = path.join(distDir, "assets");
if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  const actualCss = assetFiles.find((f) => f.startsWith("styles-") && f.endsWith(".css"));
  const actualJs = assetFiles.find((f) => f.startsWith("index-") && f.endsWith(".js"));
  const actualRoutes = assetFiles.find((f) => f.startsWith("routes-") && f.endsWith(".js"));

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

// Ensure canonical manifest link and immediate Service Worker registration in <head>
if (!html.includes('<link rel="manifest"')) {
  html = html.replace('</head>', `  <link rel="manifest" href="${REPO_BASE}manifest.json">\n</head>`);
}

const immediateSwScript = `
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('${REPO_BASE}sw.js', { scope: '${REPO_BASE}' })
        .then(function(r) {
          console.log('[PWA] ServiceWorker registered with scope:', r.scope);
          if ('sync' in r && r.sync) { r.sync.register('sync-ledger').catch(function(){}); }
          if ('periodicSync' in r && r.periodicSync) { r.periodicSync.register('daily-balance-check', { minInterval: 24 * 60 * 60 * 1000 }).catch(function(){}); }
        })
        .catch(function(e) { console.warn('[PWA] ServiceWorker registration warning:', e); });
    }
  </script>
</head>`;
html = html.replace('</head>', immediateSwScript);

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
    ...staticAssetFiles,
  ];

  // Update PRECACHE_ASSETS
  swContent = swContent.replace(
    /const PRECACHE_ASSETS = \[[^\]]*\];/s,
    `const PRECACHE_ASSETS = ${JSON.stringify(precacheList, null, 2)};`
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

// 9. Mirror static entry files to repository root for dual-mode deployment (branch root or gh-pages)
const rootFilesToSync = ["index.html", "404.html", "manifest.json", "sw.js", ".nojekyll", "offline.html"];
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
