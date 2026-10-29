import { chromium } from "playwright";

async function diagnose() {
  console.log("=== تشخيص مشكلة الصفحة البيضاء وفحص أخطاء المتصفح والكونسول ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    locale: "ar-EG"
  });
  const page = await context.newPage();

  const errors = [];
  const logs = [];

  page.on("pageerror", err => {
    errors.push({ type: "pageerror", message: err.message, stack: err.stack });
    console.error("PAGE ERROR:", err.message);
  });

  page.on("console", msg => {
    logs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === "error") {
      console.error("CONSOLE ERROR:", msg.text());
    }
  });

  page.on("requestfailed", req => {
    console.error("REQUEST FAILED:", req.url(), req.failure()?.errorText);
  });

  try {
    console.log("1. التوجه إلى http://localhost:8888/ ...");
    const response = await page.goto("http://localhost:8888/", { waitUntil: "networkidle", timeout: 15000 });
    console.log(`- كود الاستجابة HTTP: ${response.status()}`);

    await page.waitForTimeout(2000);

    const bodyHtml = await page.innerHTML("body");
    const bodyText = await page.textContent("body");

    console.log(`- طول نصوص الـ body: ${bodyText ? bodyText.trim().length : 0} حرف`);
    console.log(`- هل يظهر اسم 'خزينتي' في الصفحة؟: ${bodyText.includes("خزينتي")}`);

    await page.screenshot({ path: "public/screenshots/diagnose-result.png", fullPage: true });
    console.log("- تم حفظ لقطة الشاشة في public/screenshots/diagnose-result.png");

    if (bodyText.trim().length < 20) {
      console.error("تحذير: الصفحة بيضاء أو شبه فارغة!");
    } else {
      console.log("الصفحة محملة وبها عناصر ونصوص حقيقية!");
    }

    console.log(`- إجمالي أخطاء الـ pageerror: ${errors.length}`);
    console.log(`- إجمالي سجلات الكونسول: ${logs.length}`);
  } catch (err) {
    console.error("حدث خطأ أثناء فحص الصفحة:", err);
  } finally {
    await browser.close();
  }
}

diagnose();
