import { chromium } from "playwright";

async function audit() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log("Loading http://localhost:8888/...");
  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Check initial state
  const initialInputs = page.locator('input[placeholder="0.00"]');
  if ((await initialInputs.count()) >= 2) {
    await initialInputs.nth(0).fill("5000");
    await initialInputs.nth(1).fill("15000");
    await page.locator('button[type="submit"]', { hasText: /تثبيت الأرصدة|Set Balances/i }).click();
    await page.waitForTimeout(600);
  }

  // Add 1 purchase
  const addPurchaseBtn = page.locator("button", { hasText: /سجّل شراء|Add Purchase/i }).first();
  if (await addPurchaseBtn.isVisible()) {
    await addPurchaseBtn.click();
    await page.waitForTimeout(400);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('input[inputmode="decimal"]').fill("120");
    await dialog.locator('input:not([type="date"]):not([inputmode])').first().fill("سوبرماركت");
    await dialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(600);
  }

  // Switch to English
  console.log("Switching to English (GB EN)...");
  const enBtn = page.getByRole("button", { name: /EN/i });
  await enBtn.click();
  await page.waitForTimeout(600);

  // Check English body text
  let bodyTextEn = await page.innerText("body");
  let arInEn = bodyTextEn.match(/[\u0600-\u06FF]+/g) || [];
  // Filter out legitimate user data note "سوبرماركت" if present
  let nonUserDataArInEn = arInEn.filter((w) => w !== "سوبرماركت");
  console.log("Arabic words remaining in English UI:", nonUserDataArInEn);

  // Switch tabs in English to check other tabs!
  console.log("Checking Ledger Tab in English...");
  await page.locator("button", { hasText: /Ledger & History/i }).click();
  await page.waitForTimeout(400);
  bodyTextEn = await page.innerText("body");
  arInEn = (bodyTextEn.match(/[\u0600-\u06FF]+/g) || []).filter((w) => w !== "سوبرماركت");
  console.log("Arabic words remaining in Ledger Tab:", arInEn);

  console.log("Checking Receivables & Debts Tab in English...");
  await page.locator("button", { hasText: /Receivables & Debts/i }).click();
  await page.waitForTimeout(400);
  bodyTextEn = await page.innerText("body");
  arInEn = (bodyTextEn.match(/[\u0600-\u06FF]+/g) || []).filter((w) => w !== "سوبرماركت");
  console.log("Arabic words remaining in Debts Tab:", arInEn);

  // Switch to Greek
  console.log("Switching to Greek (GR EL)...");
  const elBtn = page.getByRole("button", { name: /EL/i });
  await elBtn.click();
  await page.waitForTimeout(600);

  let bodyTextEl = await page.innerText("body");
  let arInEl = (bodyTextEl.match(/[\u0600-\u06FF]+/g) || []).filter((w) => w !== "سوبرماركت");
  console.log("Arabic words remaining in Greek UI:", arInEl);

  await page.screenshot({ path: "screenshots/en-audit.png", fullPage: true });
  await browser.close();
  console.log("Audit complete.");
}

audit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
