import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const distDir = path.join(process.cwd(), "dist");
const PORT = 9999;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Create a static server that simulates GitHub Pages at /My-Mouny/
const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/" || urlPath === "/My-Mouny") {
    res.writeHead(302, { Location: "/My-Mouny/" });
    return res.end();
  }

  // Strip /My-Mouny/ prefix
  let relPath = urlPath.replace(/^\/My-Mouny\/?/, "");
  if (!relPath || relPath.endsWith("/")) relPath += "index.html";

  let filePath = path.join(distDir, relPath);
  if (!fs.existsSync(filePath)) {
    // GitHub Pages 404 fallback
    filePath = path.join(distDir, "404.html");
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || "application/octet-stream";

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, async () => {
  console.log(`Test server running at http://localhost:${PORT}/My-Mouny/`);

  try {
    const browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage();

    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      console.log("PAGE ERROR STACK:", err.stack);
      consoleErrors.push(err.message);
    });

    console.log("Navigating to static build on simulated GitHub Pages...");
    await page.goto(`http://localhost:${PORT}/My-Mouny/`, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector("nav", { timeout: 8000 });
      console.log("SUCCESS: Navigation selector 'nav' loaded!");
    } catch {
      console.log("Selector 'nav' did not appear in 8 seconds");
      console.log("PAGE CONTENT AT TIMEOUT:");
      console.log(await page.content());
    }

    const title = await page.title();
    console.log("Static page title:", title);

    const bodyText = await page.innerText("body");
    console.log("Has 'My Mouny' in body:", bodyText.includes("My Mouny"));
    console.log("Has cash/bank or overview:", bodyText.includes("كاش") || bodyText.includes("الأرصدة") || bodyText.includes("تثبيت الأرصدة"));
    console.log("Console errors count:", consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log("Console errors:", consoleErrors);
    }

    await page.screenshot({ path: "screenshots/gh-pages-preview.png", fullPage: true });
    await browser.close();
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    server.close();
    process.exit(0);
  }
});
