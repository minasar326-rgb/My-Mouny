import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateLedgerChecksum,
  constantTimeEqual,
  decryptPayload,
  deriveAesGcmKey,
  encryptPayload,
  generateSalt,
  hashPin,
  verifyPin,
  verifyPinWithIterationDetection,
  zeroizeBytes,
  DEFAULT_PBKDF2_ITERATIONS,
  LEGACY_PBKDF2_ITERATIONS,
} from "./crypto.ts";

test("Crypto: 256-bit Salt generation and PBKDF2 PIN hashing (600,000 iterations)", async () => {
  const salt = generateSalt(32);
  assert.equal(typeof salt, "string");
  assert.equal(salt.length, 64); // 32 bytes = 256 bits = 64 hex chars

  const pin = "1234";
  const pinHash = await hashPin(pin, salt, DEFAULT_PBKDF2_ITERATIONS);
  assert.equal(typeof pinHash, "string");
  assert.equal(pinHash.length, 64); // SHA-256 = 32 bytes = 64 hex chars

  // Constant-time verification
  const valid = await verifyPin(pin, salt, pinHash, DEFAULT_PBKDF2_ITERATIONS);
  assert.equal(valid, true);

  const invalid = await verifyPin("9999", salt, pinHash, DEFAULT_PBKDF2_ITERATIONS);
  assert.equal(invalid, false);
});

test("Crypto: Backward compatibility with legacy 100,000-iteration vaults", async () => {
  const salt = generateSalt(16); // legacy 16-byte salt
  assert.equal(salt.length, 32);

  const pin = "5678";
  // Hash with legacy 100k iterations
  const legacyHash = await hashPin(pin, salt, LEGACY_PBKDF2_ITERATIONS);

  // verifyPin should seamlessly verify legacy vaults
  const validLegacy = await verifyPin(pin, salt, legacyHash, DEFAULT_PBKDF2_ITERATIONS);
  assert.equal(validLegacy, true);

  // verifyPinWithIterationDetection should identify that 100,000 iterations matched
  const detected = await verifyPinWithIterationDetection(pin, salt, legacyHash, DEFAULT_PBKDF2_ITERATIONS);
  assert.equal(detected.valid, true);
  assert.equal(detected.iterations, LEGACY_PBKDF2_ITERATIONS);
});

test("Crypto: Constant-time comparison & memory zeroization", () => {
  assert.equal(constantTimeEqual("abcdef", "abcdef"), true);
  assert.equal(constantTimeEqual("abcdef", "abcdeg"), false);
  assert.equal(constantTimeEqual("short", "longerstring"), false);

  const sensitiveBuffer = new Uint8Array([1, 2, 3, 4, 5, 255]);
  zeroizeBytes(sensitiveBuffer);
  assert.deepEqual(sensitiveBuffer, new Uint8Array([0, 0, 0, 0, 0, 0]));
});

test("Crypto: AES-256-GCM encryption, decryption, and tamper detection", async () => {
  const salt = generateSalt();
  const pin = "SecurePIN!#99";

  const key = await deriveAesGcmKey(pin, salt);
  assert.ok(key);

  const testPayload = {
    amount: 15000,
    kind: "purchase",
    pocket: "cash",
    note: "Supermarket shopping",
  };

  // Encrypt payload
  const { ciphertextHex, ivHex } = await encryptPayload(testPayload, key);
  assert.ok(ciphertextHex);
  assert.ok(ivHex);

  // Decrypt payload
  const decrypted = await decryptPayload<typeof testPayload>(ciphertextHex, ivHex, key);
  assert.deepEqual(decrypted, testPayload);

  // Tamper detection: modifying 1 character in ciphertext must cause decryption to fail
  const tamperedCiphertext =
    ciphertextHex.slice(0, -2) + (ciphertextHex.slice(-2) === "aa" ? "bb" : "aa");
  await assert.rejects(
    async () => {
      await decryptPayload(tamperedCiphertext, ivHex, key);
    },
    /فشل فك التشفير|tag mismatch|operation failed/i
  );
});

test("Crypto: Ledger integrity checksum", async () => {
  const txs = [
    { id: "tx-1", at: 1000, kind: "income", amount: 50000, pocket: "bank", note: "Salary" },
    { id: "tx-2", at: 2000, kind: "purchase", amount: 2000, pocket: "bank", note: "Coffee" },
  ];

  const checksum1 = await calculateLedgerChecksum(txs as any);
  assert.equal(typeof checksum1, "string");
  assert.equal(checksum1.length, 64);

  // Same txs produces same checksum
  const checksum2 = await calculateLedgerChecksum([...txs] as any);
  assert.equal(checksum1, checksum2);

  // Altered tx produces different checksum
  const alteredTxs = [
    { id: "tx-1", at: 1000, kind: "income", amount: 50001, pocket: "bank", note: "Salary" },
    { id: "tx-2", at: 2000, kind: "purchase", amount: 2000, pocket: "bank", note: "Coffee" },
  ];
  const checksum3 = await calculateLedgerChecksum(alteredTxs as any);
  assert.notEqual(checksum1, checksum3);
});
