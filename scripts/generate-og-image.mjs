import { chromium } from "playwright";
import fs from "fs";

async function generateOg() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const iconBase64 = fs.readFileSync("public/icons/icon-512.png").toString("base64");

  const html = `
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
      <h1>My Mouny</h1>
      <p>Smart Personal Finance, Cash & Bank Balances, and Debt Management. 100% Private, Local & Offline.</p>
    </div>
    <div class="icon-box">
      <img src="data:image/png;base64,${iconBase64}" />
    </div>
  </body>
  </html>
  `;
  await page.setContent(html);
  await page.screenshot({ path: "public/og.jpg", type: "jpeg", quality: 90 });
  await browser.close();
  console.log("✅ og.jpg updated successfully!");
}

generateOg().catch(console.error);
