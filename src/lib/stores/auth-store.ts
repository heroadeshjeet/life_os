/**
 * Life_OS v2 — Auth store (Zustand).
 *
 * Holds the unlocked DEK in memory ONLY. On auto-lock or explicit lock,
 * the DEK reference is dropped, requiring the user to re-unlock.
 *
 * Unlock priority:
 *   1. If monthly master reminder is due (>30 days since last master unlock):
 *      force master password entry, refresh last_master_unlock.
 *   2. Else if quick_unlock.method === 'biometric': WebAuthn PRF.
 *   3. Else if quick_unlock.method === 'pin': 4-digit PIN.
 *   4. Else: master password.
 */
"use client";

import { create } from "zustand";
import { db, type UserProfile } from "@/lib/db/life-os-db";
import {
  setupMasterPassword, unlockWithPassword,
  type MasterPasswordSetup,
} from "@/lib/crypto/master-key";
import {
  isBiometricSupported, registerBiometric, getBiometricPrfOutput,
  wrapMasterPasswordWithPrf, unwrapMasterPasswordWithPrf,
  wrapMasterPasswordWithPin, unwrapMasterPasswordWithPin,
  type BiometricWrapper, type PinWrapper,
} from "@/lib/crypto/quick-unlock";

type AuthStatus =
  | "loading"
  | "needs-setup"
  | "locked"
  | "monthly-reminder"  // quick unlock configured but >30 days since master
  | "unlocked";

const MONTHLY_REMINDER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AuthState {
  status: AuthStatus;
  dek: CryptoKey | null;
  profile: UserProfile | null;
  error: string | null;
  lastActivity: number;
  biometricSupported: boolean;
  setupInProgress: boolean;

  init: () => Promise<void>;
  setup: (password: string) => Promise<string[] | null>;
  completeSetup: () => void;
  unlock: (password: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  skipMonthlyReminder: () => void; // user can defer once
  lock: () => void;
  touchActivity: () => void;
  checkAutoLock: () => void;
  clearError: () => void;
  enableBiometric: (masterPassword: string) => Promise<boolean>;
  enablePin: (masterPassword: string, pin: string) => Promise<boolean>;
  disableQuickUnlock: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<UserProfile, "name" | "age" | "avatar_emoji" | "preferences">>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  dek: null,
  profile: null,
  error: null,
  lastActivity: Date.now(),
  biometricSupported: false,
  setupInProgress: false,

  init: async () => {
    try {
      const profile = await db.user_profile.get("single");
      const bio = await isBiometricSupported();
      if (!profile || !profile.auth) {
        set({ status: "needs-setup", profile: null, biometricSupported: bio });
        return;
      }
      // Apply dark/light mode on load
      const themeMode = profile.preferences.theme ?? "system";
      const root = document.documentElement;
      if (themeMode === "dark") root.classList.add("dark");
      else if (themeMode === "light") root.classList.remove("dark");
      else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark);
      }
      // Check if monthly reminder is due
      const lastMaster = profile.auth.last_master_unlock ?? profile.auth.created_at;
      const reminderDue = Date.now() - lastMaster > MONTHLY_REMINDER_MS;
      const hasQuickUnlock = !!profile.auth.quick_unlock;
      set({
        status: reminderDue && hasQuickUnlock ? "monthly-reminder" : "locked",
        profile,
        biometricSupported: bio,
      });
    } catch (err) {
      console.error("[auth] init failed:", err);
      set({ status: "needs-setup", error: String(err) });
    }
  },

  setup: async (password: string) => {
    try {
      const setupResult: MasterPasswordSetup = await setupMasterPassword(password);
      const recoveryCode = setupResult.recovery_code;

      const profile: UserProfile = {
        id: "single",
        name: "Friend",
        age: null,
        avatar_emoji: "🌱",
        joined_at: Date.now(),
        preferences: {
          theme: "system",
          theme_id: "default",
          nav_position: "auto",
          accent_color: "#92751f",
          auto_lock_minutes: 5,
          daily_water_goal_ml: 2500,
          sound_enabled: true,
          haptics_enabled: true,
          animation_intensity: "full",
        },
        auth: {
          salt: setupResult.salt,
          iv: setupResult.iv,
          wrapped_dek: setupResult.wrapped_dek,
          recovery_salt: setupResult.recovery_salt,
          recovery_iv: setupResult.recovery_iv,
          recovery_wrapped_dek: setupResult.recovery_wrapped_dek,
          created_at: setupResult.created_at,
          last_master_unlock: Date.now(),
          quick_unlock: null,
        },
      };

      await db.user_profile.put(profile);

      const dek = await unlockWithPassword(password, profile.auth);
      set({
        status: "unlocked",
        dek,
        profile,
        error: null,
        lastActivity: Date.now(),
        setupInProgress: true, // keep showing SetupScreen until user completes recovery + quick-unlock
      });

      return recoveryCode;
    } catch (err) {
      console.error("[auth] setup failed:", err);
      set({ error: String(err) });
      return null;
    }
  },

  completeSetup: () => {
    set({ setupInProgress: false });
  },

  unlock: async (password: string) => {
    const { profile } = get();
    if (!profile?.auth) {
      set({ error: "No master password is set up." });
      return false;
    }
    try {
      const dek = await unlockWithPassword(password, profile.auth);
      // Refresh last_master_unlock
      const updatedProfile = {
        ...profile,
        auth: { ...profile.auth, last_master_unlock: Date.now() },
      };
      await db.user_profile.put(updatedProfile);
      set({
        status: "unlocked",
        dek,
        profile: updatedProfile,
        error: null,
        lastActivity: Date.now(),
      });
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Unlock failed." });
      return false;
    }
  },

  unlockWithBiometric: async () => {
    const { profile } = get();
    if (!profile?.auth?.quick_unlock || profile.auth.quick_unlock.method !== "biometric") {
      set({ error: "Biometric unlock is not configured." });
      return false;
    }
    const q = profile.auth.quick_unlock;
    if (!q.biometric_credential_id || !q.biometric_prf_salt || !q.biometric_wrapped_password || !q.biometric_iv) {
      set({ error: "Biometric unlock is incompletely configured." });
      return false;
    }
    try {
      const prfOutput = await getBiometricPrfOutput(q.biometric_credential_id, q.biometric_prf_salt);
      const masterPassword = await unwrapMasterPasswordWithPrf(
        q.biometric_wrapped_password, q.biometric_iv, prfOutput,
      );
      const dek = await unlockWithPassword(masterPassword, profile.auth);
      set({
        status: "unlocked",
        dek,
        error: null,
        lastActivity: Date.now(),
      });
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Biometric unlock failed." });
      return false;
    }
  },

  unlockWithPin: async (pin: string) => {
    const { profile } = get();
    if (!profile?.auth?.quick_unlock || profile.auth.quick_unlock.method !== "pin") {
      set({ error: "PIN unlock is not configured." });
      return false;
    }
    const q = profile.auth.quick_unlock;
    if (!q.pin_salt || !q.pin_wrapped_password || !q.pin_iv) {
      set({ error: "PIN unlock is incompletely configured." });
      return false;
    }
    try {
      const wrapper: PinWrapper = {
        salt: q.pin_salt,
        wrappedPassword: q.pin_wrapped_password,
        iv: q.pin_iv,
      };
      const masterPassword = await unwrapMasterPasswordWithPin(wrapper, pin);
      const dek = await unlockWithPassword(masterPassword, profile.auth);
      set({
        status: "unlocked",
        dek,
        error: null,
        lastActivity: Date.now(),
      });
      return true;
    } catch (err) {
      set({ error: "Wrong PIN. Please try again." });
      return false;
    }
  },

  skipMonthlyReminder: () => {
    set({ status: "locked" });
  },

  lock: () => {
    set({ status: "locked", dek: null, error: null });
  },

  touchActivity: () => {
    set({ lastActivity: Date.now() });
  },

  checkAutoLock: () => {
    const { status, lastActivity, profile } = get();
    if (status !== "unlocked") return;
    const minutes = profile?.preferences.auto_lock_minutes ?? 5;
    const timeout = minutes * 60 * 1000;
    if (Date.now() - lastActivity > timeout) {
      get().lock();
    }
  },

  clearError: () => set({ error: null }),

  enableBiometric: async (masterPassword: string) => {
    const { profile } = get();
    if (!profile?.auth) return false;
    try {
      // Verify master password first
      await unlockWithPassword(masterPassword, profile.auth);
      // Register biometric
      const cred = await registerBiometric(profile.name || "Life_OS user");
      // Get PRF output for the first time
      const prfOutput = await getBiometricPrfOutput(cred.credentialId, cred.prfSalt);
      // Wrap the master password
      const { wrapped, iv } = await wrapMasterPasswordWithPrf(masterPassword, prfOutput);
      // Save
      const updatedProfile: UserProfile = {
        ...profile,
        auth: {
          ...profile.auth,
          quick_unlock: {
            method: "biometric",
            biometric_credential_id: cred.credentialId,
            biometric_prf_salt: cred.prfSalt,
            biometric_wrapped_password: wrapped,
            biometric_iv: iv,
          },
        },
      };
      await db.user_profile.put(updatedProfile);
      set({ profile: updatedProfile });
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to enable biometric." });
      return false;
    }
  },

  enablePin: async (masterPassword: string, pin: string) => {
    const { profile } = get();
    if (!profile?.auth) return false;
    try {
      // Verify master password
      await unlockWithPassword(masterPassword, profile.auth);
      // Wrap
      const wrapper = await wrapMasterPasswordWithPin(masterPassword, pin);
      const updatedProfile: UserProfile = {
        ...profile,
        auth: {
          ...profile.auth,
          quick_unlock: {
            method: "pin",
            pin_salt: wrapper.salt,
            pin_wrapped_password: wrapper.wrappedPassword,
            pin_iv: wrapper.iv,
          },
        },
      };
      await db.user_profile.put(updatedProfile);
      set({ profile: updatedProfile });
      return true;
    } catch (err) {
      console.error("[auth] enablePin failed:", err);
      set({ error: err instanceof Error ? err.message : "Failed to enable PIN." });
      return false;
    }
  },

  disableQuickUnlock: async () => {
    const { profile } = get();
    if (!profile?.auth) return;
    const updatedProfile: UserProfile = {
      ...profile,
      auth: { ...profile.auth, quick_unlock: null },
    };
    await db.user_profile.put(updatedProfile);
    set({ profile: updatedProfile });
  },

  updateProfile: async (patch) => {
    const { profile } = get();
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      ...patch,
      preferences: { ...profile.preferences, ...(patch.preferences ?? {}) },
    };
    await db.user_profile.put(updated);
    set({ profile: updated });
  },
}));
