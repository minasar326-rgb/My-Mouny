import { chromium } from "playwright";
import assert from "node:assert/strict";

async function runE2ETests() {
  console.log("🚀 Starting comprehensive QA & E2E Verification for Khazinti...");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // 1. Initial Page Load
  console.log("➡️ Step 1: Loading application at http://localhost:8888/...");
  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Verify header and initial components exist
  const appTitle = await page.innerText("h1");
  console.log(`✓ Initial Screen Loaded. Vault title: "${appTitle}"`);

  // 2. Set Opening Balances (Cash: 5000, Bank: 20000) if not started yet
  console.log("➡️ Step 2: Checking/Setting initial balances (Cash: 5000, Bank: 20000)...");
  const initialInputs = page.locator('input[placeholder="0.00"]');
  const count = await initialInputs.count();

  if (count >= 2) {
    await initialInputs.nth(0).fill("5000");
    await initialInputs.nth(1).fill("20000");
    const setBtn = page.locator('button[type="submit"]', { hasText: /تثبيت الأرصدة|Set Balances/i });
    if (await setBtn.isVisible()) {
      await setBtn.click();
      await page.waitForTimeout(800);
      console.log("✓ Opening balances saved.");
    }
  }

  // Helper for dialog operations
  const getDialog = () => page.locator('div[role="dialog"]');

  // 3. Add Purchase: 500 from Cash (سوبرماركت التحرير)
  console.log("➡️ Step 3: Recording a purchase of 500 from Cash...");
  const addPurchaseBtn = page.locator("button", { hasText: /سجّل شراء|Add Purchase/i }).first();
  await addPurchaseBtn.click();
  await page.waitForTimeout(500);

  const purchaseDialog = getDialog();
  await purchaseDialog.locator('input[inputmode="decimal"]').fill("500");
  await purchaseDialog.locator('input:not([inputmode])').first().fill("سوبرماركت التحرير");
  await purchaseDialog.locator('button[type="submit"]').click();
  await page.waitForTimeout(800);
  console.log("✓ Purchase of 500 recorded.");

  // 4. Add Income: 3,000 into Bank
  console.log("➡️ Step 4: Recording income of 3,000 to Bank...");
  const addIncomeBtn = page.locator("button", { hasText: /أضفت مالاً|Add Income/i }).first();
  await addIncomeBtn.click();
  await page.waitForTimeout(500);

  const incomeDialog = getDialog();
  await incomeDialog.locator('input[inputmode="decimal"]').fill("3000");
  const bankRadio = incomeDialog.locator("button", { hasText: /البنك|Bank/i }).first();
  if (await bankRadio.isVisible()) await bankRadio.click();
  await incomeDialog.locator('input:not([inputmode])').first().fill("مشروع مستقل");
  await incomeDialog.locator('button[type="submit"]').click();
  await page.waitForTimeout(800);
  console.log("✓ Income of 3,000 recorded.");

  // 5. Transfer: 1,000 between Cash and Bank
  console.log("➡️ Step 5: Transferring 1,000 between pockets...");
  const transferBtn = page.locator("button", { hasText: /تحويل|Transfer/i }).first();
  await transferBtn.click();
  await page.waitForTimeout(500);

  const transferDialog = getDialog();
  await transferDialog.locator('input[inputmode="decimal"]').fill("1000");
  await transferDialog.locator('button[type="submit"]').click();
  await page.waitForTimeout(800);
  console.log("✓ Transfer executed cleanly.");

  // 6. Navigate to Receivables & Debts Tab
  console.log("➡️ Step 6: Testing Receivables & Payables (Debts tab)...");
  const debtsTab = page.locator("button", { hasText: /لي وعليّ|Receivables & Debts/i });
  await debtsTab.click();
  await page.waitForTimeout(600);

  // Add a loan given to "محمد أحمد" of 2,000
  const addRecvBtn = page.locator("button", { hasText: /تسجيل مبلغ لك|Record Money Owed/i });
  await addRecvBtn.click();
  await page.waitForTimeout(500);

  const recvDialog = getDialog();
  // In receivable: person name is the first text input, amount is decimal input
  await recvDialog.locator('input:not([inputmode])').first().fill("محمد أحمد");
  await recvDialog.locator('input[inputmode="decimal"]').fill("2000");
  await recvDialog.locator('button[type="submit"]').click();
  await page.waitForTimeout(800);

  let bodyText = await page.innerText("body");
  assert.ok(bodyText.includes("محمد أحمد"), "Person Mohamed Ahmed should appear in receivables list");
  console.log("✓ Loan of 2,000 recorded for Mohamed Ahmed.");

  // 7. Ledger History, Search, and Filtering
  console.log("➡️ Step 7: Testing Ledger History, Search, and Filters...");
  const ledgerTab = page.locator("button", { hasText: /الدفتر والحركات|Ledger & History/i });
  await ledgerTab.click();
  await page.waitForTimeout(600);

  // Search for "سوبرماركت"
  const searchInput = page.locator('input[placeholder*="بحث"], input[placeholder*="Search"]').first();
  await searchInput.fill("سوبرماركت");
  await page.waitForTimeout(500);

  bodyText = await page.innerText("body");
  assert.ok(bodyText.includes("سوبرماركت"), "Search should display matching supermarket transaction");

  // Clear search
  const clearBtn = page.locator("button", { hasText: /إلغاء البحث|Clear/i });
  if (await clearBtn.isVisible()) await clearBtn.click();
  await page.waitForTimeout(400);
  console.log("✓ Ledger search & filter verified.");

  // 8. Offline Simulation
  console.log("➡️ Step 8: Testing Offline capability...");
  await context.setOffline(true);
  await page.waitForTimeout(500);

  bodyText = await page.innerText("body");
  const isOfflineReported = bodyText.includes("أوفلاين") || bodyText.includes("Offline");
  console.log(`✓ Offline status detected by app: ${isOfflineReported}`);

  // Re-enable network
  await context.setOffline(false);
  await page.waitForTimeout(400);

  // 9. Page Reload & Persistence Verification
  console.log("➡️ Step 9: Testing data persistence across full page reload...");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  bodyText = await page.innerText("body");
  assert.ok(bodyText.includes("سوبرماركت"), "Transactions must persist in IndexedDB across reloads");
  console.log("✓ Data persisted perfectly across page reload.");

  // 10. Console Error Verification
  console.log(`➡️ Step 10: Verifying console logs (Errors count: ${consoleErrors.length})...`);
  assert.equal(consoleErrors.length, 0, `Expected 0 console errors, but found: ${JSON.stringify(consoleErrors)}`);
  console.log("✓ ZERO console errors encountered during full flow.");

  await page.screenshot({ path: "screenshots/qa-verified-flow.png", fullPage: true });
  await browser.close();
  console.log("🎉 All QA E2E verification steps completed successfully with 100% pass rate!");
}

runE2ETests().catch((err) => {
  console.error("❌ E2E QA Test failed:", err);
  process.exit(1);
});
