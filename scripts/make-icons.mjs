import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  
  const svgContent = fs.readFileSync(path.resolve("public/favicon.svg"), "utf8");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:#1c1a17;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;">
    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${svgContent}</div>
  </body></html>`;
  
  fs.mkdirSync("public/icons", { recursive: true });
  
  await page.setContent(html);
  
  await page.setViewportSize({ width: 192, height: 192 });
  await page.screenshot({ path: "public/icons/icon-192.png", type: "png" });
  
  await page.setViewportSize({ width: 512, height: 512 });
  await page.screenshot({ path: "public/icons/icon-512.png", type: "png" });

  await page.screenshot({ path: "public/icons/icon-maskable.png", type: "png" });
  
  await browser.close();
  console.log("Icons generated successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
