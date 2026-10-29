import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  console.log("Navigating to http://localhost:8888/...");
  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });

  const bodyTextAr = await page.innerText("body");
  console.log("Arabic page loaded. Contains Arabic text:", /[\u0600-\u06FF]/.test(bodyTextAr));

  // Switch to English
  const enBtn = page.getByRole("button", { name: /EN/i });
  if (await enBtn.isVisible()) {
    await enBtn.click();
    await page.waitForTimeout(600);
    const bodyTextEn = await page.innerText("body");
    const arInEn = bodyTextEn.match(/[\u0600-\u06FF]+/g);
    console.log("Switched to English. Arabic words remaining in English view:", arInEn ? arInEn.length : 0);
    if (arInEn && arInEn.length > 0) {
      console.log("Sample remaining Arabic words:", arInEn.slice(0, 10));
    }
    await page.screenshot({ path: "screenshots/en-preview.png", fullPage: true });
  }

  // Switch to Greek
  const elBtn = page.getByRole("button", { name: /EL/i });
  if (await elBtn.isVisible()) {
    await elBtn.click();
    await page.waitForTimeout(600);
    const bodyTextEl = await page.innerText("body");
    const arInEl = bodyTextEl.match(/[\u0600-\u06FF]+/g);
    console.log("Switched to Greek. Arabic words remaining in Greek view:", arInEl ? arInEl.length : 0);
    if (arInEl && arInEl.length > 0) {
      console.log("Sample remaining Arabic words:", arInEl.slice(0, 10));
    }
    await page.screenshot({ path: "screenshots/el-preview.png", fullPage: true });
  }

  // Switch back to Arabic
  const arBtn = page.getByRole("button", { name: /AR/i });
  if (await arBtn.isVisible()) {
    await arBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "screenshots/ar-preview.png", fullPage: true });
  }

  console.log("Console errors count:", errors.length);
  if (errors.length > 0) {
    console.log("Console errors:", errors);
  }
  await browser.close();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
