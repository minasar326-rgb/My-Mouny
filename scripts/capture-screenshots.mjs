import { chromium } from "playwright";
import fs from "fs";

async function capture() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  if (!fs.existsSync("public/screenshots")) {
    fs.mkdirSync("public/screenshots", { recursive: true });
  }

  // 1. Mobile screenshot
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto("http://localhost:8888/", { waitUntil: "load" });
  await mobilePage.waitForTimeout(1000);
  const skipBtn = mobilePage.locator("button:has-text('الرجوع إلى الرئيسية'), button:has-text('المتابعة إلى الرئيسية')");
  if (await skipBtn.isVisible()) await skipBtn.first().click();
  await mobilePage.waitForSelector("text=صافي ما تملك");
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: "public/screenshots/screenshot-mobile.png" });
  console.log("✓ Mobile screenshot saved to public/screenshots/screenshot-mobile.png");

  // 2. Desktop screenshot
  const deskCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const deskPage = await deskCtx.newPage();
  await deskPage.goto("http://localhost:8888/", { waitUntil: "load" });
  await deskPage.waitForSelector("text=صافي ما تملك");
  await deskPage.waitForTimeout(500);
  await deskPage.screenshot({ path: "public/screenshots/screenshot-desktop.png" });
  console.log("✓ Desktop screenshot saved to public/screenshots/screenshot-desktop.png");

  await browser.close();
}

capture().catch(console.error);
