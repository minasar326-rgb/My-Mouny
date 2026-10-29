import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const vercelStatic = path.join(root, ".vercel", "output", "static");
const distDir = path.join(root, "dist");
const REPO_BASE = "/My-Mouny/";

console.log("Exporting production build for GitHub Pages into:", distDir);

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

// 4. Adapt paths for GitHub Pages subpath /My-Mouny/
function fixPaths(str) {
  let s = str;
  // Clean potential duplicate prefixes first
  s = s.replaceAll('/My-Mouny/My-Mouny/', '/My-Mouny/');

  // Replace in HTML attributes
  s = s.replaceAll('href="/assets/', 'href="/My-Mouny/assets/');
  s = s.replaceAll('src="/assets/', 'src="/My-Mouny/assets/');
  s = s.replaceAll('href="/icons/', 'href="/My-Mouny/icons/');
  s = s.replaceAll('src="/icons/', 'src="/My-Mouny/icons/');
  s = s.replaceAll('href="/favicon.', 'href="/My-Mouny/favicon.');
  s = s.replaceAll('href="/apple-touch-icon', 'href="/My-Mouny/apple-touch-icon');
  s = s.replaceAll('href="/manifest.json"', 'href="/My-Mouny/manifest.json"');

  // Replace inside JS backticks, double quotes, and single quotes
  s = s.replaceAll('`/assets/', '`/My-Mouny/assets/');
  s = s.replaceAll('"/assets/', '"/My-Mouny/assets/');
  s = s.replaceAll("'/assets/", "'/My-Mouny/assets/");

  s = s.replaceAll('`/icons/', '`/My-Mouny/icons/');
  s = s.replaceAll('"/icons/', '"/My-Mouny/icons/');
  s = s.replaceAll("'/icons/", "'/My-Mouny/icons/");

  s = s.replaceAll('`/screenshots/', '`/My-Mouny/screenshots/');
  s = s.replaceAll('"/screenshots/', '"/My-Mouny/screenshots/');
  s = s.replaceAll("'/screenshots/", "'/My-Mouny/screenshots/");

  s = s.replaceAll('`/favicon.', '`/My-Mouny/favicon.');
  s = s.replaceAll('"/favicon.', '"/My-Mouny/favicon.');
  s = s.replaceAll("'/favicon.", "'/My-Mouny/favicon.");

  s = s.replaceAll('`/apple-touch-icon', '`/My-Mouny/apple-touch-icon');
  s = s.replaceAll('"/apple-touch-icon', '"/My-Mouny/apple-touch-icon');

  s = s.replaceAll('`/manifest.json`', '`/My-Mouny/manifest.json`');
  s = s.replaceAll('"/manifest.json"', '"/My-Mouny/manifest.json"');

  s = s.replaceAll('`/sw.js`', '`/My-Mouny/sw.js`');
  s = s.replaceAll('"/sw.js"', '"/My-Mouny/sw.js"');

  // Idempotently clean any double prefix
  s = s.replaceAll('/My-Mouny/My-Mouny/', '/My-Mouny/');
  return s;
}

html = fixPaths(html);

// Clean up platform-specific dynamic middleware artifacts not present on static GitHub Pages
html = html.replace(/<link rel="manifest" href="\/__grok\/manifest\.webmanifest">/g, '');
html = html.replace(/<link rel="manifest" href="\/My-Mouny\/__grok\/manifest\.webmanifest">/g, '');
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

  if (actualCss) {
    html = html.replace(/(?:\/My-Mouny)?\/assets\/styles-[A-Za-z0-9_-]+\.css/g, `/My-Mouny/assets/${actualCss}`);
  }
  if (actualJs) {
    html = html.replace(/(?:\/My-Mouny)?\/assets\/index-[A-Za-z0-9_-]+\.js/g, `/My-Mouny/assets/${actualJs}`);
  }
  html = html.replaceAll('/My-Mouny/My-Mouny/', '/My-Mouny/');
}

// 5. Write index.html, 404.html, and .nojekyll
fs.writeFileSync(path.join(distDir, "index.html"), html, "utf8");
fs.writeFileSync(path.join(distDir, "404.html"), html, "utf8");
fs.writeFileSync(path.join(distDir, ".nojekyll"), "");

// 6. Patch JS asset bundles in dist/assets so runtime stylesheet & dynamic imports use /My-Mouny/
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

// 7. Update manifest.json inside dist with correct /My-Mouny/ paths
const manifestPath = path.join(distDir, "manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.start_url = "/My-Mouny/?source=pwa";
  manifest.scope = "/My-Mouny/";
  if (Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons.map((ic) => ({
      ...ic,
      src: ic.src.startsWith("/My-Mouny/")
        ? ic.src
        : `/My-Mouny${ic.src.startsWith("/") ? "" : "/"}${ic.src}`,
    }));
  }
  if (Array.isArray(manifest.screenshots)) {
    manifest.screenshots = manifest.screenshots.map((sc) => ({
      ...sc,
      src: sc.src.startsWith("/My-Mouny/")
        ? sc.src
        : `/My-Mouny${sc.src.startsWith("/") ? "" : "/"}${sc.src}`,
    }));
  }
  if (Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts = manifest.shortcuts.map((sh) => ({
      ...sh,
      url: "/My-Mouny/",
      icons: Array.isArray(sh.icons)
        ? sh.icons.map((ic) => ({
            ...ic,
            src: ic.src.startsWith("/My-Mouny/")
              ? ic.src
              : `/My-Mouny${ic.src.startsWith("/") ? "" : "/"}${ic.src}`,
          }))
        : undefined,
    }));
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

// 8. Update sw.js in dist with correct precache URLs and cache invalidation
const swPath = path.join(distDir, "sw.js");
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, "utf8");

  const staticAssetFiles = fs.existsSync(assetsDir)
    ? fs.readdirSync(assetsDir).map((f) => `/My-Mouny/assets/${f}`)
    : [];

  const precacheList = [
    "/My-Mouny/",
    "/My-Mouny/index.html",
    "/My-Mouny/manifest.json",
    "/My-Mouny/favicon.png",
    "/My-Mouny/favicon.svg",
    "/My-Mouny/apple-touch-icon.png",
    "/My-Mouny/icons/icon-192.png",
    "/My-Mouny/icons/icon-512.png",
    "/My-Mouny/icons/icon-maskable.png",
    "/My-Mouny/screenshots/screenshot-mobile.png",
    "/My-Mouny/screenshots/screenshot-desktop.png",
    ...staticAssetFiles,
  ];

  // Update PRECACHE_URLS
  swContent = swContent.replace(
    /const PRECACHE_URLS = \[[^\]]*\];/s,
    `const PRECACHE_URLS = ${JSON.stringify(precacheList, null, 2)};`
  );

  // Bump Cache Name with timestamp to invalidate any stale browser SW cache
  const timestamp = Date.now();
  swContent = swContent.replace(
    /const CACHE_NAME = "[^"]*";/,
    `const CACHE_NAME = "mymouny-pages-v${timestamp}";`
  );

  // Replace navigation matching logic for GitHub Pages
  swContent = swContent.replaceAll('cache.match("/")', '(await cache.match("/My-Mouny/", { ignoreSearch: true })) || (await cache.match("/", { ignoreSearch: true }))');
  swContent = swContent.replaceAll('cache.put("/", copy)', 'cache.put("/My-Mouny/", copy)');

  swContent = fixPaths(swContent);
  fs.writeFileSync(swPath, swContent, "utf8");
}

console.log("GitHub Pages static export completed successfully with all asset paths mapped to /My-Mouny/!");
