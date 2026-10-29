import { chromium } from "playwright";

async function testCollectDebtFix() {
  console.log("=== بدء اختبار حل مشكلة استلام المستحقات والديون ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERR:', err.message));

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

  // Go to debts tab
  console.log("الانتقال إلى قسم لي وعليّ (الديون)...");
  await page.click("button:has-text('لي وعليّ')");
  await page.waitForTimeout(500);

  // 1. Add receivable: "أحمد" (with hamza) owes 100
  console.log("إضافة دين جديد: 'أحمد' عليه 100...");
  await page.click("button:has-text('تسجيل مبلغ لك عند أحد')");
  await page.waitForTimeout(500);

  await page.fill("input[placeholder*='أحمد']", "أحمد");
  await page.fill("input[placeholder='0.00']", "100");
  await page.click("button:has-text('تسجيل المبلغ أنه لك')");
  await page.waitForTimeout(1000);

  const errorMsg1 = await page.locator(".text-debt").allInnerTexts();
  console.log("أي أخطاء ظاهرة 1؟", errorMsg1);
  console.log("الأزرار الظاهرة في الصفحة:", (await page.locator("button").allInnerTexts()).filter(b => b.trim().length > 0));

  let ahmedCard = await page.locator("text=أحمد").first().isVisible();
  console.log("ظهور أحمد في قائمة المستحقات:", ahmedCard);
  if (!ahmedCard) throw new Error("فشل تسجيل المستحق!");

  // 2. Now click "استلمت المبلغ" and collect 100
  console.log("\nمحاولة استلام المبلغ من أحمد...");
  await page.click("button:has-text('استلمت المبلغ')");
  await page.waitForTimeout(500);

  // Click submit to collect
  await page.click("button:has-text('إضافة المحصّل للرصيد')");
  await page.waitForTimeout(1000);

  // Check if error "المبلغ أكبر مما لك" appeared
  const hasError = await page.locator("text=المبلغ أكبر مما لك").isVisible();
  console.log("هل ظهر خطأ 'المبلغ أكبر مما لك'؟", hasError ? "نعم (خطأ!)" : "لا (ناجح تماماً!)");
  if (hasError) throw new Error("ظهر خطأ رفض الاستلام!");

  // Verify modal closed and receivable settled
  const emptyDebts = await page.locator("text=لا أحد يدين لك الآن").isVisible();
  console.log("تمت التسوية بنجاح ولا أحد يدين لك الآن:", emptyDebts);
  if (!emptyDebts) throw new Error("لم تتم تسوية الدين بنجاح!");
  console.log("✓ تم استلام المبلغ بنجاح ودون أي رفض أو خطأ!");

  // 3. Test collecting with Arabic spelling differences & overpay
  console.log("\n[Test 2] اختبار تسجيل دين بـ 'إبراهيم' واستلامه بمبلغ أكبر...");
  await page.click("button:has-text('تسجيل مبلغ لك عند أحد')");
  await page.waitForTimeout(500);

  await page.fill("input[placeholder*='أحمد']", "إبراهيم");
  await page.fill("input[placeholder='0.00']", "200");
  await page.click("button:has-text('تسجيل المبلغ أنه لك')");
  await page.waitForTimeout(1000);

  const errorMsg2 = await page.locator(".text-debt").allInnerTexts();
  console.log("أي أخطاء ظاهرة 2؟", errorMsg2);
  console.log("الأزرار الظاهرة في الصفحة:", (await page.locator("button").allInnerTexts()).filter(b => b.trim().length > 0));

  // Click collect
  await page.click("button:has-text('استلمت المبلغ')");
  await page.waitForTimeout(500);

  // Try collecting 250 (more than 200)
  await page.fill("input[placeholder='0.00']", "250");
  await page.click("button:has-text('إضافة المحصّل للرصيد')");
  await page.waitForTimeout(1000);

  const hasOverpayError = await page.locator("text=المبلغ أكبر مما لك").isVisible();
  console.log("هل ظهر خطأ عند استلام مبلغ أكبر؟", hasOverpayError ? "نعم (خطأ!)" : "لا (تم القبول بنجاح!)");
  if (hasOverpayError) throw new Error("فشل استلام المبلغ الزائد!");

  console.log("✓ تم حل مشكلة الاستلام بالكامل 100%!");

  await browser.close();
}

testCollectDebtFix().catch((err) => {
  console.error("فشل الاختبار:", err);
  process.exit(1);
});
