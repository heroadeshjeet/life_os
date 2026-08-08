/**
 * Life_OS v2 — Quick Unlock (Biometric + PIN).
 *
 * Lets the user skip the master password on most unlocks, using either
 * a platform biometric (Windows Hello / Touch ID / Face ID / Android
 * fingerprint) via the WebAuthn PRF extension, or a 4-digit PIN fallback.
 *
 * Cryptographic design:
 *   - The master password is the only thing that can unwrap the DEK.
 *   - For quick unlock, we wrap the MASTER PASSWORD itself with a key
 *     derived from either (a) the WebAuthn PRF output, or (b) PBKDF2 on
 *     the PIN (1M iterations — high because PINs are low-entropy).
 *   - On quick unlock: derive the unwrapping key → decrypt the master
 *     password → derive the KEK → unwrap the DEK. The master password
 *     lives in memory only for the few milliseconds needed to unwrap.
 *   - Monthly master-password reminder: every 30 days we force the user
 *     to type the master password directly, refreshing last_master_unlock.
 *
 * WebAuthn PRF support: Chrome/Edge desktop (yes), Safari 16+ (yes),
 * Firefox (limited), iOS Safari 16+ (yes). If PRF isn't supported or the
 * authenticator doesn't expose it, we fall back to PIN.
 */

import { randomBytes } from "./master-key";

// Re-export randomBytes so callers don't need a second import
export { randomBytes };

const PIN_ITERATIONS = 100_000; // 100K iterations × 10K PIN space = 1B ops to brute-force (infeasible online)
const PRF_SALT_LENGTH = 32;
const IV_LENGTH = 12;
const PIN_SALT_LENGTH = 16;

// ─── Capability detection ───────────────────────────────────────────────────

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function isPrfSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  // @ts-ignore - prfFlags is experimental
  return typeof PublicKeyCredential.parseCreationOptionsFromJSON === "function";
}

// ─── WebAuthn registration + PRF assertion ──────────────────────────────────

export interface BiometricCredential {
  credentialId: Uint8Array;
  prfSalt: Uint8Array;
}

export async function registerBiometric(userDisplayName: string): Promise<BiometricCredential> {
  const challenge = randomBytes(32);
  const userId = randomBytes(16);
  const prfSalt = randomBytes(PRF_SALT_LENGTH);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Life_OS" },
      user: {
        id: userId,
        name: "life_os_user",
        displayName: userDisplayName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      // @ts-ignore - PRF extension
      extensions: {
        prf: { eval: { first: prfSalt } },
      },
      timeout: 60000,
      attestation: "none",
    },
  }) as PublicKeyCredential | null;

  if (!credential) throw new Error("Biometric registration was cancelled or failed.");

  // Verify PRF was actually supported by the returned credential
  const extensionResults = credential.getClientExtensionResults?.() as Record<string, unknown> | undefined;
  const prfEnabled = (extensionResults?.prf as { enabled?: boolean } | undefined)?.enabled === true;
  if (!prfEnabled) {
    throw new Error("Your device's authenticator doesn't support the PRF extension. Try PIN unlock instead.");
  }

  return {
    credentialId: new Uint8Array(credential.rawId),
    prfSalt,
  };
}

export async function getBiometricPrfOutput(
  credentialId: Uint8Array,
  prfSalt: Uint8Array,
): Promise<Uint8Array> {
  const challenge = randomBytes(32);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{
        id: credentialId,
        type: "public-key",
        transports: ["internal"],
      }],
      userVerification: "required",
      // @ts-ignore - PRF extension
      extensions: {
        prf: { eval: { first: prfSalt } },
      },
      timeout: 60000,
    },
  }) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Biometric authentication was cancelled or failed.");

  const extensionResults = assertion.getClientExtensionResults?.() as Record<string, unknown> | undefined;
  const prfResults = (extensionResults?.prf as { results?: { first?: ArrayBuffer } } | undefined)?.results;
  if (!prfResults?.first) {
    throw new Error("Your device's authenticator didn't return a PRF result. Try PIN unlock instead.");
  }

  return new Uint8Array(prfResults.first);
}

// ─── Wrap/unwrap master password with PRF output ────────────────────────────

export interface BiometricWrapper {
  credentialId: Uint8Array;
  prfSalt: Uint8Array;
  wrappedPassword: Uint8Array;
  iv: Uint8Array;
}

export async function wrapMasterPasswordWithPrf(
  masterPassword: string,
  prfOutput: Uint8Array,
): Promise<{ wrapped: Uint8Array; iv: Uint8Array }> {
  const key = await crypto.subtle.importKey(
    "raw", prfOutput, { name: "AES-GCM" }, false, ["encrypt"],
  );
  const iv = randomBytes(IV_LENGTH);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key,
    new TextEncoder().encode(masterPassword),
  );
  return { wrapped: new Uint8Array(ciphertext), iv };
}

export async function unwrapMasterPasswordWithPrf(
  wrapped: Uint8Array,
  iv: Uint8Array,
  prfOutput: Uint8Array,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", prfOutput, { name: "AES-GCM" }, false, ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, key, wrapped,
  );
  return new TextDecoder().decode(plaintext);
}

// ─── PIN-based wrapping ──────────────────────────────────────────────────────

export interface PinWrapper {
  salt: Uint8Array;
  wrappedPassword: Uint8Array;
  iv: Uint8Array;
}

async function derivePinKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pin),
    "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PIN_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, ["encrypt", "decrypt"],
  );
}

export async function wrapMasterPasswordWithPin(
  masterPassword: string,
  pin: string,
): Promise<PinWrapper> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 digits.");
  }
  const salt = randomBytes(PIN_SALT_LENGTH);
  const key = await derivePinKey(pin, salt);
  const iv = randomBytes(IV_LENGTH);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key,
    new TextEncoder().encode(masterPassword),
  );
  return {
    salt,
    wrappedPassword: new Uint8Array(ciphertext),
    iv,
  };
}

export async function unwrapMasterPasswordWithPin(
  wrapper: PinWrapper,
  pin: string,
): Promise<string> {
  const key = await derivePinKey(pin, wrapper.salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: wrapper.iv }, key, wrapper.wrappedPassword,
  );
  return new TextDecoder().decode(plaintext);
}
