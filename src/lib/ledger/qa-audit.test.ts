import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryBreakdown,
  centsToInput,
  convertArabicDigits,
  derive,
  getCategoryLabel,
  monthFlow,
  orderTxs,
  parseMoney,
  personKey,
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

test("QA Audit 1: Full CRUD on Income & Purchases with balances", () => {
  const t0 = 1770000000000;
  const txs: Tx[] = [];

  // Step 1: Opening balance (Cash 500, Bank 1000)
  txs.push({ id: "op-1", at: t0, kind: "adjust", amount: 50_000, pocket: "cash", note: "Opening cash" });
  txs.push({ id: "op-2", at: t0 + 1, kind: "adjust", amount: 100_000, pocket: "bank", note: "Opening bank" });

  let l = derive(txs);
  assert.equal(l.cash, 50_000, "Cash must be 500 EGP (50,000 cents)");
  assert.equal(l.bank, 100_000, "Bank must be 1,000 EGP (100,000 cents)");
  assert.equal(l.net, 150_000, "Net worth must equal cash + bank");

  // Step 2: Add Income (Cash +200)
  const incomeTx: Tx = {
    id: "inc-1",
    at: t0 + 10,
    kind: "income",
    amount: 20_000,
    pocket: "cash",
    category: "salary",
    note: "Freelance gig",
  };
  txs.push(incomeTx);
  l = derive(txs);
  assert.equal(l.cash, 70_000, "Cash should increase to 70,000 cents");
  assert.equal(l.net, 170_000);

  // Step 3: Add Purchase (Bank -300)
  const purchaseTx: Tx = {
    id: "pur-1",
    at: t0 + 20,
    kind: "purchase",
    amount: 30_000,
    pocket: "bank",
    category: "shopping",
    note: "Office tools",
  };
  txs.push(purchaseTx);
  l = derive(txs);
  assert.equal(l.bank, 70_000, "Bank should decrease to 70,000 cents");
  assert.equal(l.net, 140_000);

  // Step 4: Edit Purchase (Update amount from 300 to 100)
  const idx = txs.findIndex((t) => t.id === "pur-1");
  txs[idx] = { ...txs[idx], amount: 10_000, note: "Office tools discounted" };
  l = derive(txs);
  assert.equal(l.bank, 90_000, "Bank balance should reflect updated purchase amount");
  assert.equal(l.net, 160_000);

  // Step 5: Delete Purchase
  const filtered = txs.filter((t) => t.id !== "pur-1");
  l = derive(filtered);
  assert.equal(l.bank, 100_000, "Bank balance should restore to 100,000 cents after deletion");
  assert.equal(l.net, 170_000);
});

test("QA Audit 2: Transfer between Cash & Bank preserves net worth", () => {
  const t0 = 1770000000000;
  const txs: Tx[] = [
    { id: "1", at: t0, kind: "adjust", amount: 100_000, pocket: "cash", note: "Start cash" },
    { id: "2", at: t0 + 1, kind: "adjust", amount: 50_000, pocket: "bank", note: "Start bank" },
  ];

  // Transfer 300 from Cash to Bank
  txs.push({
    id: "tr-1",
    at: t0 + 10,
    kind: "transfer",
    amount: 30_000,
    pocket: "cash",
    toPocket: "bank",
    note: "Deposit into ATM",
  });

  const l = derive(txs);
  assert.equal(l.cash, 70_000);
  assert.equal(l.bank, 80_000);
  assert.equal(l.net, 150_000, "Net worth must remain unchanged after internal transfer");
});

test("QA Audit 3: Debts Lifecycle (Lend, Borrow, Collect, Repay, Waive)", () => {
  const t0 = 1770000000000;
  const txs: Tx[] = [
    { id: "1", at: t0, kind: "adjust", amount: 100_000, pocket: "cash", note: "Start cash" },
    // 1. Lend to Karim (Receivable 200)
    { id: "d-1", at: t0 + 10, kind: "receivable", amount: 20_000, person: "كريم", note: "Loan" },
    // 2. Borrow from Mostafa (Payable 300)
    { id: "d-2", at: t0 + 20, kind: "payable", amount: 30_000, person: "مصطفى", note: "Borrow" },
  ];

  let l = derive(txs);
  assert.equal(l.receivable, 20_000);
  assert.equal(l.payable, 30_000);
  // Net = 100,000 (cash) + 20,000 (owed to me) - 30,000 (I owe) = 90,000
  assert.equal(l.net, 90_000);

  // 3. Karim repays 150 partially into Cash
  txs.push({
    id: "col-1",
    at: t0 + 30,
    kind: "collect",
    amount: 15_000,
    pocket: "cash",
    person: "كريم",
    note: "Partial repayment",
  });
  l = derive(txs);
  assert.equal(l.cash, 115_000);
  assert.equal(l.receivable, 5_000, "Karim still owes 50");

  // 4. Waive the remaining 50 for Karim
  txs.push({
    id: "w-1",
    at: t0 + 40,
    kind: "waive-in",
    amount: 5_000,
    person: "كريم",
    note: "Forgiven",
  });
  l = derive(txs);
  assert.equal(l.receivable, 0, "No receivable remaining for Karim");
  assert.equal(l.peopleOweMe.length, 0);

  // 5. Repay Mostafa in full from Cash
  txs.push({
    id: "rep-1",
    at: t0 + 50,
    kind: "repay",
    amount: 30_000,
    pocket: "cash",
    person: "مصطفى",
    note: "Full repayment",
  });
  l = derive(txs);
  assert.equal(l.cash, 85_000);
  assert.equal(l.payable, 0);
  assert.equal(l.iOwe.length, 0);
  assert.equal(l.net, 85_000);
});

test("QA Audit 4: Overdraft Prevention & Non-Negative Validation", () => {
  // Scenario 1: Spending without funds
  const overspending: Tx[] = [
    { id: "1", at: 1000, kind: "adjust", amount: 10_000, pocket: "cash", note: "Start" },
    { id: "2", at: 2000, kind: "purchase", amount: 15_000, pocket: "cash", note: "Overspending" },
  ];
  assert.notEqual(rejectReason(overspending), null, "Must detect overdraft in cash");

  // Scenario 2: Valid spending with zero remainder
  const zeroRemainder: Tx[] = [
    { id: "1", at: 1000, kind: "adjust", amount: 10_000, pocket: "cash", note: "Start" },
    { id: "2", at: 2000, kind: "purchase", amount: 10_000, pocket: "cash", note: "Exact spend" },
  ];
  assert.equal(rejectReason(zeroRemainder), null, "Zero balance must be permissible");
  const l = derive(zeroRemainder);
  assert.equal(l.cash, 0);

  // Scenario 3: Bank overdraft is rejected
  const bankOverdraft: Tx[] = [
    { id: "1", at: 1000, kind: "adjust", amount: 5_000, pocket: "bank", note: "Start" },
    { id: "2", at: 2000, kind: "purchase", amount: 8_000, pocket: "bank", note: "Too much from bank" },
  ];
  assert.notEqual(rejectReason(bankOverdraft), null, "Must detect overdraft in bank");

  // Scenario 4: Over-collection clamps debt to 0 and does not result in negative debt
  const overcollect: Tx[] = [
    { id: "1", at: 1000, kind: "receivable", amount: 10_000, person: "علي", note: "Loan" },
    { id: "2", at: 2000, kind: "collect", amount: 12_000, pocket: "cash", person: "علي", note: "More than loan" },
  ];
  const lOver = derive(overcollect);
  assert.equal(lOver.receivable, 0, "Debt owed to me must clamp cleanly to 0");
  assert.equal(lOver.peopleOweMe.length, 0);
});

test("QA Audit 5: Input Validation & Formatting", () => {
  // Digits and Currency
  assert.equal(parseMoney("١٠٠٠"), 100000);
  assert.equal(parseMoney("250.50"), 25050);
  assert.equal(parseMoney("-100"), null, "Negative money inputs must be rejected");
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("zero"), null);

  // Output formatting
  assert.equal(centsToInput(25050), "250.50");
  assert.equal(centsToInput(0), "0.00");
});

test("QA Audit 6: Category Breakdown and Monthly Flow", () => {
  const d = new Date(2026, 9, 15); // Oct 15, 2026
  const t = d.getTime();

  const txs: Tx[] = [
    { id: "1", at: t, kind: "adjust", amount: 200_000, pocket: "cash", note: "Start" },
    { id: "2", at: t + 100, kind: "income", amount: 50_000, pocket: "cash", category: "salary", note: "Salary" },
    { id: "3", at: t + 200, kind: "purchase", amount: 15_000, pocket: "cash", category: "food", note: "Groceries" },
    { id: "4", at: t + 300, kind: "purchase", amount: 10_000, pocket: "cash", category: "transport", note: "Fuel" },
    { id: "5", at: t + 400, kind: "purchase", amount: 25_000, pocket: "cash", category: "food", note: "Dinner" },
  ];

  const breakdown = categoryBreakdown(txs, d);
  assert.equal(breakdown.length, 2);
  // Total spent: 150 + 100 + 250 = 500 (50,000 cents)
  // Food: 400 (40,000 cents) => 80%
  // Transport: 100 (10,000 cents) => 20%
  assert.equal(breakdown[0].category, "food");
  assert.equal(breakdown[0].cents, 40_000);
  assert.equal(breakdown[0].percentage, 80);

  assert.equal(breakdown[1].category, "transport");
  assert.equal(breakdown[1].cents, 10_000);
  assert.equal(breakdown[1].percentage, 20);

  const flow = monthFlow(txs, d);
  assert.equal(flow.earned, 50_000);
  assert.equal(flow.spent, 50_000);
  assert.equal(flow.netFlow, 0);
});

test("QA Audit 7: Client-side PBKDF2 and AES-GCM Encrypted Storage Roundtrip", async () => {
  const pin = "7890";
  const salt = generateSalt();
  const pinHash = await hashPin(pin, salt);

  assert.equal(await verifyPin(pin, salt, pinHash), true);
  assert.equal(await verifyPin("0000", salt, pinHash), false);

  const key = await deriveAesGcmKey(pin, salt);
  const sampleLedger = [
    { id: "tx-1", at: Date.now(), kind: "income", amount: 100000, pocket: "bank", note: "Top Secret Income" },
    { id: "tx-2", at: Date.now() + 10, kind: "purchase", amount: 5000, pocket: "bank", note: "Secret Expense" },
  ];

  const encrypted = await encryptPayload(sampleLedger, key);
  assert.ok(encrypted.ciphertextHex);
  assert.ok(encrypted.ivHex);

  const decrypted = await decryptPayload<typeof sampleLedger>(encrypted.ciphertextHex, encrypted.ivHex, key);
  assert.deepEqual(decrypted, sampleLedger);

  const checksum = await calculateLedgerChecksum(decrypted as any);
  assert.equal(checksum.length, 64);
});
