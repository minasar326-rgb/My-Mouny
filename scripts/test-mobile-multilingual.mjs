import { chromium, devices } from "playwright";

async function runMobileTest() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const mobileDevice = devices["iPhone 13"];
  const context = await browser.newContext({
    ...mobileDevice,
  });

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Switch between languages on mobile
  await page.locator('button:has-text("EN")').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "./screenshots/mobile-en.png" });

  await page.locator('button:has-text("EL")').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "./screenshots/mobile-el.png" });

  await page.locator('button:has-text("AR")').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "./screenshots/mobile-ar.png" });

  console.log("Mobile test completed successfully!");
  console.log("Console errors:", errors.length === 0 ? "NONE" : errors);

  await browser.close();
}

runMobileTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
