import { type Tx } from "@/lib/ledger/model";
import {
  calculateLedgerChecksum,
  deriveAesGcmKey,
  decryptPayload,
  encryptPayload,
  generateSalt,
  hashPin,
  verifyPin,
  verifyPinWithIterationDetection,
  DEFAULT_PBKDF2_ITERATIONS,
} from "./crypto";

export type VaultMeta = {
  id: string;
  name: string;
  hasPin: boolean;
  createdAt: number;
  updatedAt: number;
  integrityHash?: string;
};

export type VaultRecord = VaultMeta & {
  salt: string;
  pinHash: string; // empty string if hasPin is false
  iterations?: number;
};

export type StoredTx = {
  id: string;
  vaultId: string;
  at: number;
  isEncrypted: boolean;
  ciphertextHex?: string;
  ivHex?: string;
  raw?: Omit<Tx, "id" | "at">; // if unencrypted
};

export type VaultBackup = {
  version: 2;
  exportedAt: number;
  vault: {
    id: string;
    name: string;
    hasPin: boolean;
  };
  txs: Tx[];
  checksum: string;
};

const DB_NAME = "ZakerLocalDB";
const DB_VERSION = 2;

// Hardware & persistent rate limiting and anti-brute-force lockout
type AttemptRecord = {
  count: number;
  lockedUntil: number;
};
const lockoutMap = new Map<string, AttemptRecord>();
const LOCKOUT_KEY_PREFIX = "zaker_vault_lockout_";

function getLockoutRecord(vaultId: string): AttemptRecord {
  try {
    if (typeof localStorage !== "undefined") {
      const item = localStorage.getItem(LOCKOUT_KEY_PREFIX + vaultId);
      if (item) {
        const parsed = JSON.parse(item);
        if (typeof parsed?.count === "number" && typeof parsed?.lockedUntil === "number") {
          return parsed;
        }
      }
    }
  } catch {
    // fallback
  }
  return lockoutMap.get(vaultId) || { count: 0, lockedUntil: 0 };
}

function saveLockoutRecord(vaultId: string, record: AttemptRecord): void {
  lockoutMap.set(vaultId, record);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOCKOUT_KEY_PREFIX + vaultId, JSON.stringify(record));
    }
  } catch {
    // ignore
  }
}

export function checkLockout(vaultId: string): { isLocked: boolean; remainingSeconds: number } {
  const record = getLockoutRecord(vaultId);
  const now = Date.now();
  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }
  return { isLocked: false, remainingSeconds: 0 };
}

export function recordFailedAttempt(vaultId: string): { isLocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const record = getLockoutRecord(vaultId);
  record.count += 1;

  if (record.count >= 10) {
    // 15 minutes lockout after 10 failed attempts
    record.lockedUntil = now + 15 * 60 * 1000;
  } else if (record.count >= 7) {
    // 5 minutes lockout after 7 failed attempts
    record.lockedUntil = now + 5 * 60 * 1000;
  } else if (record.count >= 5) {
    // 60 seconds lockout after 5 failed attempts
    record.lockedUntil = now + 60 * 1000;
  } else if (record.count >= 3) {
    // 15 seconds lockout after 3 failed attempts
    record.lockedUntil = now + 15 * 1000;
  }

  saveLockoutRecord(vaultId, record);
  return checkLockout(vaultId);
}

export function clearFailedAttempts(vaultId: string) {
  lockoutMap.delete(vaultId);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LOCKOUT_KEY_PREFIX + vaultId);
    }
  } catch {
    // ignore
  }
}

/**
 * Requests the browser to grant persistent storage permission.
 * When granted, browser storage (IndexedDB & Cache) is immune to automated eviction.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log("[Khazinti Storage] Persistent storage mode:", granted ? "PERMANENT" : "BEST-EFFORT");
        return granted;
      }
      return true;
    } catch (err) {
      console.warn("[Khazinti Storage] Persistent storage request error:", err);
      return false;
    }
  }
  return false;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB غير مدعوم في هذه البيئة"));
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error("IndexedDB connection timed out (blocked or unresponsive)"));
    }, 2500);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      clearTimeout(timer);
      reject(err);
      return;
    }

    request.onblocked = () => {
      console.warn("[IndexedDB] Database open blocked by another tab/connection");
      clearTimeout(timer);
      reject(new Error("IndexedDB open blocked"));
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("vaults")) {
        db.createObjectStore("vaults", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("transactions")) {
        const txStore = db.createObjectStore("transactions", { keyPath: "id" });
        txStore.createIndex("by_vault", "vaultId", { unique: false });
        txStore.createIndex("by_at", "at", { unique: false });
      }

      if (!db.objectStoreNames.contains("session")) {
        db.createObjectStore("session", { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      clearTimeout(timer);
      const db = request.result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };

    request.onerror = () => {
      clearTimeout(timer);
      reject(request.error);
    };
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * List all available vaults on this device.
 */
export async function listVaults(): Promise<VaultMeta[]> {
  const db = await openDb();
  const tx = db.transaction("vaults", "readonly");
  const store = tx.objectStore("vaults");
  const records = await reqToPromise<VaultRecord[]>(store.getAll());
  return records.map(({ id, name, hasPin, createdAt, updatedAt, integrityHash }) => ({
    id,
    name,
    hasPin: !!hasPin,
    createdAt,
    updatedAt,
    integrityHash,
  }));
}

/**
 * Get internal vault record by ID.
 */
export async function getVaultRecord(id: string): Promise<VaultRecord | null> {
  const db = await openDb();
  const tx = db.transaction("vaults", "readonly");
  const store = tx.objectStore("vaults");
  const record = await reqToPromise<VaultRecord | undefined>(store.get(id));
  return record || null;
}

/**
 * Automatically get or create the default vault ("خزينتي الرئيسية")
 * without a forced password, so new users land on the main screen immediately!
 */
export async function getOrCreateDefaultVault(): Promise<VaultMeta> {
  const vaults = await listVaults();
  if (vaults.length > 0) {
    // Return first vault or active vault
    const activeId = await getActiveVaultSession();
    const active = vaults.find((v) => v.id === activeId);
    return active || vaults[0]!;
  }

  // Create default open vault
  const now = Date.now();
  const id = crypto.randomUUID();
  const defaultVault: VaultRecord = {
    id,
    name: "my Mouny",
    hasPin: false,
    pinHash: "",
    salt: generateSalt(32),
    createdAt: now,
    updatedAt: now,
  };

  const db = await openDb();
  const tx = db.transaction(["vaults", "session"], "readwrite");
  tx.objectStore("vaults").put(defaultVault);
  tx.objectStore("session").put({ key: "active_vault", vaultId: id, unlockedAt: now });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return {
    id,
    name: defaultVault.name,
    hasPin: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new user vault (with optional secure PIN).
 */
export async function createVault(name: string, pin?: string): Promise<{ meta: VaultMeta; key?: CryptoKey }> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("يرجى إدخال اسم الخزنة");

  const hasPin = !!(pin && pin.length >= 4);
  const salt = generateSalt(32);
  let pinHash = "";
  let key: CryptoKey | undefined = undefined;

  if (hasPin) {
    pinHash = await hashPin(pin, salt, DEFAULT_PBKDF2_ITERATIONS);
    key = await deriveAesGcmKey(pin, salt, DEFAULT_PBKDF2_ITERATIONS);
  }

  const now = Date.now();
  const id = crypto.randomUUID();

  const record: VaultRecord = {
    id,
    name: trimmedName,
    hasPin,
    pinHash,
    salt,
    iterations: hasPin ? DEFAULT_PBKDF2_ITERATIONS : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const db = await openDb();
  const tx = db.transaction(["vaults", "session"], "readwrite");
  tx.objectStore("vaults").put(record);
  tx.objectStore("session").put({ key: "active_vault", vaultId: id, unlockedAt: now });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  clearFailedAttempts(id);

  return {
    meta: {
      id,
      name: trimmedName,
      hasPin,
      createdAt: now,
      updatedAt: now,
    },
    key,
  };
}

/**
 * Set or change PIN for an existing vault, re-encrypting all transactions with AES-256-GCM.
 */
export async function setVaultPin(
  vaultId: string,
  newPin: string,
  oldKey?: CryptoKey,
  fallbackTxs?: Tx[]
): Promise<CryptoKey> {
  if (!newPin || newPin.length < 4) {
    throw new Error("يجب أن يتكون رمز المرور من 4 خانات على الأقل");
  }

  let record = await getVaultRecord(vaultId);
  if (!record) {
    // If vault record not found by ID (e.g. default-vault alias), check available vaults
    const vaults = await listVaults();
    if (vaults.length > 0) {
      record = await getVaultRecord(vaults[0].id);
      vaultId = vaults[0].id;
    }
  }
  if (!record) throw new Error("الخزنة غير موجودة");

  // Load existing transactions using old key
  let txs = await loadVaultTransactions(vaultId, oldKey);
  if (txs.length === 0 && fallbackTxs && fallbackTxs.length > 0) {
    txs = fallbackTxs;
  }

  const newSalt = generateSalt(32);
  const newPinHash = await hashPin(newPin, newSalt, DEFAULT_PBKDF2_ITERATIONS);
  const newKey = await deriveAesGcmKey(newPin, newSalt, DEFAULT_PBKDF2_ITERATIONS);

  // Update vault record
  record.hasPin = true;
  record.salt = newSalt;
  record.pinHash = newPinHash;
  record.iterations = DEFAULT_PBKDF2_ITERATIONS;
  record.updatedAt = Date.now();

  const db = await openDb();
  const tx = db.transaction(["vaults", "session"], "readwrite");
  tx.objectStore("vaults").put(record);
  tx.objectStore("session").put({ key: "active_vault", vaultId, unlockedAt: Date.now() });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Re-save transactions encrypted with new AES-GCM key
  await saveVaultTransactions(vaultId, txs, newKey);
  clearFailedAttempts(vaultId);

  return newKey;
}

/**
 * Remove PIN protection from a vault (makes it open).
 */
export async function removeVaultPin(vaultId: string, currentPin: string, currentKey?: CryptoKey): Promise<void> {
  const record = await getVaultRecord(vaultId);
  if (!record) throw new Error("الخزنة غير موجودة");

  if (record.hasPin) {
    const { valid } = await verifyPinWithIterationDetection(
      currentPin,
      record.salt,
      record.pinHash,
      record.iterations || DEFAULT_PBKDF2_ITERATIONS
    );
    if (!valid) throw new Error("رمز المرور الحالي غير صحيح");
  }

  const txs = await loadVaultTransactions(vaultId, currentKey);

  record.hasPin = false;
  record.pinHash = "";
  record.iterations = undefined;
  record.updatedAt = Date.now();

  const db = await openDb();
  const tx = db.transaction("vaults", "readwrite");
  tx.objectStore("vaults").put(record);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Save unencrypted
  await saveVaultTransactions(vaultId, txs, undefined);
}

/**
 * Verify PIN and unlock vault with brute-force rate-limiting protection.
 */
export async function unlockVault(
  vaultId: string,
  pin?: string
): Promise<{ meta: VaultMeta; key?: CryptoKey }> {
  // Check brute force lockout
  const lockout = checkLockout(vaultId);
  if (lockout.isLocked) {
    throw new Error(
      `تم قفل محاولات الدخول مؤقتاً لحماية الخزنة بسبب تكرار الرمز الخاطئ. انتظر ${lockout.remainingSeconds} ثانية.`
    );
  }

  const record = await getVaultRecord(vaultId);
  if (!record) throw new Error("الخزنة غير موجودة");

  let key: CryptoKey | undefined = undefined;

  if (record.hasPin) {
    if (!pin) throw new Error("يرجى إدخال رمز المرور لفتح هذه الخزنة");
    const { valid, iterations } = await verifyPinWithIterationDetection(
      pin,
      record.salt,
      record.pinHash,
      record.iterations || DEFAULT_PBKDF2_ITERATIONS
    );
    if (!valid) {
      const lockStatus = recordFailedAttempt(vaultId);
      if (lockStatus.isLocked) {
        throw new Error(
          `رمز المرور غير صحيح! تم قفل الدخول لمدة ${lockStatus.remainingSeconds} ثانية لحماية بياناتك.`
        );
      }
      throw new Error("رمز المرور غير صحيح! يرجى التحقق وإعادة المحاولة.");
    }
    // PIN correct -> derive AES-GCM 256-bit key using the verified iteration count
    key = await deriveAesGcmKey(pin, record.salt, iterations);
  }

  clearFailedAttempts(vaultId);

  const db = await openDb();
  const tx = db.transaction("session", "readwrite");
  tx.objectStore("session").put({ key: "active_vault", vaultId, unlockedAt: Date.now() });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return {
    meta: {
      id: record.id,
      name: record.name,
      hasPin: record.hasPin,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      integrityHash: record.integrityHash,
    },
    key,
  };
}

/**
 * Lock active vault / sign out.
 */
export async function lockActiveVault(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("session", "readwrite");
  tx.objectStore("session").delete("active_vault");
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get the currently active vault ID if still unlocked.
 */
export async function getActiveVaultSession(): Promise<string | null> {
  const db = await openDb();
  const tx = db.transaction("session", "readonly");
  const session = await reqToPromise<{ key: string; vaultId: string; unlockedAt: number } | undefined>(
    tx.objectStore("session").get("active_vault")
  );
  return session?.vaultId || null;
}

/**
 * Load all transactions for a specific isolated vault with AES-GCM decryption & tamper check.
 */
export async function loadVaultTransactions(vaultId: string, key?: CryptoKey): Promise<Tx[]> {
  const db = await openDb();
  const tx = db.transaction("transactions", "readonly");
  const index = tx.objectStore("transactions").index("by_vault");
  const stored = await reqToPromise<StoredTx[]>(index.getAll(vaultId));

  const result: Tx[] = [];

  for (const item of stored) {
    if (item.isEncrypted && item.ciphertextHex && item.ivHex) {
      if (!key) {
        // Vault is encrypted but no key provided
        continue;
      }
      try {
        const decryptedPayload = await decryptPayload<Omit<Tx, "id" | "at">>(
          item.ciphertextHex,
          item.ivHex,
          key
        );
        result.push({
          id: item.id,
          at: item.at,
          ...decryptedPayload,
        });
      } catch (err) {
        console.error(`[Security Alert] Tampered or corrupted transaction ${item.id}:`, err);
      }
    } else if (item.raw) {
      result.push({
        id: item.id,
        at: item.at,
        ...item.raw,
      });
    } else {
      // Legacy unencrypted format compatibility
      const { vaultId: _, ...legacyTx } = item as any;
      if (legacyTx.amount !== undefined) {
        result.push(legacyTx as Tx);
      }
    }
  }

  // Redundant Emergency Recovery: If IndexedDB returned empty, check local mirror
  if (result.length === 0) {
    try {
      if (typeof localStorage !== "undefined") {
        const rawMirror = localStorage.getItem(`khazinti_vault_mirror_${vaultId}`);
        if (rawMirror) {
          const mirror = JSON.parse(rawMirror);
          if (Array.isArray(mirror?.txs) && mirror.txs.length > 0) {
            console.warn(`[Khazinti Storage] Recovered ${mirror.txs.length} transactions from emergency mirror`);
            // Re-save to IDB
            await saveVaultTransactions(vaultId, mirror.txs, key);
            return mirror.txs;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return result.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/**
 * Save transactions to a vault with AES-GCM authenticated encryption & SHA-256 tamper hash.
 */
export async function saveVaultTransactions(
  vaultId: string,
  txs: Tx[],
  key?: CryptoKey
): Promise<void> {
  // 1. Prepare and pre-encrypt ALL items in memory BEFORE touching IndexedDB!
  const itemsToStore: StoredTx[] = [];
  for (const item of txs) {
    const { id, at, ...payload } = item;
    if (key) {
      const { ciphertextHex, ivHex } = await encryptPayload(payload, key);
      itemsToStore.push({
        id,
        vaultId,
        at,
        isEncrypted: true,
        ciphertextHex,
        ivHex,
      });
    } else {
      itemsToStore.push({
        id,
        vaultId,
        at,
        isEncrypted: false,
        raw: payload,
      });
    }
  }

  const checksum = await calculateLedgerChecksum(txs);

  // 2. Open IndexedDB and run existing IDs lookup FIRST
  const db = await openDb();
  const existingIds = await new Promise<string[]>((resolve, reject) => {
    const readTx = db.transaction("transactions", "readonly");
    const index = readTx.objectStore("transactions").index("by_vault");
    const req = index.getAllKeys(vaultId);
    req.onsuccess = () => resolve(((req.result as any[]) || []).map(String));
    req.onerror = () => reject(req.error);
  });

  // 3. Now open write transaction and perform atomic deletes & puts synchronously!
  const writeTx = db.transaction(["transactions", "vaults"], "readwrite");
  const txStore = writeTx.objectStore("transactions");
  for (const id of existingIds) {
    txStore.delete(id);
  }
  for (const item of itemsToStore) {
    txStore.put(item);
  }

  // Update vault timestamp and integrity
  const vaultStore = writeTx.objectStore("vaults");
  const vReq = vaultStore.get(vaultId);
  vReq.onsuccess = () => {
    const vault = vReq.result as VaultRecord | undefined;
    if (vault) {
      vault.updatedAt = Date.now();
      vault.integrityHash = checksum;
      vaultStore.put(vault);
    }
  };

  await new Promise<void>((resolve, reject) => {
    writeTx.oncomplete = () => resolve();
    writeTx.onerror = () => reject(writeTx.error);
    writeTx.onabort = () => reject(writeTx.error || new Error("IDB write transaction aborted"));
  });

  // 4. Redundant Emergency Mirror Snapshot in localStorage (Never-Lost Guarantee)
  try {
    if (typeof localStorage !== "undefined") {
      const mirrorPayload = {
        vaultId,
        savedAt: Date.now(),
        txs,
      };
      localStorage.setItem(`khazinti_vault_mirror_${vaultId}`, JSON.stringify(mirrorPayload));
    }
  } catch {
    // ignore quota issues on massive ledgers
  }
}

/**
 * Reset all transactions for a vault.
 */
export async function clearVaultTransactions(vaultId: string, key?: CryptoKey): Promise<void> {
  await saveVaultTransactions(vaultId, [], key);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(`khazinti_vault_mirror_${vaultId}`);
    }
  } catch {
    // ignore
  }
}

/**
 * Delete a vault completely and all its transactions.
 */
export async function deleteVault(vaultId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["vaults", "transactions", "session"], "readwrite");
  tx.objectStore("vaults").delete(vaultId);

  const txStore = tx.objectStore("transactions");
  const index = txStore.index("by_vault");
  const stored = await reqToPromise<StoredTx[]>(index.getAll(vaultId));
  for (const item of stored) {
    txStore.delete(item.id);
  }

  const session = await reqToPromise<{ key: string; vaultId: string } | undefined>(
    tx.objectStore("session").get("active_vault")
  );
  if (session && session.vaultId === vaultId) {
    tx.objectStore("session").delete("active_vault");
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(`khazinti_vault_mirror_${vaultId}`);
    }
  } catch {
    // ignore
  }
}

/**
 * Delete a vault permanently after verifying its PIN.
 * Fails if it is the only remaining vault or if the PIN does not match.
 */
export async function deleteVaultWithPin(vaultId: string, pin?: string): Promise<void> {
  const vaults = await listVaults();
  if (vaults.length <= 1) {
    throw new Error("لا يمكن حذف الخزنة الوحيدة المتبقية في التطبيق");
  }

  const record = await getVaultRecord(vaultId);
  if (!record) {
    throw new Error("الخزنة غير موجودة");
  }

  // If vault has a PIN, verify it strictly
  if (record.hasPin) {
    if (!pin) {
      throw new Error("يرجى إدخال كلمة مرور (PIN) الخزنة لتأكيد الحذف");
    }
    const { valid } = await verifyPinWithIterationDetection(
      pin,
      record.salt,
      record.pinHash,
      record.iterations || DEFAULT_PBKDF2_ITERATIONS
    );
    if (!valid) {
      throw new Error("كلمة المرور غير صحيحة! لا يمكن حذف الخزنة إلا بكلمة المرور الخاصة بها.");
    }
  }

  // PIN is valid or vault had no PIN -> delete vault and clean storage
  await deleteVault(vaultId);
}

/**
 * Export vault backup.
 */
export async function exportVaultBackup(vaultId: string, key?: CryptoKey): Promise<VaultBackup> {
  const meta = await getVaultRecord(vaultId);
  if (!meta) throw new Error("الخزنة غير موجودة");

  const txs = await loadVaultTransactions(vaultId, key);
  const now = Date.now();
  const checksum = await calculateLedgerChecksum(txs);

  return {
    version: 2,
    exportedAt: now,
    vault: {
      id: meta.id,
      name: meta.name,
      hasPin: meta.hasPin,
    },
    txs,
    checksum,
  };
}

/**
 * Import vault backup from JSON string.
 */
export async function importVaultBackup(
  backupText: string,
  newPin?: string
): Promise<{ meta: VaultMeta; key?: CryptoKey }> {
  let data: any;
  try {
    data = JSON.parse(backupText);
  } catch {
    throw new Error("ملف النسخة الاحتياطية غير صالح أو تالف");
  }

  if (!data.vault || !Array.isArray(data.txs)) {
    throw new Error("تنسيق النسخة الاحتياطية غير متوافق");
  }

  const hasPin = !!(newPin && newPin.length >= 4);
  const salt = generateSalt(32);
  let pinHash = "";
  let key: CryptoKey | undefined = undefined;

  if (hasPin) {
    pinHash = await hashPin(newPin, salt, DEFAULT_PBKDF2_ITERATIONS);
    key = await deriveAesGcmKey(newPin, salt, DEFAULT_PBKDF2_ITERATIONS);
  }

  const now = Date.now();
  const newVaultId = crypto.randomUUID();

  const record: VaultRecord = {
    id: newVaultId,
    name: `${data.vault.name || "خزنة"} (مستوردة)`,
    hasPin,
    pinHash,
    salt,
    iterations: hasPin ? DEFAULT_PBKDF2_ITERATIONS : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const db = await openDb();
  const tx = db.transaction(["vaults", "session"], "readwrite");
  tx.objectStore("vaults").put(record);
  tx.objectStore("session").put({ key: "active_vault", vaultId: newVaultId, unlockedAt: now });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Save imported transactions
  await saveVaultTransactions(newVaultId, data.txs, key);

  return {
    meta: {
      id: newVaultId,
      name: record.name,
      hasPin,
      createdAt: now,
      updatedAt: now,
    },
    key,
  };
}

/**
 * Migration helper for legacy local storage.
 */
export async function checkAndMigrateLegacyLocalStorage(): Promise<boolean> {
  if (typeof window === "undefined" || !window.localStorage) return false;

  const raw = localStorage.getItem("khazinti-ledger");
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);
    const txs: Tx[] = parsed?.state?.txs || [];
    if (!Array.isArray(txs) || txs.length === 0) return false;

    const vaults = await listVaults();
    if (vaults.length > 0) return false;

    const now = Date.now();
    const vaultId = crypto.randomUUID();

    const record: VaultRecord = {
      id: vaultId,
      name: "خزينتي الأساسية",
      hasPin: false,
      pinHash: "",
      salt: generateSalt(32),
      createdAt: now,
      updatedAt: now,
    };

    const db = await openDb();
    const tx = db.transaction(["vaults", "session"], "readwrite");
    tx.objectStore("vaults").put(record);
    tx.objectStore("session").put({ key: "active_vault", vaultId, unlockedAt: now });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    await saveVaultTransactions(vaultId, txs, undefined);
    return true;
  } catch (err) {
    console.warn("[Migration] تعذر استيراد البيانات السابقة:", err);
    return false;
  }
}
