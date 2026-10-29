import { chromium } from "playwright";
import fs from "fs";

async function generateFeatureGraphic() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });

  const html = `
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
      .content {
        max-width: 580px;
        z-index: 2;
      }
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
      p {
        font-size: 19px;
        color: #99a1af;
        line-height: 1.6;
        margin-bottom: 28px;
      }
      .tags {
        display: flex;
        gap: 12px;
      }
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
        width: 220px;
        height: 220px;
        background: linear-gradient(135deg, rgba(20, 184, 166, 0.25), rgba(13, 148, 136, 0.08));
        border: 2px solid rgba(20, 184, 166, 0.4);
        border-radius: 44px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        box-shadow: 0 25px 60px -15px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.2);
      }
      .icon-box svg {
        width: 90px;
        height: 90px;
        color: #2dd4bf;
      }
      .icon-title {
        font-size: 18px;
        font-weight: 700;
        color: #f4f1eb;
        letter-spacing: 0.5px;
      }
    </style>
  </head>
  <body>
    <div class="glow"></div>
    <div class="content">
      <div class="badge">🔒 مشفر محلياً 100% • دون إنترنت</div>
      <h1>My Mouny</h1>
      <p>إدارة نفقاتك، أرصدة الكاش والبنك، وسجلات ديونك في مكان واحد بأعلى درجات الخصوصية والأمان أوفلاين 100%.</p>
      <div class="tags">
        <div class="tag">⚡ فتح فوري</div>
        <div class="tag">🛡️ تشفير AES-256</div>
        <div class="tag">🌐 متعدد اللغات والعملات</div>
      </div>
    </div>
    <div class="icon-box" style="padding:0;overflow:hidden;border-radius:44px;border:3px solid rgba(45,212,191,0.4);box-shadow:0 25px 60px -15px rgba(0,0,0,0.7);">
      <img src="data:image/png;base64,${fs.readFileSync('public/icons/icon-512.png').toString('base64')}" style="width:100%;height:100%;object-fit:cover;" />
    </div>
  </body>
  </html>
  `;

  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "public/feature-graphic.png" });
  console.log("✅ Successfully generated 1024x500 Feature Graphic: public/feature-graphic.png");
  await browser.close();
}

generateFeatureGraphic().catch(console.error);
