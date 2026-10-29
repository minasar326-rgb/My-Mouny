import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function generateAll() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const imgPath = "C:/Users/Lap4U/.gemini/antigravity/brain/dfa7220c-5df2-4a50-bb5d-f58c82d55357/.user_uploaded/media_1793265645044_7ca3a0e8.jpg";
  const b64 = fs.readFileSync(imgPath).toString("base64");

  console.log("Generating all icon sizes and store assets from new image...");

  const assets = await page.evaluate((imgB64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const cropX = 280;
        const cropY = 73;
        const cropSize = 432;

        // 1. Standard full-bleed 512x512 icon
        const c512 = document.createElement("canvas");
        c512.width = 512;
        c512.height = 512;
        const ctx512 = c512.getContext("2d");
        ctx512.imageSmoothingEnabled = true;
        ctx512.imageSmoothingQuality = "high";
        ctx512.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, 512, 512);

        // 2. 192x192
        const c192 = document.createElement("canvas");
        c192.width = 192;
        c192.height = 192;
        const ctx192 = c192.getContext("2d");
        ctx192.imageSmoothingEnabled = true;
        ctx192.imageSmoothingQuality = "high";
        ctx192.drawImage(c512, 0, 0, 192, 192);

        // 3. Maskable 512x512 (Safe-zone 80%: padded 51px on each side with matching background)
        const cMask = document.createElement("canvas");
        cMask.width = 512;
        cMask.height = 512;
        const ctxMask = cMask.getContext("2d");
        ctxMask.imageSmoothingEnabled = true;
        ctxMask.imageSmoothingQuality = "high";
        // Fill background with soft background from original image
        ctxMask.fillStyle = "#eef3f7";
        ctxMask.fillRect(0, 0, 512, 512);
        // Draw icon centered at 80% scale (410x410 at 51, 51)
        ctxMask.drawImage(c512, 51, 51, 410, 410);

        // 4. Apple Touch Icon 180x180
        const c180 = document.createElement("canvas");
        c180.width = 180;
        c180.height = 180;
        const ctx180 = c180.getContext("2d");
        ctx180.imageSmoothingEnabled = true;
        ctx180.imageSmoothingQuality = "high";
        ctx180.drawImage(c512, 0, 0, 180, 180);

        // 5. Favicon 48x48
        const c48 = document.createElement("canvas");
        c48.width = 48;
        c48.height = 48;
        const ctx48 = c48.getContext("2d");
        ctx48.imageSmoothingEnabled = true;
        ctx48.imageSmoothingQuality = "high";
        ctx48.drawImage(c512, 0, 0, 48, 48);

        // Android Mipmaps
        function makeSize(s) {
          const c = document.createElement("canvas");
          c.width = s;
          c.height = s;
          const ctx = c.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(c512, 0, 0, s, s);
          return c.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
        }

        resolve({
          i512: c512.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""),
          i192: c192.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""),
          iMask: cMask.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""),
          i180: c180.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""),
          i48: c48.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""),
          mdpi: makeSize(48),
          hdpi: makeSize(72),
          xhdpi: makeSize(96),
          xxhdpi: makeSize(144),
          xxxhdpi: makeSize(192),
        });
      };
      img.src = "data:image/jpeg;base64," + imgB64;
    });
  }, b64);

  // Write PWA icons
  fs.writeFileSync("public/icons/icon-512.png", Buffer.from(assets.i512, "base64"));
  fs.writeFileSync("public/icons/icon-192.png", Buffer.from(assets.i192, "base64"));
  fs.writeFileSync("public/icons/icon-maskable.png", Buffer.from(assets.iMask, "base64"));
  fs.writeFileSync("public/apple-touch-icon.png", Buffer.from(assets.i180, "base64"));
  fs.writeFileSync("public/favicon.png", Buffer.from(assets.i48, "base64"));
  console.log("✓ PWA & Web icons written to public/");

  // Write Android mipmap icons
  const mipmaps = [
    { dir: "android/app/src/main/res/mipmap-mdpi", b64: assets.mdpi },
    { dir: "android/app/src/main/res/mipmap-hdpi", b64: assets.hdpi },
    { dir: "android/app/src/main/res/mipmap-xhdpi", b64: assets.xhdpi },
    { dir: "android/app/src/main/res/mipmap-xxhdpi", b64: assets.xxhdpi },
    { dir: "android/app/src/main/res/mipmap-xxxhdpi", b64: assets.xxxhdpi },
  ];

  for (const m of mipmaps) {
    if (fs.existsSync(m.dir)) {
      const buf = Buffer.from(m.b64, "base64");
      fs.writeFileSync(path.join(m.dir, "ic_launcher.png"), buf);
      fs.writeFileSync(path.join(m.dir, "ic_launcher_round.png"), buf);
    }
  }

  // Play Store launcher icon
  if (fs.existsSync("android/app/src/main")) {
    fs.writeFileSync("android/app/src/main/ic_launcher-playstore.png", Buffer.from(assets.i512, "base64"));
  }
  console.log("✓ Android project icons written to android/app/");

  // 6. Generate Google Play 1024x500 Feature Graphic
  await page.setViewportSize({ width: 1024, height: 500 });
  const featureHtml = `
  <!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@500;700;800&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1024px;
        height: 500px;
        background: radial-gradient(circle at 80% 20%, #1e3a34 0%, #141f1c 45%, #0c1210 100%);
        font-family: 'IBM Plex Sans Arabic', sans-serif;
        color: #f4f1eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 60px 80px;
        position: relative;
        overflow: hidden;
      }
      .glow {
        position: absolute;
        width: 450px;
        height: 450px;
        background: radial-gradient(circle, rgba(13,148,136,0.3) 0%, transparent 70%);
        top: -100px;
        right: -50px;
        border-radius: 50%;
        filter: blur(40px);
      }
      .content { max-width: 580px; z-index: 2; }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(13, 148, 136, 0.2);
        border: 1px solid rgba(13, 148, 136, 0.4);
        color: #2dd4bf;
        padding: 6px 16px;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 20px;
      }
      h1 {
        font-size: 56px;
        font-weight: 800;
        color: #ffffff;
        line-height: 1.15;
        margin-bottom: 14px;
        letter-spacing: -1px;
      }
      p { font-size: 19px; color: #99a1af; line-height: 1.6; margin-bottom: 28px; }
      .tags { display: flex; gap: 12px; }
      .tag {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 8px 16px;
        border-radius: 12px;
        font-size: 15px;
        color: #e5e7eb;
        font-weight: 500;
      }
      .icon-box {
        z-index: 2;
        width: 240px;
        height: 240px;
        border-radius: 48px;
        overflow: hidden;
        border: 3px solid rgba(45,212,191,0.5);
        box-shadow: 0 25px 60px -15px rgba(0,0,0,0.8);
      }
      .icon-box img { width: 100%; height: 100%; object-fit: cover; }
    </style>
  </head>
  <body>
    <div class="glow"></div>
    <div class="content">
      <div class="badge">🔒 مشفر محلياً 100% • دون إنترنت</div>
      <h1>my Mouny</h1>
      <p>إدارة نفقاتك، أرصدة الكاش والبنك، وسجلات ديونك في مكان واحد بأعلى درجات الخصوصية والأمان أوفلاين 100%.</p>
      <div class="tags">
        <div class="tag">⚡ فتح فوري</div>
        <div class="tag">🛡️ تشفير AES-256</div>
        <div class="tag">🌐 متعدد اللغات والعملات</div>
      </div>
    </div>
    <div class="icon-box">
      <img src="data:image/png;base64,${assets.i512}" />
    </div>
  </body>
  </html>
  `;
  await page.setContent(featureHtml);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "public/feature-graphic.png" });
  console.log("✓ Feature Graphic generated: public/feature-graphic.png");

  // 7. Generate 1200x630 OpenGraph og.jpg
  await page.setViewportSize({ width: 1200, height: 630 });
  const ogHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        background: radial-gradient(circle at 80% 20%, #1e3a34 0%, #141f1c 50%, #0c1210 100%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #f4f1eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 80px 100px;
      }
      .content { max-width: 650px; }
      h1 { font-size: 64px; font-weight: 800; color: #ffffff; margin-bottom: 20px; }
      p { font-size: 24px; color: #99a1af; line-height: 1.5; }
      .icon-box {
        width: 280px;
        height: 280px;
        border-radius: 56px;
        overflow: hidden;
        border: 4px solid rgba(45,212,191,0.5);
        box-shadow: 0 30px 80px -20px rgba(0,0,0,0.8);
      }
      .icon-box img { width: 100%; height: 100%; object-fit: cover; }
    </style>
  </head>
  <body>
    <div class="content">
      <div style="display:inline-block;padding:8px 20px;border-radius:30px;background:rgba(13,148,136,0.2);border:1px solid rgba(13,148,136,0.4);color:#2dd4bf;font-weight:700;margin-bottom:24px;font-size:16px;">🔒 100% Offline & Encrypted Personal Finance</div>
      <h1>my Mouny</h1>
      <p>Smart Personal Finance, Cash & Bank Balances, and Debt Management. 100% Private, Local & Offline.</p>
    </div>
    <div class="icon-box">
      <img src="data:image/png;base64,${assets.i512}" />
    </div>
  </body>
  </html>
  `;
  await page.setContent(ogHtml);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "public/og.jpg", type: "jpeg", quality: 90 });
  console.log("✓ OpenGraph image generated: public/og.jpg");

  await browser.close();
  console.log("🎉 All assets successfully updated!");
}

generateAll().catch(console.error);
