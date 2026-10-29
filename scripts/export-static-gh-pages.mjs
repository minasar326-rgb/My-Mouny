import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const vercelStatic = path.join(root, ".vercel", "output", "static");
const distDir = path.join(root, "dist");

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
// Replace absolute root paths with /My-Mouny/ paths idempotently
html = html.replaceAll('href="/My-Mouny/', 'href="/');
html = html.replaceAll('src="/My-Mouny/', 'src="/');
html = html.replaceAll('"/My-Mouny/', '"/');
html = html.replaceAll('href="/', 'href="/My-Mouny/');
html = html.replaceAll('src="/', 'src="/My-Mouny/');
html = html.replaceAll('"/assets/', '"/My-Mouny/assets/');
html = html.replaceAll('/My-Mouny/My-Mouny/', '/My-Mouny/');

// Clean up platform-specific dynamic middleware artifacts not present on static GitHub Pages
html = html.replace(/<link rel="manifest" href="\/My-Mouny\/__grok\/manifest\.webmanifest">/g, '');
html = html.replace(/<script src="https:\/\/grok\.com\/grok-app-builder\/extensions\.js"[^>]*><\/script>/g, '');
html = html.replace(/<meta name="twitter:card"[^>]*>/g, '');
html = html.replace(/<meta property="og:title"[^>]*>/g, '');
html = html.replace(/<link rel="apple-touch-icon" href="[^"]*__grok[^"]*">/g, '');

// 5. Write index.html, 404.html, and .nojekyll
fs.writeFileSync(path.join(distDir, "index.html"), html, "utf8");
fs.writeFileSync(path.join(distDir, "404.html"), html, "utf8");
fs.writeFileSync(path.join(distDir, ".nojekyll"), "");

// 6. Update manifest.json inside dist
const manifestPath = path.join(distDir, "manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.start_url = "/My-Mouny/?source=pwa";
  manifest.scope = "/My-Mouny/";
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

console.log("GitHub Pages static export completed successfully!");
