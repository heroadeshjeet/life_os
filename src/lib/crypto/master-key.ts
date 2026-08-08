/**
 * Life_OS v2 — Master password crypto layer.
 *
 * Cryptographic design:
 *   - PBKDF2 (200,000 iterations of SHA-256) derives a 256-bit Key Encryption
 *     Key (KEK) from the user's master password.
 *   - A random 256-bit Data Encryption Key (DEK) is generated once at setup
 *     and wrapped (encrypted) with the KEK via AES-GCM.
 *   - The wrapped DEK + PBKDF2 salt are stored in plaintext — useless without
 *     the master password.
 *   - A parallel recovery-code KEK wraps the same DEK, so a forgotten password
 *     can be recovered with the 24-word code shown once at setup.
 *   - The DEK lives only in memory after unlock; it is dropped on auto-lock.
 *
 * No password, no recovery code, no email reset — by design. Any recovery path
 * is also an attack path.
 */

const PBKDF2_ITERATIONS = 200_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const RECOVERY_WORD_COUNT = 24;

// ─── Random bytes ────────────────────────────────────────────────────────────

export function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

// ─── Base64 helpers ──────────────────────────────────────────────────────────

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Key derivation ──────────────────────────────────────────────────────────

async function deriveKEK(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

// ─── DEK generation + wrapping ───────────────────────────────────────────────

async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

async function wrapDEK(
  dek: CryptoKey,
  kek: CryptoKey,
): Promise<{ iv: Uint8Array; wrapped: Uint8Array }> {
  const iv = randomBytes(IV_LENGTH);
  const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, {
    name: "AES-GCM",
    iv,
  });
  return { iv, wrapped: new Uint8Array(wrapped) };
}

async function unwrapDEK(
  wrapped: Uint8Array,
  kek: CryptoKey,
  iv: Uint8Array,
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey("raw", wrapped, kek, { name: "AES-GCM", iv }, {
    name: "AES-GCM",
    length: KEY_LENGTH,
  }, false, ["encrypt", "decrypt"]);
}

// ─── Recovery code (24-word) ────────────────────────────────────────────────

const WORDLIST = [
  "abandon","ability","able","about","above","absent","absorb","abstract","absurd","abuse","access","accident",
  "account","accuse","achieve","acid","acoustic","acquire","across","act","action","actor","actress","actual",
  "adapt","add","addict","address","adjust","admit","adult","advance","advice","aerobic","affair","afford",
  "afraid","again","age","agent","agree","ahead","aim","air","airport","aisle","alarm","album",
  "alcohol","alert","alien","all","allergy","allow","almost","alone","alpha","already","also","alter",
  "always","amateur","amazing","among","amount","amused","analyst","anchor","ancient","anger","angle","angry",
  "animal","ankle","announce","annual","another","answer","antenna","antique","anxiety","any","apart","apology",
  "appear","apple","approve","april","arch","arctic","area","arena","argue","arm","armed","armor",
  "army","around","arrange","arrest","arrive","arrow","art","artefact","artist","artwork","ask","aspect",
  "assault","asset","assist","assume","asthma","athlete","atom","attack","attend","attitude","attract","auction",
  "audit","august","aunt","author","auto","autumn","average","avocado","avoid","awake","aware","away",
  "awesome","awful","awkward","axis","baby","bachelor","bacon","badge","bag","balance","balcony","ball",
  "bamboo","banana","banner","bar","barely","bargain","barrel","base","basic","basket","battle","beach",
  "bean","beauty","because","become","beef","before","begin","behave","behind","believe","below","belt",
  "bench","benefit","best","betray","better","between","beyond","bicycle","bid","bike","bind","biology",
  "bird","birth","bitter","black","blade","blame","blanket","blast","bleak","bless","blind","blood",
  "blossom","blouse","blue","blur","blush","board","boat","body","boil","bomb","bone","bonus",
  "book","boost","border","boring","borrow","boss","bottom","bounce","box","boy","bracket","brain",
  "brand","brass","brave","bread","breeze","brick","bridge","brief","bright","bring","brisk","broccoli",
  "broken","bronze","broom","brother","brown","brush","bubble","buddy","budget","buffalo","build","bulb",
  "bulk","bullet","bundle","bunker","burden","burger","burst","bus","business","busy","butter","buyer",
];

export function generateRecoveryCode(): string[] {
  const words: string[] = [];
  const bytes = randomBytes(RECOVERY_WORD_COUNT);
  for (let i = 0; i < RECOVERY_WORD_COUNT; i++) {
    words.push(WORDLIST[bytes[i] % WORDLIST.length]);
  }
  return words;
}

function recoveryCodeToString(words: string[]): string {
  return words.join(" ");
}

// ─── Public API: setupMasterPassword ────────────────────────────────────────

export interface MasterPasswordSetup {
  salt: Uint8Array;
  iv: Uint8Array;
  wrapped_dek: Uint8Array;
  recovery_salt: Uint8Array;
  recovery_iv: Uint8Array;
  recovery_wrapped_dek: Uint8Array;
  created_at: number;
  recovery_code: string[];
}

export async function setupMasterPassword(
  password: string,
): Promise<MasterPasswordSetup> {
  const salt = randomBytes(SALT_LENGTH);
  const recoverySalt = randomBytes(SALT_LENGTH);

  const kek = await deriveKEK(password, salt);
  const dek = await generateDEK();

  // Recovery code: generate first, then derive the recovery KEK from it
  const recoveryCode = generateRecoveryCode();
  const recoveryKek = await deriveKEK(
    recoveryCodeToString(recoveryCode),
    recoverySalt,
  );

  const { iv, wrapped } = await wrapDEK(dek, kek);
  const { iv: recoveryIv, wrapped: recoveryWrapped } = await wrapDEK(dek, recoveryKek);

  return {
    salt,
    iv,
    wrapped_dek: wrapped,
    recovery_salt: recoverySalt,
    recovery_iv: recoveryIv,
    recovery_wrapped_dek: recoveryWrapped,
    created_at: Date.now(),
    recovery_code: recoveryCode,
  };
}

// ─── Public API: unlockWithPassword ─────────────────────────────────────────

export async function unlockWithPassword(
  password: string,
  setup: MasterPasswordSetup,
): Promise<CryptoKey> {
  const kek = await deriveKEK(password, setup.salt);
  try {
    return await unwrapDEK(setup.wrapped_dek, kek, setup.iv);
  } catch {
    throw new Error("Wrong password. Please try again.");
  }
}

// ─── Public API: unlockWithRecoveryCode ─────────────────────────────────────

export async function unlockWithRecoveryCode(
  recoveryWords: string[],
  setup: MasterPasswordSetup,
): Promise<CryptoKey> {
  const kek = await deriveKEK(
    recoveryCodeToString(recoveryWords),
    setup.recovery_salt,
  );
  try {
    return await unwrapDEK(setup.recovery_wrapped_dek, kek, setup.recovery_iv);
  } catch {
    throw new Error("Recovery code is incorrect.");
  }
}

// ─── Public API: encrypt / decrypt with DEK ─────────────────────────────────

export async function encryptString(
  dek: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = randomBytes(IV_LENGTH);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    dek,
    new TextEncoder().encode(plaintext),
  );
  return { ciphertext: new Uint8Array(ciphertext), iv };
}

export async function decryptString(
  dek: CryptoKey,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    dek,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}
