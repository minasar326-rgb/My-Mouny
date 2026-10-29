import { chromium } from "playwright";

async function auditModals() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto("http://localhost:8888/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Switch to English first
  const enBtn = page.getByRole("button", { name: /EN/i });
  await enBtn.click();
  await page.waitForTimeout(500);

  async function checkModal(name, triggerSelector, closeSelector) {
    console.log(`Checking ${name}...`);
    const trigger = page.locator(triggerSelector).first();
    if (await trigger.isVisible()) {
      await trigger.click();
      await page.waitForTimeout(400);

      const bodyText = await page.innerText("body");
      // Find any Arabic characters
      const arWords = (bodyText.match(/[\u0600-\u06FF]+/g) || []).filter(w => w !== "العربية");
      if (arWords.length > 0) {
        console.error(`❌ Found Arabic in ${name}:`, arWords);
      } else {
        console.log(`✅ 100% clean English in ${name}`);
      }

      if (closeSelector) {
        const closer = page.locator(closeSelector).first();
        if (await closer.isVisible()) {
          await closer.click();
          await page.waitForTimeout(300);
        }
      }
    } else {
      console.log(`⚠️ Trigger not visible for ${name}: ${triggerSelector}`);
    }
  }

  // 1. Purchase modal
  await checkModal("Purchase Modal", 'button:has-text("Record Purchase")', 'button[aria-label="Close"], button:has-text("Cancel")');

  // 2. Income modal
  await checkModal("Income Modal", 'button:has-text("Add Income")', 'button[aria-label="Close"], button:has-text("Cancel")');

  // 3. Transfer modal
  await checkModal("Transfer Modal", 'button:has-text("Transfer")', 'button[aria-label="Close"], button:has-text("Cancel")');

  // 4. Install Guide modal (open via install button)
  const installBtn = page.locator('button:has-text("Install App")').first();
  if (await installBtn.isVisible()) {
    await installBtn.click();
    await page.waitForTimeout(400);

    // Switch device tabs inside install modal
    for (const tabName of ["Android", "iOS / Apple", "PC / Mac / Chrome"]) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(200);
        const modalText = await page.innerText("body");
        const ar = (modalText.match(/[\u0600-\u06FF]+/g) || []).filter(w => w !== "العربية");
        console.log(`Install Guide [${tabName}] Arabic words:`, ar);
      }
    }
    const closeBtn = page.locator('button:has-text("Got it, Thanks")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 5. PIN Settings modal
  await checkModal("PIN Settings", 'button[title*="PIN"], button:has-text("Set PIN")', 'button[aria-label="Close"], button:has-text("Cancel")');

  // 6. Safe Clear modal
  const ledgerTab = page.locator('button:has-text("Ledger & History")').first();
  await ledgerTab.click();
  await page.waitForTimeout(400);

  await checkModal("Safe Clear Modal", 'button:has-text("Clear & Reset History")', 'button:has-text("Cancel & Go Back"), button:has-text("Close")');

  // 7. Debts tab
  const debtsTab = page.locator('button:has-text("Receivables & Debts")').first();
  await debtsTab.click();
  await page.waitForTimeout(400);

  await checkModal("Add Receivable Modal", 'button:has-text("Record Money Owed to You")', 'button[aria-label="Close"], button:has-text("Cancel")');
  await checkModal("Add Payable Modal", 'button:has-text("Record Debt You Owe")', 'button[aria-label="Close"], button:has-text("Cancel")');

  await browser.close();
  console.log("All modal audits finished.");
}

auditModals().catch(console.error);
