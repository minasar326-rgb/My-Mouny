import { chromium } from "playwright";

async function testClearKeepBalances() {
  console.log("=== بدء اختبار مسح الدفتر والحركات مع الحفاظ على الفلوس والتعاملات ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    locale: "ar-EG"
  });
  const page = await context.newPage();

  try {
    await page.goto("http://localhost:8888/", { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const skipBtn = page.locator("button:has-text('الرجوع إلى الرئيسية'), button:has-text('المتابعة إلى الرئيسية')");
    if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
      await skipBtn.first().click();
      await page.waitForTimeout(500);
    }

    // Set Currency to EGP
    const egpBtn = page.locator("button:has-text('EGP')");
    await egpBtn.click();
    await page.waitForTimeout(300);

    // 1. Add Income 5000 EGP
    console.log("1. إضافة دخل 5000 ج.م...");
    await page.click('button:has-text("أضفت مالاً")');
    await page.waitForTimeout(400);
    await page.locator('form input[placeholder="0.00"]').last().fill("5000");
    await page.locator('form input[placeholder*="راتب"]').fill("دخل رئيسي");
    await page.click('button:has-text("إضافة المبلغ للرصيد")');
    await page.waitForTimeout(800);

    // 2. Add Purchase 1000 EGP
    console.log("2. تسجيل مشتريات 1000 ج.م...");
    await page.click('button:has-text("سجّل شراء")');
    await page.waitForTimeout(400);
    await page.locator('form input[placeholder="0.00"]').last().fill("1000");
    await page.locator('form input[placeholder*="خضار"]').fill("أجهزة ومستلزمات");
    await page.click('button:has-text("خصم المبلغ وتسجيل الشراء")');
    await page.waitForTimeout(800);

    // 3. Add Debt 500 EGP
    console.log("3. تسجيل مستحق 500 ج.م (لي عند شخص)...");
    await page.click('button:has-text("لي وعليّ (الديون)")');
    await page.waitForTimeout(600);
    await page.click('button:has-text("تسجيل مبلغ لك عند أحد")');
    await page.waitForTimeout(400);
    await page.locator('form input[placeholder*="شركة النور"]').fill("محمود حسن");
    await page.locator('form input[placeholder="0.00"]').last().fill("500");
    await page.click('button:has-text("تسجيل المبلغ أنه لك")');
    await page.waitForTimeout(800);

    // Check balances before clear
    await page.click('button:has-text("الخزينة والأرصدة")');
    await page.waitForTimeout(600);
    const bodyBefore = await page.textContent("body");
    console.log("- الأرصدة قبل المسح:");
    console.log("  * هل كاش 4000 أو الصافي 4500 ظاهر؟:", bodyBefore.includes("4,000") || bodyBefore.includes("4,500"));

    // 4. Switch to Tab 2 (الدفتر والحركات) and Clear
    console.log("4. فتح تبويب (الدفتر والحركات) والضغط على زر المسح الآمن...");
    await page.click('button:has-text("الدفتر والحركات")');
    await page.waitForTimeout(600);

    const clearBtn = page.locator('button:has-text("مسح وتفريغ سجل الحركات")');
    await clearBtn.click();
    await page.waitForTimeout(600);

    // Verify dialog content
    const modalText = await page.textContent("body");
    const showsPreserved = modalText.includes("الخيار الآمن") && modalText.includes("الكاش المحفوظ");
    console.log("- هل نافذة التأكيد توضح الأرصدة المحفوظة؟:", showsPreserved);

    // Click confirm safe clear
    console.log("5. تأكيد المسح مع الاحتفاظ بالأرصدة...");
    await page.click('button:has-text("تأكيد مسح الحركات والاحتفاظ بكافة الفلوس")');
    await page.waitForTimeout(1000);

    // 6. Verify balances after clear
    await page.click('button:has-text("الخزينة والأرصدة")');
    await page.waitForTimeout(600);
    const bodyAfter = await page.textContent("body");

    const cashKept = bodyAfter.includes("4,000");
    const netKept = bodyAfter.includes("4,500");
    console.log("- فحص الأرصدة بعد مسح الدفتر:");
    console.log("  * هل رصيد الكاش لا يزال 4,000 ج.م؟:", cashKept ? "نعم (محفوظ 100%)" : "فشل");
    console.log("  * هل صافي الثروة لا يزال 4,500 ج.م؟:", netKept ? "نعم (محفوظ 100%)" : "فشل");

    // 7. Verify Debts Tab
    await page.click('button:has-text("لي وعليّ (الديون)")');
    await page.waitForTimeout(600);
    const debtsBody = await page.textContent("body");
    const debtKept = debtsBody.includes("محمود حسن") && debtsBody.includes("500");
    console.log("  * هل مستحقات محمود حسن (500 ج.م) لا تزال قائمة؟:", debtKept ? "نعم (محفوظة 100%)" : "فشل");

    if (!cashKept || !netKept || !debtKept) {
      throw new Error("الأرصدة لم تُحفظ بشكل صحيح بعد المسح!");
    }

    console.log("\n=== نجح الاختبار بنسبة 100% (تم مسح الحركات مع بقاء الفلوس والديون بالكامل) ===");
  } finally {
    await browser.close();
  }
}

testClearKeepBalances().catch(err => {
  console.error("خطأ:", err);
  process.exit(1);
});
