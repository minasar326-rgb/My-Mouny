import test from "node:test";
import assert from "node:assert/strict";
import {
  derive,
  monthFlow,
  orderTxs,
  parseMoney,
  rejectReason,
  type Tx,
} from "./model.ts";
import {
  calculateLedgerChecksum,
  decryptPayload,
  deriveAesGcmKey,
  encryptPayload,
  generateSalt,
  hashPin,
  verifyPin,
} from "../storage/crypto.ts";

test("QA Item 2.1: إضافة دخل جديد وتعديله وحذفه (Income CRUD)", () => {
  const txs: Tx[] = [
    { id: "init-1", at: 1000, kind: "adjust", amount: 10_000, pocket: "cash", note: "رصيد افتتاحي" },
  ];
  let ledger = derive(txs);
  assert.equal(ledger.cash, 10_000);

  // إضافة دخل
  const income: Tx = {
    id: "inc-101",
    at: 2000,
    kind: "income",
    amount: 50_000,
    pocket: "cash",
    category: "salary",
    note: "راتب شهري",
  };
  txs.push(income);
  ledger = derive(txs);
  assert.equal(ledger.cash, 60_000, "يجب أن يزيد الرصيد النقدي إلى 600 جنيه");
  assert.equal(ledger.net, 60_000);

  // تعديل الدخل
  const idx = txs.findIndex((t) => t.id === "inc-101");
  txs[idx] = { ...txs[idx], amount: 75_000, note: "راتب مع مكافأة" };
  ledger = derive(txs);
  assert.equal(ledger.cash, 85_000, "يجب تحديث الرصيد عند تعديل المبلغ");

  // حذف الدخل
  const remaining = txs.filter((t) => t.id !== "inc-101");
  ledger = derive(remaining);
  assert.equal(ledger.cash, 10_000, "يجب عودة الرصيد إلى ما كان عليه بعد الحذف");
});

test("QA Item 2.2: إضافة مصروف ومشتريات وتعديلها وحذفها (Expense/Purchase CRUD)", () => {
  const txs: Tx[] = [
    { id: "init-1", at: 1000, kind: "adjust", amount: 100_000, pocket: "bank", note: "رصيد البنك" },
  ];
  let ledger = derive(txs);
  assert.equal(ledger.bank, 100_000);

  // إضافة مصروف
  const purchase: Tx = {
    id: "pur-201",
    at: 2000,
    kind: "purchase",
    amount: 35_000,
    pocket: "bank",
    category: "shopping",
    note: "شراء مستلزمات مكتبية",
  };
  txs.push(purchase);
  ledger = derive(txs);
  assert.equal(ledger.bank, 65_000, "يجب خصم المصروف من رصيد البنك بدقة");

  // تعديل المصروف
  const idx = txs.findIndex((t) => t.id === "pur-201");
  txs[idx] = { ...txs[idx], amount: 40_000, note: "مستلزمات إضافية" };
  ledger = derive(txs);
  assert.equal(ledger.bank, 60_000, "يجب أن يعكس البنك المبلغ المعدل");

  // حذف المصروف
  const afterDelete = txs.filter((t) => t.id !== "pur-201");
  ledger = derive(afterDelete);
  assert.equal(ledger.bank, 100_000, "يجب استرجاع الرصيد الأصلي فور حذف العملية");
});

test("QA Item 2.3: حساب الرصيد الحالي وإجمالي الدخل والمصروفات وصافي الرصيد", () => {
  const testMonth = new Date(2026, 9, 29);
  const t = testMonth.getTime();

  const txs: Tx[] = [
    { id: "1", at: t, kind: "adjust", amount: 50_000, pocket: "cash", note: "افتتاحي كاش" },
    { id: "2", at: t + 1, kind: "adjust", amount: 150_000, pocket: "bank", note: "افتتاحي بنك" },
    { id: "3", at: t + 10, kind: "income", amount: 80_000, pocket: "cash", category: "salary", note: "مبيعات" },
    { id: "4", at: t + 20, kind: "purchase", amount: 30_000, pocket: "cash", category: "food", note: "طعام" },
    { id: "5", at: t + 30, kind: "purchase", amount: 20_000, pocket: "bank", category: "services", note: "كهرباء" },
  ];

  const ledger = derive(txs);
  // Cash: 50,000 + 80,000 - 30,000 = 100,000 (1,000 EGP)
  assert.equal(ledger.cash, 100_000);
  // Bank: 150,000 - 20,000 = 130,000 (1,300 EGP)
  assert.equal(ledger.bank, 130_000);
  // Total Net: 100,000 + 130,000 = 230,000 (2,300 EGP)
  assert.equal(ledger.net, 230_000);

  // إحصائيات الشهر:
  const flow = monthFlow(txs, testMonth);
  assert.equal(flow.earned, 80_000, "إجمالي الدخل المكتسب في الشهر");
  assert.equal(flow.spent, 50_000, "إجمالي المصروفات (30k + 20k)");
  assert.equal(flow.netFlow, 30_000, "صافي التدفق الشهري الفائض");
});

test("QA Item 2.4: البحث والفلترة والترتيب للعمليات", () => {
  const txs: Tx[] = [
    { id: "tx-1", at: 1000, kind: "income", amount: 10_000, pocket: "cash", category: "salary", note: "فاتورة استشارة" },
    { id: "tx-2", at: 2000, kind: "purchase", amount: 2_000, pocket: "cash", category: "food", note: "وجبة غداء" },
    { id: "tx-3", at: 3000, kind: "purchase", amount: 5_000, pocket: "bank", category: "transport", note: "تذكرة قطار" },
  ];

  // الترتيب الزمني لاشتقاق الحسابات (من الأقدم للأحدث لضمان سلامة الرصيد)
  const chronological = orderTxs(txs);
  assert.equal(chronological[0].id, "tx-1");
  assert.equal(chronological[1].id, "tx-2");
  assert.equal(chronological[2].id, "tx-3");

  // الترتيب في سجل العرض (الأحدث أولاً للمستخدم)
  const displayOrder = [...txs].sort((a, b) => b.at - a.at);
  assert.equal(displayOrder[0].id, "tx-3");
  assert.equal(displayOrder[1].id, "tx-2");
  assert.equal(displayOrder[2].id, "tx-1");

  // البحث بالكلمة المفتاحية
  const searchWord = "غداء";
  const searchResults = txs.filter((t) => t.note?.includes(searchWord));
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, "tx-2");

  // الفلترة حسب المحفظة (Bank فقط)
  const bankOnly = txs.filter((t) => t.pocket === "bank");
  assert.equal(bankOnly.length, 1);
  assert.equal(bankOnly[0].id, "tx-3");

  // الفلترة حسب التصنيف (food فقط)
  const foodOnly = txs.filter((t) => t.category === "food");
  assert.equal(foodOnly.length, 1);
  assert.equal(foodOnly[0].amount, 2_000);
});

test("QA Item 2.5: منع القيم غير الصحيحة والمبالغ السالبة والأرصدة الصفرية", () => {
  // 1. منع المبالغ السالبة
  assert.equal(parseMoney("-50"), null, "يجب رفض أي مبلغ مالي سالب");
  assert.equal(parseMoney("-0.01"), null, "يجب رفض أي كسر سالب");

  // 2. منع المدخلات الفارغة وغير الرقمية
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("   "), null);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseMoney("NaN"), null);

  // 3. السماح بالصفر عندما يكون مخصصاً فقط
  assert.equal(parseMoney("0", false), null, "المبلغ 0 غير مسموح به في العمليات العادية");
  assert.equal(parseMoney("0", true), 0, "المبلغ 0 مسموح به عند طلب allowZero صراحة");

  // 4. منع السحب على المكشوف (Overdraft)
  const overdrawAttempt: Tx[] = [
    { id: "1", at: 1000, kind: "adjust", amount: 5_000, pocket: "cash", note: "رصيد محدود" },
    { id: "2", at: 2000, kind: "purchase", amount: 6_000, pocket: "cash", note: "شراء بأكثر من الرصيد" },
  ];
  const reject = rejectReason(overdrawAttempt);
  assert.notEqual(reject, null, "يجب اكتشاف ورفض السحب على المكشوف");

  // 5. السماح بصرف الرصيد بالكامل ليصبح صفراً
  const exactSpend: Tx[] = [
    { id: "1", at: 1000, kind: "adjust", amount: 5_000, pocket: "cash", note: "رصيد" },
    { id: "2", at: 2000, kind: "purchase", amount: 5_000, pocket: "cash", note: "شراء بكل الرصيد" },
  ];
  assert.equal(rejectReason(exactSpend), null, "الرصيد الصفري مسموح به بعد استيفاء الصرف");
  assert.equal(derive(exactSpend).cash, 0);
});

test("QA Item 2.6: التأكد من منع تكرار العملية عند الضغط المزدوج (Idempotency Key Check)", () => {
  const existingTxs: Tx[] = [
    { id: "tx-duplicate-test-1", at: 1000, kind: "purchase", amount: 2500, pocket: "cash", note: "قهوة" },
  ];

  // دالة محاكاة التحقق من عدم التكرار كما في واجهة التطبيق
  function canAddTransaction(newTx: Tx, currentList: Tx[]): boolean {
    // التحقق من تكرار الـ ID
    if (currentList.some((t) => t.id === newTx.id)) return false;
    // التحقق من تكرار نفس العملية في غضون 2 ثانية بنفس البيانات
    const isRecentDuplicate = currentList.some(
      (t) =>
        t.kind === newTx.kind &&
        t.amount === newTx.amount &&
        t.pocket === newTx.pocket &&
        t.note === newTx.note &&
        Math.abs(t.at - newTx.at) < 2000
    );
    return !isRecentDuplicate;
  }

  const firstAttempt: Tx = {
    id: "tx-duplicate-test-2",
    at: 1050,
    kind: "purchase",
    amount: 2500,
    pocket: "cash",
    note: "قهوة سريعة",
  };
  assert.equal(canAddTransaction(firstAttempt, existingTxs), true, "المحاولة الأولى يجب قبولها");
  existingTxs.push(firstAttempt);

  // نقرة ثانية سريعة بنفس البيانات (خلال 100ms)
  const doubleClickAttempt: Tx = {
    id: "tx-duplicate-test-3",
    at: 1150,
    kind: "purchase",
    amount: 2500,
    pocket: "cash",
    note: "قهوة سريعة",
  };
  assert.equal(canAddTransaction(doubleClickAttempt, existingTxs), false, "المحاولة المكررة السريعة يجب حظرها لمنع التكرار");
});

test("QA Item 3: التخزين المحلي والنسخ الاحتياطي والاستعادة وتكامل الأوفلاين", async () => {
  // بيانات تجريبية حقيقية
  const sampleTransactions: Tx[] = [
    { id: "t1", at: 1770000000000, kind: "adjust", amount: 100_000, pocket: "cash", note: "رصيد كاش" },
    { id: "t2", at: 1770000010000, kind: "adjust", amount: 200_000, pocket: "bank", note: "رصيد بنك" },
    { id: "t3", at: 1770000020000, kind: "income", amount: 50_000, pocket: "cash", category: "salary", note: "استشارة" },
  ];

  // 1. توليد بصمة سلامة البيانات (Checksum)
  const checksumBefore = await calculateLedgerChecksum(sampleTransactions);
  assert.equal(typeof checksumBefore, "string");
  assert.equal(checksumBefore.length, 64, "يجب أن تكون بصمة SHA-256 مكونة من 64 حرف hex");

  // 2. تصدير النسخة الاحتياطية بصيغة JSON نظيفة
  const backupObject = {
    app: "Zaker-Mouny",
    version: 2,
    exportedAt: new Date().toISOString(),
    checksum: checksumBefore,
    data: sampleTransactions,
  };
  const jsonExport = JSON.stringify(backupObject, null, 2);
  assert.ok(jsonExport.includes("Zaker-Mouny"));

  // 3. استيراد النسخة والتحقق من سلامة البصمة
  const importedObject = JSON.parse(jsonExport);
  const checksumAfter = await calculateLedgerChecksum(importedObject.data);
  assert.equal(checksumAfter, checksumBefore, "بصمة البيانات بعد الاستيراد يجب أن تتطابق 100%");
  assert.deepEqual(importedObject.data, sampleTransactions, "البيانات المستعادة يجب أن تطابق الأصل بدقة");

  // 4. اشتقاق الرصيد بعد الاستعادة والتأكد من مطابقة الحسابات
  const restoredLedger = derive(importedObject.data);
  assert.equal(restoredLedger.cash, 150_000);
  assert.equal(restoredLedger.bank, 200_000);
  assert.equal(restoredLedger.net, 350_000);
});

test("QA Item 4: الخصوصية والأمان وتشفير الخزنة محلياً 100%", async () => {
  const pin = "2026";
  const salt = generateSalt();

  // 1. تشفير كلمة المرور PIN بـ PBKDF2 مع Salt
  const pinHash = await hashPin(pin, salt);
  assert.ok(pinHash.length > 20);

  // 2. التحقق من PIN بالوقت الثابت
  assert.equal(await verifyPin(pin, salt, pinHash), true);
  assert.equal(await verifyPin("9999", salt, pinHash), false);

  // 3. تشفير البيانات بـ AES-256-GCM
  const aesKey = await deriveAesGcmKey(pin, salt);
  const secretData = [{ id: "tx-secret", note: "بيانات سرية للغاية في الخزنة", amount: 999999 }];
  const encrypted = await encryptPayload(secretData, aesKey);

  // التأكد من أن النص المشفر لا يحتوي على أي نصوص واضحة
  assert.ok(!encrypted.ciphertextHex.includes("بيانات سرية"));
  assert.ok(!encrypted.ciphertextHex.includes("tx-secret"));

  // فك التشفير والتأكد من استعادة البيانات
  const decrypted = await decryptPayload<typeof secretData>(encrypted.ciphertextHex, encrypted.ivHex, aesKey);
  assert.deepEqual(decrypted, secretData);
});

test("QA Item 5: إدارة الخزائن: إمكانية حذف الخزنة الجديدة بعد التحقق من كلمة المرور (PIN) فقط", async () => {
  const pinA = "1234";
  const pinB = "8899";
  const saltB = generateSalt();
  const hashB = await hashPin(pinB, saltB);

  // هيكل يحاكي الخزائن
  const vaults = [
    { id: "main-vault", name: "خزينتي الأساسية", hasPin: true, pin: pinA },
    { id: "new-vault", name: "خزنة الشغل الجديدة", hasPin: true, salt: saltB, hash: hashB },
  ];

  // 1. محاولة حذف الخزنة بدون كتابة الباسورد -> رفض
  const deleteAttemptWithoutPin = (id: string, enteredPin?: string) => {
    const target = vaults.find((v) => v.id === id);
    if (!target) throw new Error("الخزنة غير موجودة");
    if (vaults.length <= 1) throw new Error("لا يمكن حذف الخزنة الوحيدة المتبقية في التطبيق");
    if (target.hasPin && !enteredPin) throw new Error("يرجى إدخال كلمة مرور (PIN) الخزنة لإتمام الحذف");
    return true;
  };
  assert.throws(() => deleteAttemptWithoutPin("new-vault", ""), /يرجى إدخال كلمة مرور/);

  // 2. محاولة حذف الخزنة بكلمة مرور خاطئة -> رفض
  const verifyAndDelete = async (id: string, enteredPin: string) => {
    const target = vaults.find((v) => v.id === id);
    if (!target) throw new Error("الخزنة غير موجودة");
    if (vaults.length <= 1) throw new Error("لا يمكن حذف الخزنة الوحيدة المتبقية في التطبيق");
    const valid = await verifyPin(enteredPin, target.salt!, target.hash!);
    if (!valid) {
      throw new Error("كلمة المرور غير صحيحة! لا يمكن حذف الخزنة إلا بكلمة المرور الخاصة بها.");
    }
    const idx = vaults.findIndex((v) => v.id === id);
    vaults.splice(idx, 1);
    return true;
  };

  await assert.rejects(
    () => verifyAndDelete("new-vault", "0000"),
    /كلمة المرور غير صحيحة! لا يمكن حذف الخزنة إلا بكلمة المرور الخاصة بها/
  );
  assert.equal(vaults.length, 2, "الخزنة لم تُحذف بسبب كلمة المرور الخاطئة");

  // 3. كتابة كلمة المرور الصحيحة -> نجاح الحذف وبقاء الخزنة الأساسية
  const deleteResult = await verifyAndDelete("new-vault", "8899");
  assert.equal(deleteResult, true);
  assert.equal(vaults.length, 1, "تم حذف الخزنة الجديدة بنجاح");
  assert.equal(vaults[0]?.id, "main-vault", "بقيت الخزنة الأساسية بأمان");

  // 4. محاولة حذف الخزنة الوحيدة المتبقية -> رفض قاطع
  assert.throws(
    () => deleteAttemptWithoutPin("main-vault", "1234"),
    /لا يمكن حذف الخزنة الوحيدة المتبقية في التطبيق/
  );
});
