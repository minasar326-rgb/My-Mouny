import { create } from "zustand";
import { derive, rejectReason, type Pocket, type Tx, type Currency, type PersonBal } from "@/lib/ledger/model";
import { type Language } from "@/lib/i18n";
import {
  checkAndMigrateLegacyLocalStorage,
  clearVaultTransactions,
  createVault as idbCreateVault,
  deleteVault as idbDeleteVault,
  deleteVaultWithPin,
  exportVaultBackup,
  getActiveVaultSession,
  getOrCreateDefaultVault,
  importVaultBackup,
  listVaults,
  loadVaultTransactions,
  lockActiveVault,
  removeVaultPin,
  requestPersistentStorage,
  saveVaultTransactions,
  setVaultPin,
  unlockVault as idbUnlockVault,
  type VaultMeta,
} from "@/lib/storage/idb";

export type Draft = Omit<Tx, "id" | "at"> & { at?: number };

type Result = { ok: true } | { ok: false; error: string };

export type LedgerState = {
  // Vault session state
  isInitialized: boolean;
  isUnlocked: boolean;
  vaults: VaultMeta[];
  currentVault: VaultMeta | null;
  activeCryptoKey: CryptoKey | null;

  // Ledger state for active vault
  txs: Tx[];
  started: boolean;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  lang: Language;
  setLang: (lang: Language) => void;

  // Initialization & Vault actions
  initSession: () => Promise<void>;
  skipOrOpenDefault: () => Promise<void>;
  unlock: (vaultId: string, pin?: string) => Promise<Result>;
  lock: () => Promise<void>;
  createVault: (name: string, pin?: string) => Promise<Result>;
  setPinForCurrentVault: (pin: string) => Promise<Result>;
  removePinForCurrentVault: (currentPin: string) => Promise<Result>;
  deleteCurrentVault: () => Promise<Result>;
  deleteVaultWithVerification: (vaultId: string, pin?: string) => Promise<Result>;
  switchVault: (vaultId: string) => Promise<Result>;
  exportBackup: () => Promise<string>;
  importBackup: (backupText: string, pin?: string) => Promise<Result>;

  // Financial transactions actions
  commit: (draft: Draft) => Result;
  updateTx: (id: string, updatedFields: Partial<Omit<Tx, "id">>) => Result;
  setOpening: (cash: number, bank: number) => void;
  dismissStart: () => void;
  remove: (id: string) => Result;
  clearLedgerKeepBalances: () => void;
  reset: () => void;
};

function withId(draft: Draft): Tx {
  return {
    ...draft,
    id: crypto.randomUUID(),
    at: draft.at ?? Date.now(),
  };
}

function getWarmSnapshot(): {
  isInitialized: boolean;
  isUnlocked: boolean;
  currentVault: VaultMeta | null;
  txs: Tx[];
  started: boolean;
} {
  if (typeof window === "undefined") {
    return {
      isInitialized: false,
      isUnlocked: false,
      currentVault: null,
      txs: [],
      started: false,
    };
  }

  try {
    const raw =
      localStorage.getItem("mymouny_warm_cache") ||
      localStorage.getItem("zaker_warm_cache") ||
      localStorage.getItem("khazinti_warm_cache");

    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.currentVault) {
        const currentVault: VaultMeta = parsed.currentVault;
        let txs: Tx[] = Array.isArray(parsed.txs) ? parsed.txs : [];

        // If txs is empty but vault has no PIN, check mirror
        if (txs.length === 0 && !currentVault.hasPin) {
          const mirrorRaw =
            localStorage.getItem(`mymouny_vault_mirror_${currentVault.id}`) ||
            localStorage.getItem(`khazinti_vault_mirror_${currentVault.id}`) ||
            localStorage.getItem("mymouny_active_txs");
          if (mirrorRaw) {
            try {
              const parsedMirror = JSON.parse(mirrorRaw);
              if (Array.isArray(parsedMirror)) txs = parsedMirror;
              else if (Array.isArray(parsedMirror?.txs)) txs = parsedMirror.txs;
            } catch {}
          }
        }

        const isUnlocked: boolean = !currentVault.hasPin || Boolean(parsed.isUnlocked);

        return {
          isInitialized: true,
          isUnlocked,
          currentVault,
          txs,
          started: txs.length > 0,
        };
      }
    }

    // Direct fallback from active txs and default vault mirror
    const activeTxsRaw = localStorage.getItem("mymouny_active_txs");
    const activeVaultsRaw =
      localStorage.getItem("mymouny_vaults_list") ||
      localStorage.getItem("zaker_vaults_list");

    if (activeVaultsRaw) {
      const vaultsList = JSON.parse(activeVaultsRaw);
      if (Array.isArray(vaultsList) && vaultsList.length > 0) {
        const firstVault = vaultsList[0];
        let txs: Tx[] = [];
        if (activeTxsRaw) {
          try { txs = JSON.parse(activeTxsRaw); } catch {}
        }
        return {
          isInitialized: true,
          isUnlocked: !firstVault.hasPin,
          currentVault: firstVault,
          txs,
          started: txs.length > 0,
        };
      }
    }
  } catch {}

  return {
    isInitialized: false,
    isUnlocked: false,
    currentVault: null,
    txs: [],
    started: false,
  };
}

function saveWarmSnapshot(vault: VaultMeta | null, isUnlocked: boolean, txs: Tx[]) {
  if (typeof window === "undefined" || !vault) return;
  try {
    const cacheData = {
      currentVault: vault,
      isUnlocked: !vault.hasPin ? true : isUnlocked,
      txs: vault.hasPin ? [] : txs,
      timestamp: Date.now(),
    };
    localStorage.setItem("mymouny_warm_cache", JSON.stringify(cacheData));
    localStorage.setItem("zaker_warm_cache", JSON.stringify(cacheData));
    if (!vault.hasPin) {
      localStorage.setItem("mymouny_active_txs", JSON.stringify(txs));
      localStorage.setItem(
        `mymouny_vault_mirror_${vault.id}`,
        JSON.stringify({ vaultId: vault.id, savedAt: Date.now(), txs })
      );
    }
  } catch {
    // Ignore quota issues
  }
}

const warm = getWarmSnapshot();

export const useLedger = create<LedgerState>((set, get) => ({
  isInitialized: warm.isInitialized,
  isUnlocked: warm.isUnlocked,
  vaults: warm.currentVault ? [warm.currentVault] : [],
  currentVault: warm.currentVault,
  activeCryptoKey: null,
  txs: warm.txs,
  started: warm.started,
  currency:
    typeof window !== "undefined"
      ? ((localStorage.getItem("khazinti_currency") as Currency) || "EGP")
      : "EGP",
  setCurrency: (currency: Currency) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("khazinti_currency", currency);
      } catch {
        // ignore
      }
    }
    set({ currency });
  },

  lang:
    typeof window !== "undefined"
      ? ((localStorage.getItem("khazinti_lang") as Language) || "ar")
      : "ar",
  setLang: (lang: Language) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("khazinti_lang", lang);
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = lang;
        document.title = "my Mouny";
      } catch {
        // ignore
      }
    }
    set({ lang });
  },

  initSession: async () => {
    try {
      if (typeof window !== "undefined") {
        const currentLang = get().lang;
        document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = currentLang;
        document.title = "my Mouny";
      }

      const initPromise = (async () => {
        // 0. Request Persistent Storage to guarantee data is never evicted by browser
        requestPersistentStorage().catch(() => false);

        // 1. Check for legacy migration from localStorage
        await checkAndMigrateLegacyLocalStorage().catch(() => false);

        // 2. Fetch list of vaults on device
        let vaults = await listVaults().catch(() => []);

        // If no vaults exist at all, auto-create default open vault so user is never blocked!
        if (vaults.length === 0) {
          const defaultVault = await getOrCreateDefaultVault().catch(() => ({
            id: "default-vault",
            name: "my Mouny",
            hasPin: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));
          vaults = [defaultVault];
          saveWarmSnapshot(defaultVault, true, []);
          set({
            isInitialized: true,
            isUnlocked: true,
            vaults,
            currentVault: defaultVault,
            activeCryptoKey: null,
            txs: [],
            started: false,
          });
          return;
        }

        // 3. Check if there is an active session
        const activeId = await getActiveVaultSession().catch(() => null);
        const targetVault = (activeId && vaults.find((v) => v.id === activeId)) || vaults[0]!;

        // If the target vault has NO PIN, auto-unlock immediately!
        if (!targetVault.hasPin) {
          const txs = await loadVaultTransactions(targetVault.id, undefined).catch(() => []);
          saveWarmSnapshot(targetVault, true, txs);
          set({
            isInitialized: true,
            isUnlocked: true,
            vaults,
            currentVault: targetVault,
            activeCryptoKey: null,
            txs,
            started: txs.length > 0,
          });
          return;
        }

        // If target vault has a PIN, check if already unlocked in this browser session
        let sessionPin: string | null = null;
        try {
          if (typeof sessionStorage !== "undefined") {
            sessionPin = sessionStorage.getItem("mymouny_session_pin_" + targetVault.id);
          }
        } catch {}

        if (sessionPin) {
          try {
            const { meta, key } = await idbUnlockVault(targetVault.id, sessionPin);
            const txs = await loadVaultTransactions(targetVault.id, key);
            saveWarmSnapshot(meta, true, txs);
            set({
              isInitialized: true,
              isUnlocked: true,
              vaults,
              currentVault: meta,
              activeCryptoKey: key || null,
              txs,
              started: txs.length > 0,
            });
            return;
          } catch {
            try {
              sessionStorage.removeItem("mymouny_session_pin_" + targetVault.id);
            } catch {}
          }
        }

        // If target vault has a PIN and no active session, require unlock
        saveWarmSnapshot(targetVault, false, []);
        set({
          isInitialized: true,
          isUnlocked: false,
          vaults,
          currentVault: targetVault,
          activeCryptoKey: null,
          txs: [],
          started: false,
        });
      })();

      await initPromise;
    } catch (err) {
      console.error("[useLedger] Failed to init session:", err);
      // Fallback: check localStorage mirror before resetting!
      const mirrorVaults = await listVaults().catch(() => []);
      if (mirrorVaults.length > 0) {
        const first = mirrorVaults[0];
        const txs = !first.hasPin ? await loadVaultTransactions(first.id, undefined).catch(() => []) : [];
        set({
          isInitialized: true,
          isUnlocked: !first.hasPin,
          vaults: mirrorVaults,
          currentVault: first,
          activeCryptoKey: null,
          txs,
          started: txs.length > 0,
        });
        return;
      }
      const fallbackVault: VaultMeta = {
        id: "default-vault",
        name: "my Mouny",
        hasPin: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set({
        isInitialized: true,
        isUnlocked: true,
        vaults: [fallbackVault],
        currentVault: fallbackVault,
        activeCryptoKey: null,
        txs: [],
        started: false,
      });
    }
  },

  skipOrOpenDefault: async () => {
    const vaults = await listVaults();
    // Only open if there is an unencrypted vault without a PIN
    const target = vaults.find((v) => !v.hasPin);
    if (!target) {
      // All existing vaults are protected with a PIN - DO NOT create a dummy vault or bypass!
      set({ isUnlocked: false });
      return;
    }
    const txs = await loadVaultTransactions(target.id, undefined);
    const updatedVaults = await listVaults();
    saveWarmSnapshot(target, true, txs);
    set({
      isUnlocked: true,
      currentVault: target,
      activeCryptoKey: null,
      vaults: updatedVaults,
      txs,
      started: txs.length > 0,
    });
  },

  unlock: async (vaultId, pin) => {
    try {
      const { meta, key } = await idbUnlockVault(vaultId, pin);
      const txs = await loadVaultTransactions(vaultId, key);
      const vaults = await listVaults();
      saveWarmSnapshot(meta, true, txs);
      try {
        if (pin && typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("mymouny_session_pin_" + vaultId, pin);
        }
      } catch {}
      set({
        isUnlocked: true,
        currentVault: meta,
        activeCryptoKey: key || null,
        vaults,
        txs,
        started: txs.length > 0,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "تعذر فتح الخزنة" };
    }
  },

  lock: async () => {
    const cur = get().currentVault;
    if (cur) {
      try {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("mymouny_session_pin_" + cur.id);
        }
      } catch {}
    }
    saveWarmSnapshot(cur, false, []);
    await lockActiveVault();
    const vaults = await listVaults();
    set({
      isUnlocked: false,
      currentVault: null,
      activeCryptoKey: null,
      txs: [],
      started: false,
      vaults,
    });
  },

  createVault: async (name, pin) => {
    try {
      const { meta, key } = await idbCreateVault(name, pin);
      const vaults = await listVaults();
      set({
        isUnlocked: true,
        currentVault: meta,
        activeCryptoKey: key || null,
        vaults,
        txs: [],
        started: false,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "فشل إنشاء الخزنة" };
    }
  },

  setPinForCurrentVault: async (pin: string) => {
    const current = get().currentVault;
    if (!current) return { ok: false, error: "لا توجد خزنة نشطة" };
    try {
      const currentTxs = get().txs;
      const newKey = await setVaultPin(current.id, pin, get().activeCryptoKey || undefined, currentTxs);
      const vaults = await listVaults();
      const updatedMeta = vaults.find((v) => v.id === current.id) || current;
      set({
        currentVault: updatedMeta,
        activeCryptoKey: newKey,
        vaults,
        txs: currentTxs,
        started: currentTxs.length > 0,
      });
      saveWarmSnapshot(updatedMeta, true, currentTxs);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "فشل تعيين رمز المرور" };
    }
  },

  removePinForCurrentVault: async (currentPin: string) => {
    const current = get().currentVault;
    if (!current) return { ok: false, error: "لا توجد خزنة نشطة" };
    try {
      await removeVaultPin(current.id, currentPin, get().activeCryptoKey || undefined);
      const vaults = await listVaults();
      const updatedMeta = vaults.find((v) => v.id === current.id) || current;
      set({
        currentVault: updatedMeta,
        activeCryptoKey: null,
        vaults,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "فشل إزالة رمز المرور" };
    }
  },

  deleteCurrentVault: async () => {
    const vault = get().currentVault;
    if (!vault) return { ok: false, error: "لا توجد خزنة نشطة" };
    try {
      await idbDeleteVault(vault.id);
      const vaults = await listVaults();
      set({
        isUnlocked: false,
        currentVault: null,
        activeCryptoKey: null,
        txs: [],
        started: false,
        vaults,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "فشل حذف الخزنة" };
    }
  },

  deleteVaultWithVerification: async (vaultId: string, pin?: string) => {
    try {
      await deleteVaultWithPin(vaultId, pin);
      const updatedVaults = await listVaults();
      const wasCurrent = get().currentVault?.id === vaultId;

      if (wasCurrent) {
        // Pick the first remaining vault
        const target = updatedVaults[0];
        if (target) {
          if (!target.hasPin) {
            const txs = await loadVaultTransactions(target.id, undefined).catch(() => []);
            saveWarmSnapshot(target, true, txs);
            set({
              vaults: updatedVaults,
              currentVault: target,
              activeCryptoKey: null,
              isUnlocked: true,
              txs,
              started: true,
            });
          } else {
            saveWarmSnapshot(target, false, []);
            set({
              vaults: updatedVaults,
              currentVault: target,
              activeCryptoKey: null,
              isUnlocked: false,
              txs: [],
              started: true,
            });
          }
        } else {
          const defaultVault = await getOrCreateDefaultVault().catch(() => ({
            id: "default-vault",
            name: "خزينتي الأساسية",
            hasPin: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));
          set({
            vaults: [defaultVault],
            currentVault: defaultVault,
            activeCryptoKey: null,
            isUnlocked: true,
            txs: [],
            started: true,
          });
        }
      } else {
        set({ vaults: updatedVaults });
      }

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "فشل حذف الخزنة",
      };
    }
  },

  switchVault: async (vaultId: string) => {
    const vaults = get().vaults;
    const target = vaults.find((v) => v.id === vaultId);
    if (!target) return { ok: false, error: "الخزنة غير موجودة" };

    if (!target.hasPin) {
      try {
        const txs = await loadVaultTransactions(target.id, undefined);
        saveWarmSnapshot(target, true, txs);
        set({
          currentVault: target,
          activeCryptoKey: null,
          isUnlocked: true,
          txs,
          started: true,
        });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: "فشل فتح الخزنة" };
      }
    } else {
      // Protected vault requires unlock
      saveWarmSnapshot(target, false, []);
      set({
        currentVault: target,
        activeCryptoKey: null,
        isUnlocked: false,
        txs: [],
        started: true,
      });
      return { ok: true };
    }
  },

  exportBackup: async () => {
    const vault = get().currentVault;
    if (!vault) throw new Error("لا توجد خزنة مفتوحة للتصدير");
    const data = await exportVaultBackup(vault.id, get().activeCryptoKey || undefined);
    return JSON.stringify(data, null, 2);
  },

  importBackup: async (backupText, pin) => {
    try {
      const { meta, key } = await importVaultBackup(backupText, pin);
      const txs = await loadVaultTransactions(meta.id, key);
      const vaults = await listVaults();
      set({
        isUnlocked: true,
        currentVault: meta,
        activeCryptoKey: key || null,
        vaults,
        txs,
        started: txs.length > 0,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "فشل استيراد النسخة الاحتياطية" };
    }
  },

  commit: (draft) => {
    const current = get().currentVault;
    const next = [...get().txs, withId(draft)];
    const error = rejectReason(next);
    if (error) return { ok: false, error };

    set({ txs: next, started: true });
    saveWarmSnapshot(current, true, next);

    // Encrypt & persist to IndexedDB
    if (current) {
      saveVaultTransactions(current.id, next, get().activeCryptoKey || undefined).catch((err) =>
        console.error("[useLedger] Failed to save txs to IDB:", err)
      );
    }
    return { ok: true };
  },

  setOpening: (cash, bank) => {
    const current = get().currentVault;
    const now = Date.now();
    const txs: Tx[] = [];
    if (cash > 0) {
      txs.push({
        id: crypto.randomUUID(),
        at: now,
        kind: "adjust",
        amount: cash,
        pocket: "cash",
        note: "رصيد افتتاحي",
      });
    }
    if (bank > 0) {
      txs.push({
        id: crypto.randomUUID(),
        at: now + 1,
        kind: "adjust",
        amount: bank,
        pocket: "bank",
        note: "رصيد افتتاحي",
      });
    }

    set({ txs, started: true });
    saveWarmSnapshot(current, true, txs);

    if (current) {
      saveVaultTransactions(current.id, txs, get().activeCryptoKey || undefined).catch((err) =>
        console.error("[useLedger] Failed to save opening balance to IDB:", err)
      );
    }
  },

  dismissStart: () => set({ started: true }),

  remove: (id) => {
    const current = get().currentVault;
    const next = get().txs.filter((tx) => tx.id !== id);
    const error = rejectReason(next);
    if (error) {
      return {
        ok: false,
        error: "لا يمكن حذف هذه الحركة لأنها ستجعل رصيداً لاحقاً غير ممكن. احذف الأحدث أولاً.",
      };
    }

    set({ txs: next });
    saveWarmSnapshot(current, true, next);

    if (current) {
      saveVaultTransactions(current.id, next, get().activeCryptoKey || undefined).catch((err) =>
        console.error("[useLedger] Failed to save removed tx to IDB:", err)
      );
    }
    return { ok: true };
  },

  updateTx: (id, updatedFields) => {
    const current = get().currentVault;
    const existing = get().txs.find((t) => t.id === id);
    if (!existing) return { ok: false, error: "الحركة غير موجودة" };

    const next = get().txs.map((tx) => {
      if (tx.id !== id) return tx;
      return {
        ...tx,
        ...updatedFields,
      };
    });

    const error = rejectReason(next);
    if (error) {
      return {
        ok: false,
        error: `لا يمكن تعديل هذه الحركة بهذا الشكل لأنها ستجعل الرصيد سالباً: ${error}`,
      };
    }

    set({ txs: next });
    saveWarmSnapshot(current, true, next);

    if (current) {
      saveVaultTransactions(current.id, next, get().activeCryptoKey || undefined).catch((err) =>
        console.error("[useLedger] Failed to save updated tx to IDB:", err)
      );
    }
    return { ok: true };
  },

  clearLedgerKeepBalances: () => {
    const current = get().currentVault;
    const currentTxs = get().txs;
    const ledger = derive(currentTxs);

    const newTxs: Tx[] = [];
    const now = Date.now();

    // 1. تثبيت رصيد الكاش الحالي بالكامل
    if (ledger.cash !== 0) {
      newTxs.push({
        id: crypto.randomUUID(),
        at: now,
        kind: "adjust",
        pocket: "cash",
        amount: ledger.cash,
        note: "رصيد الكاش المثبت",
      });
    }

    // 2. تثبيت رصيد البنك الحالي بالكامل
    if (ledger.bank !== 0) {
      newTxs.push({
        id: crypto.randomUUID(),
        at: now + 1,
        kind: "adjust",
        pocket: "bank",
        amount: ledger.bank,
        note: "رصيد البنك المثبت",
      });
    }

    // 3. تثبيت كافة مستحقاتك الحالية عند الآخرين
    ledger.peopleOweMe.forEach((p: PersonBal, idx: number) => {
      if (p.cents > 0) {
        newTxs.push({
          id: crypto.randomUUID(),
          at: now + 2 + idx,
          kind: "receivable",
          person: p.name,
          amount: p.cents,
          note: "مستحق قائم ومحفوظ",
        });
      }
    });

    // 4. تثبيت كافة ديونك الحالية للغير
    ledger.iOwe.forEach((p: PersonBal, idx: number) => {
      if (p.cents > 0) {
        newTxs.push({
          id: crypto.randomUUID(),
          at: now + 50 + idx,
          kind: "payable",
          person: p.name,
          amount: p.cents,
          note: "دين قائم ومحفوظ",
        });
      }
    });

    set({ txs: newTxs, started: true });
    saveWarmSnapshot(current, true, newTxs);

    if (current) {
      saveVaultTransactions(current.id, newTxs, get().activeCryptoKey || undefined).catch((err) =>
        console.error("[useLedger] Failed to save preserved txs to IDB:", err)
      );
    }
  },

  reset: () => {
    const current = get().currentVault;
    set({ txs: [], started: false });
    saveWarmSnapshot(current, true, []);

    if (current) {
      clearVaultTransactions(current.id, get().activeCryptoKey || undefined).catch((err) =>
        console.error("[useLedger] Failed to clear txs in IDB:", err)
      );
    }
  },
}));

if (typeof window !== "undefined") {
  // Eager background sync without waiting for React render cycles
  Promise.resolve().then(() => {
    useLedger.getState().initSession();
  });
}

export function openingAdjust(pocket: Pocket, target: number, current: number): Draft | null {
  const delta = target - current;
  if (delta === 0) return null;
  return {
    kind: "adjust",
    amount: delta,
    pocket,
    note: "تصحيح الرصيد",
  };
}
