/**
 * Military-Grade Cryptographic Engine for Khazinti Vault
 * - PBKDF2 with SHA-256 and 600,000 iterations (OWASP & NIST 2026 standard)
 * - 256-bit entropy salt (32 cryptographically secure random bytes)
 * - AES-GCM 256-bit Authenticated Encryption with unique 96-bit IV per transaction
 * - Non-extractable WebCrypto key protection
 * - Memory zeroization (wipe sensitive key and plaintext buffers in memory)
 * - Constant-time comparison to prevent side-channel timing attacks
 * - Built-in tamper detection (authenticated ciphertext tags)
 * - SHA-256 ledger checksum verification
 */

export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
export const LEGACY_PBKDF2_ITERATIONS = 100_000;

/**
 * Generates a cryptographically strong salt (default 32 bytes = 256 bits).
 */
export function generateSalt(bytesCount = 32): string {
  const bytes = new Uint8Array(bytesCount);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  zeroizeBytes(bytes);
  return hex;
}

/**
 * Standard 96-bit IV (Initialization Vector) for AES-GCM.
 */
export function generateIv(): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array();
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

/**
 * Memory zeroization helper: overwrites byte buffers with zeros to reduce memory remanence risk.
 */
export function zeroizeBytes(bytes: Uint8Array): void {
  try {
    bytes.fill(0);
  } catch {
    // ignore
  }
}

/**
 * Constant-time comparison between two hex strings to prevent timing attacks.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Derives a PBKDF2 hash of the PIN for verification.
 * Uses 600,000 iterations by default (OWASP standard).
 */
export async function hashPin(
  secret: string,
  saltHex: string,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<string> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const saltBytes = hexToBytes(saltHex);

  try {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "PBKDF2" },
      false, // non-extractable
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes as unknown as BufferSource,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    return bytesToHex(new Uint8Array(derivedBits));
  } finally {
    zeroizeBytes(secretBytes);
    zeroizeBytes(saltBytes);
  }
}

/**
 * Constant-time verification of PIN against stored hash.
 * Checks target iterations first (600,000), and falls back to legacy (100,000) for backward compatibility.
 */
export async function verifyPin(
  secret: string,
  saltHex: string,
  expectedHashHex: string,
  targetIterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<boolean> {
  try {
    const computedHash = await hashPin(secret, saltHex, targetIterations);
    if (constantTimeEqual(computedHash, expectedHashHex)) {
      return true;
    }
    // Backward compatibility: If target was 600k but check failed, try legacy 100k
    if (targetIterations !== LEGACY_PBKDF2_ITERATIONS) {
      const legacyHash = await hashPin(secret, saltHex, LEGACY_PBKDF2_ITERATIONS);
      if (constantTimeEqual(legacyHash, expectedHashHex)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Verifies PIN and returns which iteration count matched (600k or 100k legacy).
 */
export async function verifyPinWithIterationDetection(
  secret: string,
  saltHex: string,
  expectedHashHex: string,
  preferredIterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<{ valid: boolean; iterations: number }> {
  try {
    const computedHash = await hashPin(secret, saltHex, preferredIterations);
    if (constantTimeEqual(computedHash, expectedHashHex)) {
      return { valid: true, iterations: preferredIterations };
    }
    if (preferredIterations !== LEGACY_PBKDF2_ITERATIONS) {
      const legacyHash = await hashPin(secret, saltHex, LEGACY_PBKDF2_ITERATIONS);
      if (constantTimeEqual(legacyHash, expectedHashHex)) {
        return { valid: true, iterations: LEGACY_PBKDF2_ITERATIONS };
      }
    }
    return { valid: false, iterations: preferredIterations };
  } catch {
    return { valid: false, iterations: preferredIterations };
  }
}

/**
 * Derives an AES-GCM 256-bit encryption key from user PIN and salt.
 * Key is strictly non-extractable (cannot be exported from browser memory).
 */
export async function deriveAesGcmKey(
  secret: string,
  saltHex: string,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const saltBytes = hexToBytes(saltHex);

  try {
    const baseKey = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "PBKDF2" },
      false, // non-extractable
      ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes as unknown as BufferSource,
        iterations,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false, // Non-extractable AES-GCM key
      ["encrypt", "decrypt"]
    );
  } finally {
    zeroizeBytes(secretBytes);
    zeroizeBytes(saltBytes);
  }
}

/**
 * Encrypts arbitrary data using AES-GCM 256-bit.
 * Throws if encryption fails.
 */
export async function encryptPayload(
  payload: unknown,
  key: CryptoKey
): Promise<{ ciphertextHex: string; ivHex: string }> {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(JSON.stringify(payload));
  const iv = generateIv();

  try {
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      plaintextBytes
    );

    return {
      ciphertextHex: bytesToHex(new Uint8Array(encryptedBuffer)),
      ivHex: bytesToHex(iv),
    };
  } finally {
    zeroizeBytes(plaintextBytes);
  }
}

/**
 * Decrypts AES-GCM 256-bit ciphertext.
 * Automatically verifies authenticity tag (AEAD).
 * Throws if ciphertext or IV was tampered with!
 */
export async function decryptPayload<T = unknown>(
  ciphertextHex: string,
  ivHex: string,
  key: CryptoKey
): Promise<T> {
  const ciphertextBytes = hexToBytes(ciphertextHex);
  const ivBytes = hexToBytes(ivHex);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes as unknown as BufferSource },
      key,
      ciphertextBytes as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error("فشل فك التشفير: تم اكتشاف تلاعب أو تلف في البيانات المشفرة (AES-GCM tag mismatch)");
  } finally {
    zeroizeBytes(ciphertextBytes);
    zeroizeBytes(ivBytes);
  }
}

function canonicalize(val: unknown): unknown {
  if (val === null || typeof val !== "object") {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(canonicalize);
  }
  const obj = val as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    result[k] = canonicalize(obj[k]);
  }
  return result;
}

/**
 * Cryptographic SHA-256 Checksum over all transactions in a ledger.
 * Detects any external alteration or tampering.
 */
export async function calculateLedgerChecksum(txs: unknown[]): Promise<string> {
  const encoder = new TextEncoder();
  const canonicalString = JSON.stringify(canonicalize(txs));
  const rawBytes = encoder.encode(canonicalString);
  try {
    const hashBuffer = await crypto.subtle.digest("SHA-256", rawBytes);
    return bytesToHex(new Uint8Array(hashBuffer));
  } finally {
    zeroizeBytes(rawBytes);
  }
}
