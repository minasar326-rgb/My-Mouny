export type Pocket = "cash" | "bank";

export type Kind =
  | "purchase"
  | "income"
  | "transfer"
  | "receivable"
  | "payable"
  | "collect"
  | "repay"
  | "waive-in"
  | "waive-out"
  | "adjust";

export type Tx = {
  id: string;
  at: number;
  kind: Kind;
  /** Cents. Signed only for `adjust`. Everything else is a positive magnitude. */
  amount: number;
  pocket?: Pocket;
  toPocket?: Pocket;
  person?: string;
  category?: string;
  note: string;
};

export type PredefinedCategory = {
  id: string;
  icon: string;
  ar: string;
  en: string;
  el: string;
  kind: "purchase" | "income" | "all";
};

export const PREDEFINED_CATEGORIES: PredefinedCategory[] = [
  // Purchases
  { id: "food", icon: "🍔", ar: "طعام ومشروبات", en: "Food & Drinks", el: "Φαγητό & Ποτά", kind: "purchase" },
  { id: "shopping", icon: "🛍️", ar: "تسوق ومستلزمات", en: "Shopping", el: "Ψώνια", kind: "purchase" },
  { id: "bills", icon: "📄", ar: "فواتير ومرافق", en: "Bills & Utilities", el: "Λογαριασμοί", kind: "purchase" },
  { id: "transport", icon: "🚗", ar: "مواصلات وبنزين", en: "Transport", el: "Μεταφορές", kind: "purchase" },
  { id: "health", icon: "💊", ar: "صحة وعلاج", en: "Health & Medical", el: "Υγεία & Φάρμακα", kind: "purchase" },
  { id: "home", icon: "🏠", ar: "منزل وأسرة", en: "Home & Family", el: "Σπίτι & Οικογένεια", kind: "purchase" },
  { id: "entertainment", icon: "☕", ar: "ترفيه وخروج", en: "Entertainment", el: "Ψυχαγωγία", kind: "purchase" },
  { id: "education", icon: "📚", ar: "تعليم ودورات", en: "Education", el: "Εκπαίδευση", kind: "purchase" },
  // Income
  { id: "salary", icon: "💼", ar: "راتب شهري", en: "Salary", el: "Μισθός", kind: "income" },
  { id: "business", icon: "💻", ar: "عمل حر ومبيعات", en: "Freelance / Business", el: "Ελεύθερο Επάγγελμα", kind: "income" },
  { id: "investment", icon: "📈", ar: "أرباح واستثمار", en: "Investments", el: "Επενδύσεις", kind: "income" },
  { id: "gift", icon: "🎁", ar: "مكافأة وهدايا", en: "Bonus & Gifts", el: "Δώρα & Bonus", kind: "income" },
  // General
  { id: "other", icon: "🏷️", ar: "أخرى", en: "Other", el: "Άλλο", kind: "all" },
];

export function getCategoryLabel(catIdOrName?: string, lang: string = "ar"): string {
  if (!catIdOrName) return "";
  const match = PREDEFINED_CATEGORIES.find(
    (c) => c.id === catIdOrName || c.ar === catIdOrName || c.en === catIdOrName
  );
  if (!match) return catIdOrName;
  const label = lang === "en" ? match.en : lang === "el" ? match.el : match.ar;
  return `${match.icon} ${label}`;
}

export type PersonBal = {
  key: string;
  name: string;
  cents: number;
};

export type Ledger = {
  cash: number;
  bank: number;
  receivable: number;
  payable: number;
  net: number;
  peopleOweMe: PersonBal[];
  iOwe: PersonBal[];
};

export type Currency = "EGP" | "USD" | "EUR";

export const CURRENCIES: { id: Currency; symbol: string; label: string; code: string }[] = [
  { id: "EGP", symbol: "ج.م", label: "جنيه مصري (EGP)", code: "EGP" },
  { id: "USD", symbol: "$", label: "دولار أمريكي (USD)", code: "USD" },
  { id: "EUR", symbol: "€", label: "يورو (EUR)", code: "EUR" },
];

const currencyFormatters: Record<Currency, Intl.NumberFormat> = {
  EGP: new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    numberingSystem: "latn",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    numberingSystem: "latn",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  EUR: new Intl.NumberFormat("ar", {
    style: "currency",
    currency: "EUR",
    numberingSystem: "latn",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
};

export function getCurrencySymbol(currency: Currency = "EGP", lang: string = "ar"): string {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  return lang === "ar" ? "ج.م" : "EGP";
}

export function getCurrencyLabel(currency: Currency = "EGP", lang: string = "ar"): string {
  if (lang === "en") {
    if (currency === "USD") return "US Dollar (USD)";
    if (currency === "EUR") return "Euro (EUR)";
    return "Egyptian Pound (EGP)";
  }
  if (lang === "el") {
    if (currency === "USD") return "Δολάριο ΗΠΑ (USD)";
    if (currency === "EUR") return "Ευρώ (EUR)";
    return "Αιγυπτιακή Λίρα (EGP)";
  }
  if (currency === "USD") return "دولار أمريكي (USD)";
  if (currency === "EUR") return "يورو (EUR)";
  return "جنيه مصري (EGP)";
}

const dayFormat = new Intl.DateTimeFormat("ar", {
  numberingSystem: "latn",
  day: "numeric",
  month: "long",
});

const timeFormat = new Intl.DateTimeFormat("ar", {
  numberingSystem: "latn",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatMoney(cents: number, currency: Currency = "EGP", lang: string = "ar"): string {
  const locale = lang === "en" ? "en-US" : lang === "el" ? "el-GR" : "ar-EG";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      numberingSystem: "latn",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    const fmt = currencyFormatters[currency] || currencyFormatters.EGP;
    return fmt.format(cents / 100);
  }
}

export function formatEuro(cents: number, currency: Currency = "EGP", lang: string = "ar"): string {
  return formatMoney(cents, currency, lang);
}

export function centsToInput(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}

export function convertArabicDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 0x0660).toString())
    .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 0x06f0).toString());
}

export function parseMoney(raw: string, allowZero = false): number | null {
  const converted = convertArabicDigits(raw);
  const trimmed = converted
    .trim()
    .replace(/[€\$]/g, "")
    .replace(/ج\.م\.?/gi, "")
    .replace(/EGP|USD|EUR/gi, "")
    .replace(/\s+/g, "")
    .replace(/[,\u066B]/g, ".");
  if (!trimmed || !/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(Number(trimmed) * 100);
  if (!Number.isFinite(cents)) return null;
  if (cents < 0 || cents > 1_000_000_000) return null;
  if (cents === 0 && !allowZero) return null;
  return cents;
}

export function parseEuro(raw: string, allowZero = false): number | null {
  return parseMoney(raw, allowZero);
}

export function normalizeArabic(text: string): string {
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel / harakat
    .replace(/[إأآا]/g, "ا") // normalize Alef variants
    .replace(/ة/g, "ه") // normalize Teh Marbuta
    .replace(/[ىي]/g, "ي") // normalize Ya / Alef Maksura
    .replace(/\s+/g, " ") // collapse multiple spaces
    .toLocaleLowerCase("ar");
}

export function personKey(name: string): string {
  return normalizeArabic(name);
}

export function pocketLabel(pocket: Pocket): string {
  return pocket === "cash" ? "الكاش" : "البنك";
}

export function orderTxs(txs: Tx[]): Tx[] {
  return [...txs].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

type Problem = "cash" | "bank" | "recv" | "pay" | null;

function applyAll(txs: Tx[]): Problem {
  let cash = 0;
  let bank = 0;
  const recv = new Map<string, number>();
  const pay = new Map<string, number>();

  const pocket = (which: Pocket, delta: number): Problem => {
    if (which === "cash") {
      cash += delta;
      return cash < 0 ? "cash" : null;
    }
    bank += delta;
    return bank < 0 ? "bank" : null;
  };

  const person = (map: Map<string, number>, key: string, delta: number, problem: Problem): Problem => {
    const next = (map.get(key) ?? 0) + delta;
    if (next < 0) return problem;
    map.set(key, next);
    return null;
  };

  for (const tx of orderTxs(txs)) {
    let problem: Problem = null;
    switch (tx.kind) {
      case "purchase":
        if (tx.pocket) problem = pocket(tx.pocket, -Math.abs(tx.amount));
        break;
      case "income":
        if (tx.pocket) problem = pocket(tx.pocket, Math.abs(tx.amount));
        break;
      case "transfer":
        if (tx.pocket && tx.toPocket && tx.pocket !== tx.toPocket) {
          problem = pocket(tx.pocket, -Math.abs(tx.amount));
          if (!problem) problem = pocket(tx.toPocket, Math.abs(tx.amount));
        }
        break;
      case "receivable": {
        const key = personKey(tx.person ?? "");
        if (key) problem = person(recv, key, Math.abs(tx.amount), "recv");
        break;
      }
      case "payable": {
        const key = personKey(tx.person ?? "");
        if (key) problem = person(pay, key, Math.abs(tx.amount), "pay");
        break;
      }
      case "collect": {
        const key = personKey(tx.person ?? "");
        if (key) {
          const current = recv.get(key) ?? 0;
          // When collecting money, reduce receivable down to 0 without blocking on overpay
          recv.set(key, Math.max(0, current - Math.abs(tx.amount)));
        }
        if (tx.pocket) problem = pocket(tx.pocket, Math.abs(tx.amount));
        break;
      }
      case "repay": {
        const key = personKey(tx.person ?? "");
        if (tx.pocket) problem = pocket(tx.pocket, -Math.abs(tx.amount));
        if (!problem && key) {
          const current = pay.get(key) ?? 0;
          pay.set(key, Math.max(0, current - Math.abs(tx.amount)));
        }
        break;
      }
      case "waive-in": {
        const key = personKey(tx.person ?? "");
        if (key) {
          const current = recv.get(key) ?? 0;
          recv.set(key, Math.max(0, current - Math.abs(tx.amount)));
        }
        break;
      }
      case "waive-out": {
        const key = personKey(tx.person ?? "");
        if (key) {
          const current = pay.get(key) ?? 0;
          pay.set(key, Math.max(0, current - Math.abs(tx.amount)));
        }
        break;
      }
      case "adjust":
        if (tx.pocket) problem = pocket(tx.pocket, tx.amount);
        break;
    }
    if (problem) return problem;
  }
  return null;
}

export function explainProblem(problem: Exclude<Problem, null>): string {
  switch (problem) {
    case "cash":
      return "رصيد الكاش لا يكفي لهذه الحركة.";
    case "bank":
      return "رصيد البنك لا يكفي لهذه الحركة.";
    case "recv":
      return "المبلغ أكبر مما لك عند هذا الشخص.";
    case "pay":
      return "المبلغ أكبر مما عليك لهذا الشخص.";
  }
}

export function rejectReason(txs: Tx[]): string | null {
  const problem = applyAll(txs);
  return problem ? explainProblem(problem) : null;
}

export function derive(txs: Tx[]): Ledger {
  let cash = 0;
  let bank = 0;
  const recv = new Map<string, { name: string; cents: number }>();
  const pay = new Map<string, { name: string; cents: number }>();

  const addPocket = (which: Pocket, delta: number) => {
    if (which === "cash") cash += delta;
    else bank += delta;
  };

  const bump = (
    map: Map<string, { name: string; cents: number }>,
    rawName: string,
    delta: number,
  ) => {
    const key = personKey(rawName);
    if (!key) return;
    const current = map.get(key) ?? { name: rawName.trim().replace(/\s+/g, " "), cents: 0 };
    current.cents = Math.max(0, current.cents + delta);
    current.name = rawName.trim().replace(/\s+/g, " ");
    map.set(key, current);
  };

  for (const tx of orderTxs(txs)) {
    const amount = Math.abs(tx.amount);
    switch (tx.kind) {
      case "purchase":
        if (tx.pocket) addPocket(tx.pocket, -amount);
        break;
      case "income":
        if (tx.pocket) addPocket(tx.pocket, amount);
        break;
      case "transfer":
        if (tx.pocket && tx.toPocket) {
          addPocket(tx.pocket, -amount);
          addPocket(tx.toPocket, amount);
        }
        break;
      case "receivable":
        if (tx.person) bump(recv, tx.person, amount);
        break;
      case "payable":
        if (tx.person) bump(pay, tx.person, amount);
        break;
      case "collect":
        if (tx.pocket) addPocket(tx.pocket, amount);
        if (tx.person) bump(recv, tx.person, -amount);
        break;
      case "repay":
        if (tx.pocket) addPocket(tx.pocket, -amount);
        if (tx.person) bump(pay, tx.person, -amount);
        break;
      case "waive-in":
        if (tx.person) bump(recv, tx.person, -amount);
        break;
      case "waive-out":
        if (tx.person) bump(pay, tx.person, -amount);
        break;
      case "adjust":
        if (tx.pocket) addPocket(tx.pocket, tx.amount);
        break;
    }
  }

  const listed = (map: Map<string, { name: string; cents: number }>): PersonBal[] =>
    [...map.entries()]
      .filter(([, value]) => value.cents > 0)
      .map(([key, value]) => ({ key, name: value.name, cents: value.cents }))
      .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, "ar"));

  const peopleOweMe = listed(recv);
  const iOwe = listed(pay);
  const receivable = peopleOweMe.reduce((sum, person) => sum + person.cents, 0);
  const payable = iOwe.reduce((sum, person) => sum + person.cents, 0);

  return {
    cash,
    bank,
    receivable,
    payable,
    net: cash + bank + receivable - payable,
    peopleOweMe,
    iOwe,
  };
}

export function monthFlow(txs: Tx[], now = new Date()): { spent: number; earned: number; netFlow: number } {
  const year = now.getFullYear();
  const month = now.getMonth();
  let spent = 0;
  let earned = 0;
  for (const tx of txs) {
    const date = new Date(tx.at);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    if (tx.kind === "purchase") spent += Math.abs(tx.amount);
    if (tx.kind === "income") earned += Math.abs(tx.amount);
  }
  return { spent, earned, netFlow: earned - spent };
}

export function categoryBreakdown(
  txs: Tx[],
  now = new Date()
): { category: string; cents: number; percentage: number }[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const map = new Map<string, number>();
  let totalSpent = 0;

  for (const tx of txs) {
    if (tx.kind !== "purchase") continue;
    const date = new Date(tx.at);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const cat = tx.category?.trim() || "other";
    const amount = Math.abs(tx.amount);
    totalSpent += amount;
    map.set(cat, (map.get(cat) ?? 0) + amount);
  }

  if (totalSpent === 0) return [];

  return Array.from(map.entries())
    .map(([category, cents]) => ({
      category,
      cents,
      percentage: Math.round((cents / totalSpent) * 100),
    }))
    .sort((a, b) => b.cents - a.cents);
}

export type Tone = "in" | "out" | "neutral" | "asset" | "debt";

export function describe(tx: Tx): { title: string; detail: string; tone: Tone; cents: number } {
  const note = tx.note.trim();
  const who = tx.person?.trim() || "شخص";
  switch (tx.kind) {
    case "purchase":
      return {
        title: note || "شراء",
        detail: tx.pocket ? `خُصم من ${pocketLabel(tx.pocket)}` : "شراء",
        tone: "out",
        cents: Math.abs(tx.amount),
      };
    case "income":
      return {
        title: note || "دخل",
        detail: tx.pocket ? `أُضيف إلى ${pocketLabel(tx.pocket)}` : "دخل",
        tone: "in",
        cents: Math.abs(tx.amount),
      };
    case "transfer":
      return {
        title: "تحويل",
        detail:
          tx.pocket && tx.toPocket
            ? `من ${pocketLabel(tx.pocket)} إلى ${pocketLabel(tx.toPocket)}`
            : "بين الكاش والبنك",
        tone: "neutral",
        cents: Math.abs(tx.amount),
      };
    case "receivable":
      return {
        title: `لك عند ${who}`,
        detail: note || "دين لك",
        tone: "asset",
        cents: Math.abs(tx.amount),
      };
    case "payable":
      return {
        title: `عليك لـ ${who}`,
        detail: note || "دين عليك",
        tone: "debt",
        cents: Math.abs(tx.amount),
      };
    case "collect":
      return {
        title: `استلمت من ${who}`,
        detail: tx.pocket ? `إلى ${pocketLabel(tx.pocket)} · الصافي لم يتغير` : "تحصيل دين",
        tone: "in",
        cents: Math.abs(tx.amount),
      };
    case "repay":
      return {
        title: `سددت إلى ${who}`,
        detail: tx.pocket ? `من ${pocketLabel(tx.pocket)} · الصافي لم يتغير` : "سداد دين",
        tone: "out",
        cents: Math.abs(tx.amount),
      };
    case "waive-in":
      return {
        title: `شطب دين لك عند ${who}`,
        detail: note || "لن يُحصَّل · نُقص من الصافي",
        tone: "debt",
        cents: Math.abs(tx.amount),
      };
    case "waive-out":
      return {
        title: `شطب دين عليك لـ ${who}`,
        detail: note || "سُقط عنك · زاد الصافي",
        tone: "in",
        cents: Math.abs(tx.amount),
      };
    case "adjust":
      return {
        title: note || "تصحيح رصيد",
        detail: tx.pocket ? pocketLabel(tx.pocket) : "تصحيح",
        tone: tx.amount < 0 ? "out" : "in",
        cents: Math.abs(tx.amount),
      };
  }
}

export function dayLabel(at: number, now = new Date()): string {
  const date = new Date(at);
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((start(now) - start(date)) / 86_400_000);
  if (diff === 0) return "اليوم";
  if (diff === 1) return "أمس";
  return dayFormat.format(date);
}

export function timeLabel(at: number): string {
  return timeFormat.format(new Date(at));
}

export function monthName(now = new Date()): string {
  return new Intl.DateTimeFormat("ar", {
    numberingSystem: "latn",
    month: "long",
  }).format(now);
}
