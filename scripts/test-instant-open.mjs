import { chromium } from "playwright";

async function testInstantOpen() {
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
    if (msg.type() === "error") errors.push(msg.text());
  });

  console.log("Visit 1: Initial load...");
  const t0 = Date.now();
  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });
  console.log(`Visit 1 took: ${Date.now() - t0}ms`);

  // Wait for warm snapshot to be set
  await page.waitForTimeout(500);
  const warmCache = await page.evaluate(() => localStorage.getItem("khazinti_warm_cache"));
  console.log("Warm cache established in localStorage:", Boolean(warmCache));

  // Now reload / open again to test INSTANT opening
  console.log("\nVisit 2 (Simulating opening the app):");
  const tStart = Date.now();
  await page.goto("http://localhost:8888/", { waitUntil: "commit" });

  // Measure time until main ledger content is on screen
  await page.waitForSelector('text=الخزينة والأرصدة', { timeout: 3000 });
  const openTime = Date.now() - tStart;
  console.log(`Instant open time: ${openTime}ms (⚡⚡ FAST!)`);

  // Verify that "جاري فتح الخزنة" did NOT stay or block
  const hasStuckLoading = await page.evaluate(() => document.body.innerText.includes("جاري فتح الخزنة"));
  console.log("Has stuck loading text?", hasStuckLoading);

  // Take screenshot
  await page.screenshot({ path: "./screenshots/instant-open-verified.png" });

  console.log("\nConsole errors:", errors.length === 0 ? "NONE (Clean!)" : errors);

  await browser.close();
}

testInstantOpen().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
