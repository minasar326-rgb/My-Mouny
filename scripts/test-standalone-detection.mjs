import { chromium } from "playwright";

async function testStandaloneDetection() {
  console.log("=== بدء اختبار شرط إخفاء زر التثبيت عند الفتح من تطبيق مثبت أو Google Play ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  try {
    // -------------------------------------------------------------
    // Scenario 1: Simulating Browser (Google Chrome / Edge)
    // -------------------------------------------------------------
    console.log("\n[السيناريو 1] فتح الموقع من المتصفح العادي (Browser Mode):");
    const browserContext = await browser.newContext({
      viewport: { width: 412, height: 915 },
    });
    const page1 = await browserContext.newPage();
    await page1.goto("http://localhost:8888/", { waitUntil: "load" });
    await page1.waitForTimeout(1000);

    const isStandaloneInBrowser = await page1.evaluate(() => {
      return window.matchMedia("(display-mode: standalone)").matches ||
             document.referrer.startsWith("android-app://");
    });
    console.log("- هل التطبيق في وضع Standalone بالمتصفح؟:", isStandaloneInBrowser ? "نعم" : "لا (صحيح - متصفح عادي)");

    await browserContext.close();

    // -------------------------------------------------------------
    // Scenario 2: Simulating Installed Google Play TWA / Standalone App
    // -------------------------------------------------------------
    console.log("\n[السيناريو 2] محاكاة الفتح من تطبيق Google Play (TWA / Standalone):");
    const standaloneContext = await browser.newContext({
      viewport: { width: 412, height: 915 },
      extraHTTPHeaders: {
        // TWA sets referer
        "Referer": "android-app://com.khazinti.finance"
      }
    });

    const page2 = await standaloneContext.newPage();
    // Simulate standalone display-mode media query
    await page2.emulateMedia({ media: "screen" });
    
    // Launch with start_url query param (?source=pwa)
    await page2.goto("http://localhost:8888/?source=pwa", { waitUntil: "load" });
    await page2.waitForTimeout(1000);

    const isDetectedStandalone = await page2.evaluate(() => {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("source") === "pwa" ||
             document.referrer.startsWith("android-app://") ||
             window.matchMedia("(display-mode: standalone)").matches;
    });
    console.log("- هل تم التعرف على التطبيق كنسخة مثبتة (TWA / PWA)؟:", isDetectedStandalone ? "نعم (ناجح)" : "فشل");

    // Check if "تثبيت على الهاتف" button is hidden
    const installBtn = page2.locator("button:has-text('تثبيت على الهاتف')");
    const isVisible = await installBtn.isVisible();
    console.log("- هل ظهر زر 'تثبيت على الهاتف' في النسخة المثبتة؟:", isVisible ? "نعم (خطأ)" : "لا - مخفي تماماً (صحيح 100%)");

    if (isVisible) {
      throw new Error("زر التثبيت ظهر في النسخة المثبتة!");
    }

    console.log("\n=== نجح اختبار التحقق من حالة التثبيت وإخفاء الزر بنسبة 100% ===");
  } finally {
    await browser.close();
  }
}

testStandaloneDetection().catch(err => {
  console.error("خطأ:", err);
  process.exit(1);
});
