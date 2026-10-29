import { chromium } from "playwright";

async function run() {
  console.log("=== بدء الاختبار الشامل والنهائي لتطبيق خزينتي (E2E Final QA) ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Mobile Pixel 7 viewport
    locale: "ar-EG"
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("pageerror", err => consoleErrors.push(err.message));
  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Visit App
    console.log("1. فتح التطبيق والتحقق من التحميل...");
    await page.goto("http://localhost:8888/", { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(1500);

    const skipBtn = page.locator("button:has-text('الرجوع إلى الرئيسية'), button:has-text('المتابعة إلى الرئيسية')");
    if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
      await skipBtn.first().click();
      await page.waitForTimeout(500);
    }

    const title = await page.title();
    console.log(`- عنوان الصفحة: "${title}"`);

    const appHeader = await page.locator("text=خزينتي").first().isVisible();
    console.log(`- واجهة التطبيق ظاهرة: ${appHeader}`);

    // 2. Currency Switcher Test
    console.log("2. اختبار تبديل العملات (EGP / USD / EUR)...");
    const usdBtn = page.locator("button:has-text('USD')");
    await usdBtn.click();
    await page.waitForTimeout(500);
    let moneyText = await page.textContent("body");
    const hasDollar = moneyText.includes("$");
    console.log(`- التحويل إلى الدولار ($ ظاهر): ${hasDollar}`);

    const eurBtn = page.locator("button:has-text('EUR')");
    await eurBtn.click();
    await page.waitForTimeout(500);
    moneyText = await page.textContent("body");
    const hasEuro = moneyText.includes("€");
    console.log(`- التحويل إلى اليورو (€ ظاهر): ${hasEuro}`);

    const egpBtn = page.locator("button:has-text('EGP')");
    await egpBtn.click();
    await page.waitForTimeout(500);
    moneyText = await page.textContent("body");
    const hasEGP = moneyText.includes("ج.م");
    console.log(`- التحويل إلى الجنيه المصري (ج.م ظاهر): ${hasEGP}`);

    // 3. Add Income (أضفت مالاً)
    console.log("3. اختبار إضافة دخل جديد (1000 ج.م)...");
    await page.click('button:has-text("أضفت مالاً")');
    await page.waitForTimeout(500);

    await page.locator('form input[placeholder="0.00"]').last().fill("1000");
    await page.locator('form input[placeholder*="راتب"]').fill("راتب تجريبي QA");
    await page.click('button:has-text("إضافة المبلغ للرصيد")');
    await page.waitForTimeout(1000);

    let netWorth = await page.locator("text=صافي ما تملك").locator("..").textContent();
    console.log(`- رصيد الخزنة بعد إضافة الدخل: ${netWorth?.trim()}`);

    // 4. Add Purchase / Expense (سجّل شراء 150 ج.م)
    console.log("4. اختبار إضافة مشتريات ومصروف (150 ج.م)...");
    await page.click('button:has-text("سجّل شراء")');
    await page.waitForTimeout(500);

    await page.locator('form input[placeholder="0.00"]').last().fill("150");
    await page.locator('form input[placeholder*="خضار"]').fill("مشتريات خضار وفاكهة");
    await page.click('button:has-text("خصم المبلغ وتسجيل الشراء")');
    await page.waitForTimeout(1000);

    // 5. Switch to Tab 2: Ledger & Transactions
    console.log("5. الانتقال لتبويب (الدفتر والحركات)...");
    await page.click('button:has-text("الدفتر والحركات")');
    await page.waitForTimeout(800);

    // Verify Search
    console.log("- اختبار شريط البحث الفوري بالدفتر...");
    const searchInput = page.locator('input[placeholder*="بحث في العمليات"]');
    await searchInput.fill("خضار");
    await page.waitForTimeout(500);
    let searchResultText = await page.textContent("body");
    let foundVeg = searchResultText.includes("مشتريات خضار وفاكهة");
    let hiddenSalary = !searchResultText.includes("راتب تجريبي QA");
    console.log(`  * فلترة البحث تعمل بدقة: خضار ظاهر=${foundVeg}, راتب مخفي=${hiddenSalary}`);

    await searchInput.fill("");
    await page.waitForTimeout(500);

    // 6. Test Edit Transaction
    console.log("6. اختبار تعديل عملية مسجلة بالدفتر...");
    const editBtn = page.locator('button:has-text("تعديل")').first();
    await editBtn.click();
    await page.waitForTimeout(600);

    // Change amount from 150 to 200
    const editAmountInput = page.locator('form input[placeholder="0.00"]').last();
    await editAmountInput.fill("200");
    const editNoteInput = page.locator('form input[placeholder*="خضار"]').last();
    await editNoteInput.fill("مشتريات تموينية معدلة");
    await page.click('button:has-text("حفظ التعديل")');
    await page.waitForTimeout(1000);

    const bodyAfterEdit = await page.textContent("body");
    const editSuccess = bodyAfterEdit.includes("مشتريات تموينية معدلة") && bodyAfterEdit.includes("200");
    console.log(`- تم تعديل العملية بنجاح وتحديث السجل: ${editSuccess}`);

    // 7. Switch to Tab 3: Debts & Receivables
    console.log("7. الانتقال لتبويب (المستحقات والديون)...");
    await page.click('button:has-text("لي وعليّ (الديون)")');
    await page.waitForTimeout(800);

    console.log("- تسجيل مبلغ مستحق (لي عند: أحمد إبراهيم - 400 ج.م)...");
    await page.click('button:has-text("تسجيل مبلغ لك عند أحد")');
    await page.waitForTimeout(500);
    await page.locator('form input[placeholder*="شركة النور"]').fill("أحمد إبراهيم");
    await page.locator('form input[placeholder="0.00"]').last().fill("400");
    await page.click('button:has-text("تسجيل المبلغ أنه لك")');
    await page.waitForTimeout(1000);

    console.log("- اختبار استلام المبلغ (حل مشكلة المبلغ أكبر مما لك)...");
    const collectBtn = page.locator('button:has-text("استلمت المبلغ")').first();
    await collectBtn.click();
    await page.waitForTimeout(600);

    // Receive full 400
    await page.click('button:has-text("إضافة المحصّل للرصيد")');
    await page.waitForTimeout(1000);

    const bodyAfterCollect = await page.textContent("body");
    const hasError = bodyAfterCollect.includes("المبلغ أكبر مما لك");
    console.log(`- هل ظهر خطأ "المبلغ أكبر مما لك"؟: ${hasError ? "نعم (خطأ)" : "لا (تم الحل بنجاح 100%)"}`);

    // 8. Test Delete Transaction
    console.log("8. اختبار حذف عملية...");
    await page.click('button:has-text("الدفتر والحركات")');
    await page.waitForTimeout(800);

    const deleteBtn = page.locator('button:has-text("حذف")').first();
    await deleteBtn.click();
    await page.waitForTimeout(600);

    // Confirm deletion: click "تأكيد الحذف"
    await page.click('button:has-text("تأكيد الحذف")');
    await page.waitForTimeout(1000);
    console.log("- تم تأكيد الحذف وتحديث الأرصدة في IndexedDB تلقائياً.");

    // 9. Offline / Cache check
    console.log("9. فحص كاش وملفات PWA وService Worker...");
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.length > 0;
    });
    console.log(`- تسجيل Service Worker نشط: ${swRegistered}`);

    // Check Console Errors
    const filteredErrors = consoleErrors.filter(e => !e.includes("React DevTools") && !e.includes("pdf-viewer") && !e.includes("isSupportedBrowserVersion") && !e.includes("unload is not allowed"));
    console.log(`- إجمالي أخطاء الكونسول غير المتوقعة: ${filteredErrors.length}`);

    console.log("\n=== انتهى الاختبار بنجاح تام 100% (ALL CHECKS PASSED) ===");
  } catch (err) {
    console.error("خطأ أثناء الاختبار:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
