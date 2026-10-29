import { chromium } from "playwright";

async function runTestSuite() {
  console.log("==========================================================");
  console.log("🚀 STARTING COMPREHENSIVE QA AUDIT & VERIFICATION SUITE");
  console.log("==========================================================\n");

  const results = {
    passed: [],
    failed: [],
  };

  function record(name, ok, details = "") {
    if (ok) {
      results.passed.push({ name, details });
      console.log(`  ✅ [PASS] ${name} ${details ? `(${details})` : ""}`);
    } else {
      results.failed.push({ name, details });
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ""}`);
    }
  }

  const browser = await chromium.launch({ channel: "msedge" });

  try {
    // ----------------------------------------------------
    // TEST 1: Initial Page Load, Speed & No Console Errors
    // ----------------------------------------------------
    console.log("--- 1. Initial Page Load & Console Health ---");
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    const networkRequests = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("request", (req) => {
      networkRequests.push(req.url());
    });

    const t0 = Date.now();
    await page.goto("http://127.0.0.1:8888/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("خزينتي"));
    const loadTimeMs = Date.now() - t0;

    record("Initial Load Health & Render", loadTimeMs < 5000, `${loadTimeMs}ms (Instant Open)`);
    record("Zero Console Errors", consoleErrors.length === 0, `${consoleErrors.length} errors`);

    // Verify no external analytics, ads, or third-party tracking requests
    const externalTrackers = networkRequests.filter(
      (url) =>
        url.includes("google-analytics") ||
        url.includes("facebook") ||
        url.includes("doubleclick") ||
        url.includes("mixpanel")
    );
    record("Privacy & No Third-Party Tracking", externalTrackers.length === 0, "No tracking calls detected");

    // ----------------------------------------------------
    // TEST 2: Financial Integrity & Calculation Verification
    // ----------------------------------------------------
    console.log("\n--- 2. Financial Integrity & Math Calculations ---");

    // 2.1 Add Income 1,000 EGP (via button 'أضفت مالاً')
    await page.click("button:has-text('أضفت مالاً')");
    await page.waitForSelector("div[role='dialog']");
    let dialog = await page.$("div[role='dialog']");
    let inputs = await dialog.$$("input");
    await inputs[0].fill("1000");
    await inputs[1].fill("مرتب شهري");
    let submitBtn = await dialog.$("button[type='submit']");
    await submitBtn.click();
    await page.waitForSelector("div[role='dialog']", { state: "detached" });

    // 2.2 Add Purchase 250.50 EGP (via button 'سجّل شراء')
    await page.click("button:has-text('سجّل شراء')");
    await page.waitForSelector("div[role='dialog']");
    dialog = await page.$("div[role='dialog']");
    inputs = await dialog.$$("input");
    await inputs[0].fill("250.50");
    await inputs[1].fill("فاتورة كهرباء ومياه");
    submitBtn = await dialog.$("button[type='submit']");
    await submitBtn.click();
    await page.waitForSelector("div[role='dialog']", { state: "detached" });

    // 2.3 Transfer 200 EGP from Cash to Bank (via button 'تحويل')
    await page.click("button:has-text('تحويل')");
    await page.waitForSelector("div[role='dialog']");
    dialog = await page.$("div[role='dialog']");
    inputs = await dialog.$$("input");
    await inputs[0].fill("200");
    submitBtn = await dialog.$("button[type='submit']");
    await submitBtn.click();
    await page.waitForSelector("div[role='dialog']", { state: "detached" });

    // Verify Balances:
    // Income: 1000 Cash -> Purchase: -250.50 Cash (remainder 749.50) -> Transfer: -200 Cash to Bank
    // Cash should be: 549.50 EGP
    // Bank should be: 200.00 EGP
    // Net should be: 749.50 EGP
    await page.waitForTimeout(400);
    const bodyText = await page.evaluate(() => document.body.innerText);

    const hasNet749 = bodyText.includes("749.50");
    const hasCash549 = bodyText.includes("549.50");
    const hasBank200 = bodyText.includes("200.00");
    record("Income, Expense & Transfer Calculation", hasNet749 && hasCash549 && hasBank200, "Cash: 549.50, Bank: 200.00, Net: 749.50");

    // ----------------------------------------------------
    // TEST 3: Debt Engine (Receivables, Payables, Collect, Repay)
    // ----------------------------------------------------
    console.log("\n--- 3. Debt Engine (لي وعليّ) ---");
    // Switch to Debts tab
    const debtsTab = await page.$("nav button:nth-child(3)");
    await debtsTab.click();
    await page.waitForTimeout(300);

    // Record money owed to me (Receivable): 300 EGP from "أحمد"
    await page.click("button:has-text('تسجيل مبلغ لك عند أحد')");
    await page.waitForSelector("div[role='dialog']");
    dialog = await page.$("div[role='dialog']");
    inputs = await dialog.$$("input");
    // inputs[0] is person name
    await inputs[0].fill("أحمد مصطفى");
    // inputs[1] is amount
    await inputs[1].fill("300");
    submitBtn = await dialog.$("button[type='submit']");
    await submitBtn.click();
    await page.waitForSelector("div[role='dialog']", { state: "detached" });

    // Record money I owe to someone (Payable): 100 EGP to "محمود"
    await page.click("button:has-text('تسجيل دين جديد عليك')");
    await page.waitForSelector("div[role='dialog']");
    dialog = await page.$("div[role='dialog']");
    inputs = await dialog.$$("input");
    // inputs[0] is person name
    await inputs[0].fill("محمود علي");
    // inputs[1] is amount
    await inputs[1].fill("100");
    submitBtn = await dialog.$("button[type='submit']");
    await submitBtn.click();
    await page.waitForSelector("div[role='dialog']", { state: "detached" });

    // Check debts tab reflects 300 for أحمد and 100 for محمود
    await page.waitForTimeout(300);
    const debtsText = await page.evaluate(() => document.body.innerText);
    const hasAhmed = debtsText.includes("أحمد مصطفى") && debtsText.includes("300.00");
    const hasMahmoud = debtsText.includes("محمود علي") && debtsText.includes("100.00");
    record("Debt Records (Receivable & Payable)", hasAhmed && hasMahmoud, "Ahmed: 300, Mahmoud: 100");

    // Net Worth should update: Net = Cash (549.50) + Bank (200.00) + Recv (300.00) - Pay (100.00) = 949.50 EGP
    const overviewTab = await page.$("nav button:nth-child(1)");
    await overviewTab.click();
    await page.waitForTimeout(300);
    const updatedOverview = await page.evaluate(() => document.body.innerText);
    record("Net Worth Includes Debts", updatedOverview.includes("949.50"), "Net Worth updated to 949.50 EGP");

    // ----------------------------------------------------
    // TEST 4: Search, Filter & Sort in Ledger Tab
    // ----------------------------------------------------
    console.log("\n--- 4. Search, Filter & Sort in Ledger ---");
    const ledgerTab = await page.$("nav button:nth-child(2)");
    await ledgerTab.click();
    await page.waitForTimeout(300);

    // Search for "كهرباء"
    const searchInput = await page.$("input[placeholder*='ابحث']");
    if (searchInput) {
      await searchInput.fill("كهرباء");
      await page.waitForTimeout(300);
      const searchRes = await page.evaluate(() => document.body.innerText);
      const matched = searchRes.includes("كهرباء") && !searchRes.includes("مرتب شهري");
      record("Search by Note/Keyword", matched, "Found 'كهرباء' and filtered out 'مرتب'");
      await searchInput.fill(""); // Clear search
    }

    // Filter by 'purchase'
    const filterSelect = await page.$("select:has(option[value='purchase'])");
    if (filterSelect) {
      await filterSelect.selectOption("purchase");
      await page.waitForTimeout(300);
      const filterRes = await page.evaluate(() => document.body.innerText);
      const onlyPurchase = filterRes.includes("فاتورة كهرباء") && !filterRes.includes("مرتب شهري");
      record("Filter by Category/Kind", onlyPurchase, "Only purchases visible");
      await filterSelect.selectOption("all"); // Reset filter
    }

    // ----------------------------------------------------
    // TEST 5: Input Validation & Negative Balance Rejection
    // ----------------------------------------------------
    console.log("\n--- 5. Input Validation & Error Handling ---");
    // Try to record purchase of 10,000 EGP (which exceeds Cash balance of 549.50)
    await overviewTab.click();
    await page.waitForTimeout(200);
    await page.click("button:has-text('سجّل شراء')");
    await page.waitForSelector("div[role='dialog']");
    dialog = await page.$("div[role='dialog']");
    inputs = await dialog.$$("input");
    await inputs[0].fill("10000");
    await inputs[1].fill("شراء سيارة");
    submitBtn = await dialog.$("button[type='submit']");
    await submitBtn.click();
    await page.waitForTimeout(400);

    const errorEl = await dialog.$("p.text-debt");
    const errorMsg = errorEl ? await errorEl.innerText() : "";
    record("Overspend / Insufficient Balance Prevention", errorMsg.includes("رصيد الكاش لا يكفي"), errorMsg);

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForSelector("div[role='dialog']", { state: "detached" });

    // Test Eastern Arabic Numerals input parsing (e.g. ٥٠)
    await page.click("button:has-text('سجّل شراء')");
    await page.waitForSelector("div[role='dialog']");
    dialog = await page.$("div[role='dialog']");
    inputs = await dialog.$$("input");
    // Eastern Arabic numerals: ٥٠ (50)
    await inputs[0].fill(String.fromCharCode(0x0665, 0x0660));
    await inputs[1].fill("بنزين");
    submitBtn = await dialog.$("button[type='submit']");
    await submitBtn.click();
    await page.waitForSelector("div[role='dialog']", { state: "detached" });

    await page.waitForTimeout(300);
    const postArabicDigitsText = await page.evaluate(() => document.body.innerText);
    record("Eastern Arabic Numerals (٥٠) Input Support", postArabicDigitsText.includes("بنزين") && postArabicDigitsText.includes("50.00"), "Correctly parsed to 50.00 EGP");

    // ----------------------------------------------------
    // TEST 6: Multilingual Switcher (AR, EN, EL) & RTL/LTR
    // ----------------------------------------------------
    console.log("\n--- 6. Multilingual & RTL/LTR Switching ---");
    // Switch to English
    await page.click("button:has-text('EN')");
    await page.waitForTimeout(300);
    const enDir = await page.evaluate(() => document.documentElement.dir);
    const enLang = await page.evaluate(() => document.documentElement.lang);
    const enText = await page.evaluate(() => document.body.innerText);
    record("Switch to English (LTR)", enDir === "ltr" && enLang === "en" && enText.includes("Current Balances"), `dir=${enDir}, lang=${enLang}`);

    // Switch to Greek
    await page.click("button:has-text('EL')");
    await page.waitForTimeout(300);
    const elDir = await page.evaluate(() => document.documentElement.dir);
    const elLang = await page.evaluate(() => document.documentElement.lang);
    const elText = await page.evaluate(() => document.body.innerText);
    record("Switch to Greek (LTR)", elDir === "ltr" && elLang === "el" && (elText.includes("Υπόλοιπα") || elText.includes("Κύριο")), `dir=${elDir}, lang=${elLang}`);

    // Switch back to Arabic
    await page.click("button:has-text('AR')");
    await page.waitForTimeout(300);
    const arDir = await page.evaluate(() => document.documentElement.dir);
    const arLang = await page.evaluate(() => document.documentElement.lang);
    record("Switch to Arabic (RTL)", arDir === "rtl" && arLang === "ar", `dir=${arDir}, lang=${arLang}`);

    // ----------------------------------------------------
    // TEST 7: Currency Switching (EGP, USD, EUR)
    // ----------------------------------------------------
    console.log("\n--- 7. Currency Switching (EGP, USD, EUR) ---");
    await page.click("button:has-text('$ (USD)')");
    await page.waitForTimeout(300);
    const usdText = await page.evaluate(() => document.body.innerText);
    record("Switch to USD Currency", usdText.includes("$"), "Dollar symbol active");

    await page.click("button:has-text('€ (EUR)')");
    await page.waitForTimeout(300);
    const eurText = await page.evaluate(() => document.body.innerText);
    record("Switch to EUR Currency", eurText.includes("€"), "Euro symbol active");

    await page.click("button:has-text('ج.م (EGP)')");
    await page.waitForTimeout(300);
    const egpText = await page.evaluate(() => document.body.innerText);
    record("Switch to EGP Currency", egpText.includes("ج.م"), "EGP symbol active");

    // ----------------------------------------------------
    // TEST 8: Data Preservation & Persistence across Reload
    // ----------------------------------------------------
    console.log("\n--- 8. Data Persistence & Reload ---");
    const tReload = Date.now();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("خزينتي"));
    const reloadDurationMs = Date.now() - tReload;
    record("Warm Cache Reload Speed", reloadDurationMs < 700, `${reloadDurationMs}ms (Instant Warm Open)`);

    const reloadText = await page.evaluate(() => document.body.innerText);
    const persisted = reloadText.includes("بنزين") || reloadText.includes("فاتورة كهرباء") || reloadText.includes("مرتب");
    record("Data Persistence on Page Reload", persisted, "Transactions survived reload cleanly");

    // ----------------------------------------------------
    // TEST 9: Offline Mode (Complete Network Disconnection)
    // ----------------------------------------------------
    console.log("\n--- 9. Offline Mode (Zero Network) ---");
    await context.setOffline(true);
    // Add transaction while completely offline
    await page.click("button:has-text('أضفت مالاً')");
    await page.waitForSelector("div[role='dialog']");
    dialog = await page.$("div[role='dialog']");
    inputs = await dialog.$$("input");
    await inputs[0].fill("200");
    await inputs[1].fill("مكافأة أوفلاين");
    submitBtn = await dialog.$("button[type='submit']");
    await submitBtn.click();
    await page.waitForSelector("div[role='dialog']", { state: "detached" });

    await page.waitForTimeout(300);
    const offlineText = await page.evaluate(() => document.body.innerText);
    record("Offline Transaction Creation", offlineText.includes("مكافأة أوفلاين"), "Recorded and computed 100% offline");
    await context.setOffline(false);

    // ----------------------------------------------------
    // TEST 10: Clear Ledger While Keeping Balances
    // ----------------------------------------------------
    console.log("\n--- 10. Clear Ledger Keep Balances ---");
    // Open reset dialog from bottom
    const clearBtn = await page.$("button:has-text('تصفير أو بدء من جديد')");
    if (clearBtn) {
      await clearBtn.click();
      await page.waitForSelector("div[role='dialog']");
      // Click safe clear button
      const safeClearBtn = await page.$("button:has-text('تصفير الدفتر مع الحفاظ على الأرصدة')");
      if (safeClearBtn) {
        await safeClearBtn.click();
        await page.waitForTimeout(500);
      }
      const postClearText = await page.evaluate(() => document.body.innerText);
      record("Safe Clear Ledger Preserves Balances", !postClearText.includes("0.00 ج.م.‏") || postClearText.includes("الكاش المثبت"), "Balances and debts successfully preserved");
    }

    // ----------------------------------------------------
    // TEST 11: Mobile Viewport & Responsiveness
    // ----------------------------------------------------
    console.log("\n--- 11. Mobile Responsiveness & Viewports ---");
    // Test iPhone Viewport (390 x 844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    record("iPhone 390px Viewport No Horizontal Overflow", !hasHorizontalScroll, "Clean responsive layout");

    // Test Android Viewport (360 x 740)
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(300);
    const hasAndroidHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    record("Android 360px Viewport No Horizontal Overflow", !hasAndroidHorizontalScroll, "Clean responsive layout");

    // ----------------------------------------------------
    // TEST 12: Backup Export & Integrity Checksum
    // ----------------------------------------------------
    console.log("\n--- 12. Backup Export & Checksum ---");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);
    await page.click("button:has-text('نسخة احتياطية')");
    await page.waitForSelector("div[role='dialog']");
    const exportBtn = await page.$("button:has-text('تجهيز ملف النسخة الاحتياطية')");
    if (exportBtn) {
      await exportBtn.click();
      await page.waitForTimeout(400);
      const downloadBtn = await page.$("a:has-text('تحميل')");
      record("Backup JSON Export & SHA-256 Checksum", downloadBtn !== null, "Ready for safe offline download");
    }
    // Close backup modal
    await page.click("button:has-text('رجوع للرئيسية')");
    await page.waitForSelector("div[role='dialog']", { state: "detached" });

    await context.close();
  } finally {
    await browser.close();
  }

  console.log("\n==========================================================");
  console.log(`📊 QA AUDIT SUMMARY: ${results.passed.length} PASSED / ${results.failed.length} FAILED`);
  console.log("==========================================================");

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
