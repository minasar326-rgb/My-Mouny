import { chromium } from "playwright";

async function testCurrencyAndSections() {
  console.log("=== بدء اختبار العملات المتعددة والأقسام المنفصلة ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  const page = await context.newPage();

  // 1. Visit http://localhost:8888/
  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // If locked, click "المتابعة إلى الرئيسية"
  const skipBtn = page.locator("button:has-text('الرجوع إلى الرئيسية'), button:has-text('المتابعة إلى الرئيسية')");
  if (await skipBtn.isVisible()) {
    await skipBtn.first().click();
    await page.waitForTimeout(1000);
  }

  await page.waitForSelector("text=صافي ما تملك", { timeout: 5000 });
  console.log("✓ تم الدخول إلى التطبيق بنجاح!");

  // --- 1. TEST CURRENCY SWITCHING ---
  console.log("\n[Test 1] اختبار اختيار العملة (يورو / دولار / جنيه مصري)...");

  // Check EGP
  const egpBtn = page.locator("button:has-text('EGP')");
  await egpBtn.click();
  await page.waitForTimeout(500);
  let hasEgp = await page.locator("text=ج.م").first().isVisible();
  console.log("التحويل إلى الجنيه المصري (EGP):", hasEgp ? "ناجح (ج.م ظاهر)" : "فشل");
  if (!hasEgp) throw new Error("رمز الجنيه المصري لم يظهر!");

  // Check USD
  const usdBtn = page.locator("button:has-text('USD')");
  await usdBtn.click();
  await page.waitForTimeout(500);
  let hasUsd = await page.locator("text=$").first().isVisible();
  console.log("التحويل إلى الدولار (USD):", hasUsd ? "ناجح ($ ظاهر)" : "فشل");
  if (!hasUsd) throw new Error("رمز الدولار لم يظهر!");

  // Check EUR
  const eurBtn = page.locator("button:has-text('EUR')");
  await eurBtn.click();
  await page.waitForTimeout(500);
  let hasEur = await page.locator("text=€").first().isVisible();
  console.log("التحويل إلى اليورو (EUR):", hasEur ? "ناجح (€ ظاهر)" : "فشل");
  if (!hasEur) throw new Error("رمز اليورو لم يظهر!");

  // Switch back to EGP (Egyptian Pound)
  await egpBtn.click();
  await page.waitForTimeout(500);
  console.log("✓ تم اختبار جميع العملات (EGP, USD, EUR) والتحويل الفوري يعمل 100%!");

  // --- 2. TEST TABS & SECTIONS ---
  console.log("\n[Test 2] اختبار التنقل بين الأقسام (الخزينة / الدفتر / الديون)...");

  // Click on "الدفتر والحركات"
  console.log("الانتقال إلى قسم الدفتر والحركات...");
  await page.click("button:has-text('الدفتر والحركات')");
  await page.waitForTimeout(500);

  const ledgerHeader = await page.locator("text=دفتر العمليات والحركات المالية").isVisible();
  console.log("هل قسم الدفتر مفتوح كقسم مستقل؟", ledgerHeader);
  if (!ledgerHeader) throw new Error("قسم الدفتر لم يفتح!");

  // Test back button from Ledger tab -> should return to Overview tab!
  console.log("الضغط على زر الرجوع من داخل قسم الدفتر...");
  await page.goBack();
  await page.waitForTimeout(800);

  const backOnOverview = await page.locator("text=صافي ما تملك").isVisible();
  console.log("هل رجعنا إلى قسم الخزينة والأرصدة؟", backOnOverview);
  if (!backOnOverview) throw new Error("زر الرجوع لم يعد إلى قسم الخزينة الرئيسي!");
  console.log("✓ زر الرجوع أعاد المستخدم من الدفتر إلى الرئيسية بخطوة واحدة!");

  // Click on "لي وعليّ (الديون)"
  console.log("\n[Test 3] الانتقال إلى قسم المستحقات والديون (لي وعليّ)...");
  await page.click("button:has-text('لي وعليّ')");
  await page.waitForTimeout(500);

  const debtsHeader = await page.locator("text=دفتر المستحقات والديون").isVisible();
  console.log("هل قسم المستحقات والديون مفتوح كقسم مستقل؟", debtsHeader);
  if (!debtsHeader) throw new Error("قسم الديون لم يفتح!");

  const receivablesCard = await page.locator("text=إجمالي لك عند أحد").isVisible();
  const payablesCard = await page.locator("text=إجمالي عليك للغير").isVisible();
  console.log("هل كروت 'لك عند أحد' و 'عليك للغير' موجودة ومفصولة؟", receivablesCard && payablesCard);
  if (!receivablesCard || !payablesCard) throw new Error("كروت الديون مفقودة!");

  // Test back button from Debts tab -> should return to Overview tab!
  console.log("الضغط على زر الرجوع من داخل قسم الديون...");
  await page.goBack();
  await page.waitForTimeout(800);

  const returnedToOverviewAgain = await page.locator("text=صافي ما تملك").isVisible();
  console.log("هل رجعنا إلى قسم الخزينة الرئيسي؟", returnedToOverviewAgain);
  if (!returnedToOverviewAgain) throw new Error("فشل الرجوع إلى الرئيسية من قسم الديون!");
  console.log("✓ تم اختبار الأقسام وزر الرجوع بنجاح باهر!");

  await browser.close();
  console.log("\n=== جميع الاختبارات نجحت بنسبة 100%! ===");
}

testCurrencyAndSections().catch((err) => {
  console.error("فشل الاختبار:", err);
  process.exit(1);
});
