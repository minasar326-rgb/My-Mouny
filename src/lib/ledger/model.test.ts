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

test("Currency input parsing and digit conversion", () => {
  // Test Eastern Arabic digits conversion
  assert.equal(convertArabicDigits("١٢٣.٤٥"), "123.45");
  assert.equal(convertArabicDigits("٠١٢٣٤٥٦٧٨٩"), "0123456789");

  // Test parseMoney with valid amounts
  assert.equal(parseMoney("100"), 10000); // 100 EGP = 10000 cents
  assert.equal(parseMoney("50.25"), 5025);
  assert.equal(parseMoney("١٥٠.٧٥"), 15075);
  assert.equal(parseMoney("ج.م 250"), 25000);
  assert.equal(parseMoney("$99.99"), 9999);
  assert.equal(parseMoney("€45.50"), 4550);

  // Test zero handling
  assert.equal(parseMoney("0", false), null);
  assert.equal(parseMoney("0", true), 0);
  assert.equal(parseMoney("0.00", true), 0);

  // Test invalid values (negative, non-numbers, excessive values)
  assert.equal(parseMoney("-50"), null);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("   "), null);

  // Test centsToInput
  assert.equal(centsToInput(10000), "100.00");
  assert.equal(centsToInput(5025), "50.25");
});

test("Person key normalization for Arabic and multilingual names", () => {
  // Variations of Ahmed should match
  assert.equal(personKey("أحمد"), personKey("احمد"));
  assert.equal(personKey("إبراهيم"), personKey("ابراهيم"));
  assert.equal(personKey(" فاطمة "), personKey("فاطمه"));
  assert.equal(personKey("علي"), personKey("على"));
  assert.equal(personKey("John Doe"), "john doe");
});

test("Ledger calculations: opening balance, income, purchases, and net worth", () => {
  const baseTime = Date.now();

  const txs: Tx[] = [
    // 1. Initial Opening: Cash 1,000 (100,000 cents), Bank 5,000 (500,000 cents)
    { id: "1", at: baseTime, kind: "adjust", amount: 100_000, pocket: "cash", note: "Opening cash" },
    { id: "2", at: baseTime + 1, kind: "adjust", amount: 500_000, pocket: "bank", note: "Opening bank" },

    // 2. Add Income: 2,000 into Bank (salary)
    { id: "3", at: baseTime + 10, kind: "income", amount: 200_000, pocket: "bank", note: "Salary" },

    // 3. Add Purchase: 300 from Cash (groceries)
    { id: "4", at: baseTime + 20, kind: "purchase", amount: 30_000, pocket: "cash", note: "Groceries" },

    // 4. Add Purchase: 1,500 from Bank (electronics)
    { id: "5", at: baseTime + 30, kind: "purchase", amount: 150_000, pocket: "bank", note: "Electronics" },

    // 5. Transfer: 500 from Bank to Cash (ATM withdrawal)
    { id: "6", at: baseTime + 40, kind: "transfer", amount: 50_000, pocket: "bank", toPocket: "cash", note: "ATM" },
  ];

  const ledger = derive(txs);

  // Cash calculation: 1,000 - 300 + 500 = 1,200 (120,000 cents)
  assert.equal(ledger.cash, 120_000);

  // Bank calculation: 5,000 + 2,000 - 1,500 - 500 = 5,000 (500,000 cents)
  assert.equal(ledger.bank, 500_000);

  // Receivables & Payables should be 0
  assert.equal(ledger.receivable, 0);
  assert.equal(ledger.payable, 0);

  // Net worth: 1,200 + 5,000 = 6,200 (620,000 cents)
  assert.equal(ledger.net, 620_000);
});

test("Ledger calculations: debts, repayments, collections, and debt waivers", () => {
  const baseTime = Date.now();

  const txs: Tx[] = [
    // Starting balance: Cash 10,000
    { id: "1", at: baseTime, kind: "adjust", amount: 1_000_000, pocket: "cash", note: "Start" },

    // Lending 2,000 to Mohamed (receivable)
    { id: "2", at: baseTime + 10, kind: "receivable", amount: 200_000, person: "محمد", note: "Loan to Mohamed" },

    // Lending 1,000 to Sara (receivable)
    { id: "3", at: baseTime + 20, kind: "receivable", amount: 100_000, person: "سارة", note: "Loan to Sara" },

    // Borrowing 3,000 from Omar (payable)
    { id: "4", at: baseTime + 30, kind: "payable", amount: 300_000, person: "عمر", note: "Borrowed from Omar" },

    // Mohamed partially repays 800 in cash (collect)
    { id: "5", at: baseTime + 40, kind: "collect", amount: 80_000, pocket: "cash", person: "محمد", note: "Partial loan return" },

    // We partially repay Omar 1,000 from cash (repay)
    { id: "6", at: baseTime + 50, kind: "repay", amount: 100_000, pocket: "cash", person: "عمر", note: "Partial repayment" },

    // We waive the rest of Sara's debt 1,000 (waive-in)
    { id: "7", at: baseTime + 60, kind: "waive-in", amount: 100_000, person: "سارة", note: "Forgiven" },
  ];

  const ledger = derive(txs);

  // Cash: 10,000 + 800 (collected) - 1,000 (repaid) = 9,800 (980,000 cents)
  assert.equal(ledger.cash, 980_000);

  // Receivables: Mohamed still owes (2,000 - 800) = 1,200; Sara owes 0 (waived) -> Total: 1,200 (120,000 cents)
  assert.equal(ledger.receivable, 120_000);
  assert.equal(ledger.peopleOweMe.length, 1);
  assert.equal(ledger.peopleOweMe[0].cents, 120_000);

  // Payables: We still owe Omar (3,000 - 1,000) = 2,000 (200,000 cents)
  assert.equal(ledger.payable, 200_000);
  assert.equal(ledger.iOwe.length, 1);
  assert.equal(ledger.iOwe[0].cents, 200_000);

  // Net worth: Cash(9,800) + Bank(0) + Receivables(1,200) - Payables(2,000) = 9,000 (900,000 cents)
  assert.equal(ledger.net, 900_000);
});

test("Monthly flow: spent and earned aggregates accurately for current month only", () => {
  const currentMonthDate = new Date();
  const pastMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 15);

  const txs: Tx[] = [
    // This month
    { id: "1", at: currentMonthDate.getTime(), kind: "income", amount: 50_000, pocket: "cash", note: "This month income" },
    { id: "2", at: currentMonthDate.getTime() + 10, kind: "purchase", amount: 15_000, pocket: "cash", note: "This month purchase" },
    { id: "3", at: currentMonthDate.getTime() + 20, kind: "transfer", amount: 10_000, pocket: "cash", toPocket: "bank", note: "Transfer does not count in flow" },

    // Past month
    { id: "4", at: pastMonthDate.getTime(), kind: "income", amount: 40_000, pocket: "cash", note: "Last month income" },
    { id: "5", at: pastMonthDate.getTime() + 10, kind: "purchase", amount: 20_000, pocket: "cash", note: "Last month purchase" },
  ];

  const flow = monthFlow(txs, currentMonthDate);
  assert.equal(flow.earned, 50_000);
  assert.equal(flow.spent, 15_000);
});

test("Reject reason validates overdrafts and non-negative balance consistency", () => {
  // Spending money from an empty cash pocket
  const invalidTxs: Tx[] = [
    { id: "1", at: Date.now(), kind: "purchase", amount: 10_000, pocket: "cash", note: "Groceries with no money" },
  ];

  const error = rejectReason(invalidTxs);
  assert.notEqual(error, null);
  assert.match(error!, /الكاش/);
});

test("Category labeling and breakdown calculations", () => {
  assert.equal(getCategoryLabel("food", "ar"), "🍔 طعام ومشروبات");
  assert.equal(getCategoryLabel("food", "en"), "🍔 Food & Drinks");
  assert.equal(getCategoryLabel("salary", "ar"), "💼 راتب شهري");
  assert.equal(getCategoryLabel("CustomCat", "ar"), "CustomCat");

  const now = new Date();
  const txs: Tx[] = [
    // Starting balance
    { id: "0", at: now.getTime(), kind: "adjust", amount: 100_000, pocket: "cash", note: "Initial" },
    // Purchases with categories
    { id: "1", at: now.getTime() + 10, kind: "purchase", amount: 20_000, pocket: "cash", category: "food", note: "Supermarket" },
    { id: "2", at: now.getTime() + 20, kind: "purchase", amount: 10_000, pocket: "cash", category: "transport", note: "Gas" },
    { id: "3", at: now.getTime() + 30, kind: "purchase", amount: 10_000, pocket: "cash", category: "food", note: "Restaurant" },
  ];

  const breakdown = categoryBreakdown(txs, now);
  // Total spent = 400 (40,000 cents): food = 300 (75%), transport = 100 (25%)
  assert.equal(breakdown.length, 2);
  assert.equal(breakdown[0].category, "food");
  assert.equal(breakdown[0].cents, 30_000);
  assert.equal(breakdown[0].percentage, 75);

  assert.equal(breakdown[1].category, "transport");
  assert.equal(breakdown[1].cents, 10_000);
  assert.equal(breakdown[1].percentage, 25);
});

test("Net monthly cash flow calculates surplus and deficit accurately", () => {
  const now = new Date();

  // Scenario 1: Surplus (Earned 5000, Spent 2000 => Net +3000)
  const surplusTxs: Tx[] = [
    { id: "1", at: now.getTime(), kind: "income", amount: 500_000, pocket: "bank", note: "Salary" },
    { id: "2", at: now.getTime() + 10, kind: "purchase", amount: 200_000, pocket: "bank", note: "Rent" },
  ];
  const flow1 = monthFlow(surplusTxs, now);
  assert.equal(flow1.earned, 500_000);
  assert.equal(flow1.spent, 200_000);
  assert.equal(flow1.netFlow, 300_000);

  // Scenario 2: Deficit (Opening 10,000, Earned 1000, Spent 4000 => Net -3000)
  const deficitTxs: Tx[] = [
    { id: "0", at: now.getTime(), kind: "adjust", amount: 1_000_000, pocket: "cash", note: "Start" },
    { id: "1", at: now.getTime() + 10, kind: "income", amount: 100_000, pocket: "cash", note: "Small job" },
    { id: "2", at: now.getTime() + 20, kind: "purchase", amount: 400_000, pocket: "cash", note: "Laptop" },
  ];
  const flow2 = monthFlow(deficitTxs, now);
  assert.equal(flow2.earned, 100_000);
  assert.equal(flow2.spent, 400_000);
  assert.equal(flow2.netFlow, -300_000);
});

test("Customized transaction dates and chronological order consistency", () => {
  const t1 = new Date(2026, 0, 1).getTime(); // Jan 1, 2026
  const t2 = new Date(2026, 0, 15).getTime(); // Jan 15, 2026
  const t3 = new Date(2026, 0, 30).getTime(); // Jan 30, 2026

  // Enter transactions in reverse order
  const txs: Tx[] = [
    { id: "c", at: t3, kind: "purchase", amount: 20_000, pocket: "cash", note: "Purchase on Jan 30" },
    { id: "b", at: t2, kind: "income", amount: 50_000, pocket: "cash", note: "Income on Jan 15" },
    { id: "a", at: t1, kind: "adjust", amount: 100_000, pocket: "cash", note: "Start on Jan 1" },
  ];

  const ordered = orderTxs(txs);
  assert.equal(ordered[0].id, "a");
  assert.equal(ordered[1].id, "b");
  assert.equal(ordered[2].id, "c");

  const ledger = derive(txs);
  // Cash = 100,000 + 50,000 - 20,000 = 130,000 cents
  assert.equal(ledger.cash, 130_000);
});
