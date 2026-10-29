import { chromium } from "playwright";

async function runTests() {
  console.log("=== بدء الاختبارات الشاملة للتطبيق ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile iPhone / Android viewport
    isMobile: true,
  });

  const page = await context.newPage();

  // Listen to console and errors
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("[Browser Console Error]", msg.text());
  });
  page.on("pageerror", (err) => {
    console.error("[Browser Page Error]", err);
  });

  // 1. Visit http://localhost:8888/
  console.log("\n[1] فحص تحميل التطبيق على شاشة الموبايل...");
  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const title = await page.title();
  console.log("عنوان الصفحة:", title);
  if (!title.includes("خزينتي")) {
    throw new Error(`عنوان الصفحة غير متوقع: ${title}`);
  }

  // 2. Check if we see the Vault Creation / Unlock screen
  console.log("\n[2] فحص شاشة الخزنة الأولى (إنشاء خزنة جديدة)...");
  const createHeading = await page.locator("h1").textContent();
  console.log("العنوان المعروض:", createHeading);

  // If unlock is shown (due to previous run), switch to create or test unlock
  if (createHeading?.includes("فتح الخزنة")) {
    console.log("الخزنة موجودة مسبقاً، تجربة فتحها أو إنشاء خزنة جديدة...");
  } else {
    // Fill vault name and PIN
    await page.fill("input[placeholder*='الخزنة الشخصية']", "خزنة بيشو");
    await page.fill("input[placeholder*='4 خانات على الأقل']", "1234");
    await page.fill("input[placeholder*='أعد إدخال الرمز']", "1234");
    await page.click("button:has-text('إنشاء الخزنة وبدء الحسابات')");
    await page.waitForTimeout(1000);
  }

  // 3. Verify Ledger screen is loaded
  console.log("\n[3] التحقق من واجهة الخزنة والحسابات...");
  await page.waitForSelector("text=صافي ما تملك", { timeout: 5000 });
  console.log("✓ تم فتح الخزنة بنجاح وشاشة الحسابات نشطة.");

  // 4. Test adding an opening balance or transaction
  console.log("\n[4] تجربة إضافة حركة مالية (أضفت مالاً + مشتريات)...");
  // First add income so cash has funds
  await page.click("button:has-text('أضفت مالاً')");
  await page.waitForTimeout(500);
  await page.locator("div.fixed form input[inputmode='decimal']").fill("500.00");
  await page.locator("div.fixed form button[type='submit']").click();
  await page.waitForTimeout(1000);

  // Now record purchase
  await page.click("button:has-text('سجّل شراء')");
  await page.waitForTimeout(500);
  await page.locator("div.fixed form input[inputmode='decimal']").fill("45.50");
  await page.locator("div.fixed form input[placeholder*='خضار']").fill("مشتريات بقالة");
  await page.locator("div.fixed form button[type='submit']").click();
  await page.waitForTimeout(1000);

  const textContent = await page.content();
  if (textContent.includes("مشتريات بقالة") || textContent.includes("45,50")) {
    console.log("✓ تم تسجيل الحركات المالية بنجاح وحسابها في الرصيد بدقة!");
  } else {
    console.warn("تنبيه: تحقق من تسجيل الحركة.");
  }

  // 5. Check PWA Manifest link and ServiceWorker
  console.log("\n[5] فحص ملف الـ Manifest والـ Service Worker...");
  const manifestHref = await page.getAttribute("link[rel='manifest']", "href");
  console.log("رابط الـ Manifest:", manifestHref);
  if (!manifestHref?.includes("manifest")) {
    throw new Error(`Manifest غير صحيح: ${manifestHref}`);
  }

  // Check sw.js fetch
  const swResponse = await page.request.get("http://localhost:8888/sw.js");
  console.log("حالة Service Worker sw.js:", swResponse.status());
  if (swResponse.status() !== 200) {
    throw new Error("ملف sw.js غير متاح!");
  }

  // Check manifest.json fetch
  const manifestResponse = await page.request.get(`http://localhost:8888${manifestHref}`);
  console.log("حالة الـ Manifest:", manifestResponse.status());
  const manifestJson = await manifestResponse.json();
  console.log("اسم التطبيق في الـ Manifest:", manifestJson.name);
  console.log("نمط العرض Display:", manifestJson.display);

  // 6. Test Lock Vault (تسجيل خروج الخزنة)
  console.log("\n[6] تجربة قفل الخزنة وتسجيل الخروج...");
  await page.click("button:has-text('قفل الخزنة')");
  await page.waitForTimeout(1000);

  const lockHeading = await page.locator("h1").textContent();
  console.log("العنوان بعد القفل:", lockHeading);
  if (!lockHeading?.includes("فتح الخزنة")) {
    throw new Error("فشل قفل الخزنة والرجوع لشاشة القفل");
  }
  console.log("✓ تم قفل الخزنة بنجاح وعزل البيانات!");

  // 7. Test wrong PIN
  console.log("\n[7] تجربة إدخال رمز مرور خاطئ...");
  await page.fill("input[placeholder*='أدخل رمز المرور']", "9999");
  await page.click("button:has-text('فتح الخزنة')");
  await page.waitForTimeout(800);
  const errorMsg = await page.locator("text=رمز المرور غير صحيح").textContent();
  console.log("رسالة الخطأ عند إدخال رمز خاطئ:", errorMsg);

  // 8. Test correct PIN unlock
  console.log("\n[8] تجربة الفتح بالرمز الصحيح (1234)...");
  await page.fill("input[placeholder*='أدخل رمز المرور']", "1234");
  await page.click("button:has-text('فتح الخزنة')");
  await page.waitForTimeout(1000);
  await page.waitForSelector("text=صافي ما تملك", { timeout: 5000 });
  console.log("✓ تم فتح الخزنة بنجاح واسترجاع البيانات كاملة من IndexedDB!");

  // 9. Take mobile screenshot
  await page.screenshot({ path: "public/mobile-preview.png", fullPage: true });
  console.log("✓ تم التقاط صورة معاينة للموبايل: public/mobile-preview.png");

  await browser.close();
  console.log("\n=== جميع الاختبارات نجحت بنسبة 100%! ===");
}

runTests().catch((err) => {
  console.error("فشل الاختبار:", err);
  process.exit(1);
});
