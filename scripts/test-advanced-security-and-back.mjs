import { chromium } from "playwright";

async function testAdvancedSecurityAndBack() {
  console.log("=== بدء اختبار ميزة الرجوع للرئيسية والحماية المتقدمة ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // 1. Visit http://localhost:8888/
  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // If locked, click "المتابعة إلى الرئيسية مباشرة" or "الرجوع إلى الرئيسية"
  const skipBtn = page.locator("button:has-text('الرجوع إلى الرئيسية'), button:has-text('المتابعة إلى الرئيسية')");
  if (await skipBtn.isVisible()) {
    console.log("النقر على الدخول السريع / الرجوع للرئيسية بدون باسورد...");
    await skipBtn.first().click();
    await page.waitForTimeout(1000);
  }

  await page.waitForSelector("text=صافي ما تملك", { timeout: 5000 });
  console.log("✓ تم الدخول إلى الشاشة الرئيسية (الرئيسية) بنجاح!");

  // Test Case A: User clicks "عمل باسورد للخزنة" or "إعدادات الرمز"
  console.log("\n[Test A] تجربة فتح نافذة عمل باسورد ثم الضغط على زر الرجوع...");
  const buttons = await page.locator("button").allInnerTexts();
  console.log("الأزرار الموجودة في الصفحة:", buttons.filter(b => b.trim().length > 0));

  const setPinBtn = page.locator("button:has-text('عمل باسورد للخزنة')").or(page.locator("button:has-text('إعدادات الرمز')"));
  console.log("عدد أزرار الباسورد المطابقة:", await setPinBtn.count());
  await setPinBtn.first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-set-pin.png" });

  console.log("H2s on page:", await page.locator("h2").allInnerTexts());
  const modalHeader = page.locator("h2:has-text('رمز حماية')");
  let setPinModal = await modalHeader.isVisible();
  console.log("نافذة تعيين الباسورد مفتوحة الآن:", setPinModal);
  if (!setPinModal) throw new Error("نافذة تعيين الباسورد لم تفتح!");

  console.log("الضغط على زر الرجوع (Hardware Back Button)...");
  await page.goBack();
  await page.waitForTimeout(800);

  setPinModal = await modalHeader.isVisible();
  console.log("حالة نافذة الباسورد بعد الرجوع:", setPinModal ? "مفتوحة (خطأ)" : "أغلقت ورجعنا للرئيسية (صح)");
  if (setPinModal) throw new Error("الرجوع لم يغلق النافذة!");

  const onMainScreen = await page.locator("text=صافي ما تملك").isVisible();
  console.log("هل نحن الآن في الشاشة الرئيسية؟", onMainScreen);
  if (!onMainScreen) throw new Error("لم نرجع إلى الرئيسية!");
  console.log("✓ نجاح: زر الرجوع أعاد المستخدم إلى الرئيسية دون خروج ودون إجباره على عمل باسورد!");

  // Test Case B: User actually sets a secure PIN
  console.log("\n[Test B] تجربة تعيين رمز حماية وتشفير AES-GCM 256-bit...");
  await setPinBtn.first().click();
  await page.waitForTimeout(500);
  await page.fill("input[placeholder*='رمز الحماية الجديد']", "1234");
  await page.fill("input[placeholder*='أعد إدخال الرمز']", "1234");
  await page.click("button:has-text('حفظ وتفعيل رمز الحماية')");
  await page.waitForTimeout(1500);

  const protectedBadge = await page.locator("text=مشفّرة ومحمية").isVisible();
  console.log("حالة الخزنة:", protectedBadge ? "مشفّرة ومحمية 🔒" : "غير مشفرة");
  if (!protectedBadge) throw new Error("فشل تفعيل تشفير الخزنة!");
  console.log("✓ تم تفعيل التشفير فائق الأمان AES-256 بنجاح!");

  // Test Case C: Lock vault & test brute-force protection
  console.log("\n[Test C] قفل الخزنة وفحص الحماية ضد التخمين (Brute-Force Rate Limiting)...");
  await page.click("button:has-text('قفل الخزنة')");
  await page.waitForTimeout(1000);

  // Try wrong PIN repeatedly
  console.log("محاولة إدخال رمز خاطئ عدة مرات متتالية...");
  for (let i = 1; i <= 5; i++) {
    await page.fill("input[placeholder*='أدخل رمز المرور']", "0000");
    await page.click("button:has-text('فتح الخزنة')");
    await page.waitForTimeout(500);
  }

  const lockoutMsg = await page.locator("text=تم تفعيل وضع الحماية ضد التخمين").isVisible();
  console.log("ظهور رسالة القفل والحماية ضد التخمين:", lockoutMsg);
  if (!lockoutMsg) throw new Error("نظام الحماية ضد التخمين لم يتفعل!");
  console.log("✓ تم تفعيل قفل الحماية وتجميد المحاولات لحماية الخزنة بنجاح!");

  // Test Case D: Back button on Unlock screen returns to main screen without password
  console.log("\n[Test D] فحص زر الرجوع في شاشة القفل (الرجوع إلى الرئيسية)...");
  await page.click("button:has-text('الرجوع إلى الرئيسية')");
  await page.waitForTimeout(1000);
  const backToMain = await page.locator("text=صافي ما تملك").isVisible();
  console.log("هل تم الرجوع إلى الرئيسية؟", backToMain);
  if (!backToMain) throw new Error("فشل الرجوع إلى الرئيسية من شاشة القفل!");
  console.log("✓ تم الرجوع إلى الرئيسية بكل سلاسة!");

  await browser.close();
  console.log("\n=== جميع الاختبارات نجحت بنسبة 100%! ===");
}

testAdvancedSecurityAndBack().catch((err) => {
  console.error("فشل الاختبار:", err);
  process.exit(1);
});
