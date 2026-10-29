import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";

async function run() {
  if (!existsSync("./screenshots")) {
    mkdirSync("./screenshots", { recursive: true });
  }

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  console.log("Navigating to http://localhost:8888/ ...");
  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Initial State (Arabic)
  const initialLang = await page.evaluate(() => document.documentElement.lang);
  const initialDir = await page.evaluate(() => document.documentElement.dir);
  console.log(`Initial: lang=${initialLang}, dir=${initialDir}`);
  await page.screenshot({ path: "./screenshots/lang-ar.png" });

  // 2. Switch to English
  console.log("Clicking English button (EN)...");
  await page.locator('button:has-text("EN")').first().click();
  await page.waitForTimeout(500);

  const enLang = await page.evaluate(() => document.documentElement.lang);
  const enDir = await page.evaluate(() => document.documentElement.dir);
  const enText = await page.textContent("body");
  console.log(`English: lang=${enLang}, dir=${enDir}, contains 'Vault & Balances': ${enText.includes("Vault & Balances")}`);
  await page.screenshot({ path: "./screenshots/lang-en.png" });

  if (enLang !== "en" || enDir !== "ltr") {
    throw new Error(`Expected lang=en, dir=ltr but got lang=${enLang}, dir=${enDir}`);
  }

  // 3. Switch to Greek
  console.log("Clicking Greek button (EL)...");
  await page.locator('button:has-text("EL")').first().click();
  await page.waitForTimeout(500);

  const elLang = await page.evaluate(() => document.documentElement.lang);
  const elDir = await page.evaluate(() => document.documentElement.dir);
  const elText = await page.textContent("body");
  console.log(`Greek: lang=${elLang}, dir=${elDir}, contains 'Θησαυροφυλάκιο': ${elText.includes("Θησαυροφυλάκιο")}`);
  await page.screenshot({ path: "./screenshots/lang-el.png" });

  if (elLang !== "el" || elDir !== "ltr") {
    throw new Error(`Expected lang=el, dir=ltr but got lang=${elLang}, dir=${elDir}`);
  }

  // 4. Switch back to Arabic
  console.log("Clicking Arabic button (AR)...");
  await page.locator('button:has-text("AR")').first().click();
  await page.waitForTimeout(500);

  const arLang = await page.evaluate(() => document.documentElement.lang);
  const arDir = await page.evaluate(() => document.documentElement.dir);
  const arText = await page.textContent("body");
  console.log(`Arabic restored: lang=${arLang}, dir=${arDir}, contains 'الخزينة والأرصدة': ${arText.includes("الخزينة والأرصدة")}`);

  if (arLang !== "ar" || arDir !== "rtl") {
    throw new Error(`Expected lang=ar, dir=rtl but got lang=${arLang}, dir=${arDir}`);
  }

  console.log("\n--- TEST SUMMARY ---");
  console.log("All language switches passed seamlessly!");
  console.log("Uncaught console errors:", errors.length === 0 ? "NONE (Clean!)" : errors);

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
