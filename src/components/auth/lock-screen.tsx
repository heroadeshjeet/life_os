"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Lock, Eye, EyeOff, AlertCircle, Fingerprint, ChevronRight,
  CalendarClock, ShieldCheck, KeyRound,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { unlockWithRecoveryCode } from "@/lib/crypto/master-key";

export function LockScreen() {
  const unlock = useAuthStore((s) => s.unlock);
  const unlockWithBiometric = useAuthStore((s) => s.unlockWithBiometric);
  const unlockWithPin = useAuthStore((s) => s.unlockWithPin);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const profile = useAuthStore((s) => s.profile);
  const biometricSupported = useAuthStore((s) => s.biometricSupported);
  const status = useAuthStore((s) => s.status);

  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");
  const [showMaster, setShowMaster] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  const quickUnlock = profile?.auth?.quick_unlock;
  const isMonthlyReminder = status === "monthly-reminder";

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Auto-try biometric on mount if it's the configured method
  useEffect(() => {
    if (status !== "locked") return;
    if (quickUnlock?.method !== "biometric") return;
    // Auto-trigger after a short delay so the user sees the UI first
    const timer = setTimeout(() => {
      setBusy(true);
      clearError();
      unlockWithBiometric().finally(() => setBusy(false));
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    await unlock(password);
    setBusy(false);
  }

  async function handleBiometric() {
    setBusy(true);
    clearError();
    await unlockWithBiometric();
    setBusy(false);
  }

  async function handlePin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setBusy(true);
    await unlockWithPin(pin);
    setBusy(false);
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!recoveryCode.trim() || !profile?.auth) return;
    setBusy(true);
    clearError();
    try {
      const words = recoveryCode.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const dek = await unlockWithRecoveryCode(words, profile.auth);
      // Also refresh last_master_unlock
      const updatedProfile = {
        ...profile,
        auth: { ...profile.auth, last_master_unlock: Date.now() },
      };
      const { db } = await import("@/lib/db/life-os-db");
      await db.user_profile.put(updatedProfile);
      useAuthStore.setState({
        status: "unlocked",
        dek,
        profile: updatedProfile,
        error: null,
        lastActivity: Date.now(),
      });
    } catch {
      set({ error: "Recovery code is incorrect." });
    } finally {
      setBusy(false);
    }
  }

  function set(patch: Partial<{ error: string }>) {
    useAuthStore.setState(patch);
  }

  function onPinChange(v: string) {
    const cleaned = v.replace(/\D/g, "").slice(0, 4);
    setPin(cleaned);
    if (error) clearError();
    if (cleaned.length === 4) {
      // Auto-submit on 4 digits
      setTimeout(() => {
        const evt = new Event("submit", { bubbles: true, cancelable: true });
        (document.getElementById("pin-form") as HTMLFormElement | null)?.dispatchEvent(evt);
      }, 100);
    }
  }

  // ─── Monthly reminder variant ────────────────────────────────────────────
  if (isMonthlyReminder) {
    return (
      <MonthlyReminderScreen
        password={password}
        setPassword={setPassword}
        showPw={showPw}
        setShowPw={setShowPw}
        busy={busy}
        error={error}
        onSubmit={handleUnlock}
      />
    );
  }

  // ─── Standard lock screen ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-amber-50 dark:to-amber-950/20 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 ring-4 ring-amber-50 dark:ring-amber-950/30">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {profile?.name ? `Hi, ${profile.name}. ` : ""}Unlock to continue.
            </p>
          </div>
        </div>

        {/* Quick unlock options */}
        {quickUnlock && !showMaster && !showPin && (
          <div className="space-y-3">
            {quickUnlock.method === "biometric" && (
              <Button
                className="w-full h-14 gap-3 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleBiometric}
                disabled={busy}
              >
                <Fingerprint className="h-6 w-6" />
                <div className="text-left">
                  <div className="text-sm font-semibold">{busy ? "Authenticating..." : "Use biometric"}</div>
                  <div className="text-[10px] opacity-80">Touch / look at your device</div>
                </div>
              </Button>
            )}

            {quickUnlock.method === "pin" && (
              <Button
                variant="outline"
                className="w-full h-14 gap-3"
                onClick={() => setShowPin(true)}
              >
                <Lock className="h-5 w-5 text-amber-600" />
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">Use PIN</div>
                  <div className="text-[10px] text-muted-foreground">4-digit quick unlock</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button variant="ghost" className="w-full" onClick={() => setShowMaster(true)}>
              Use master password
            </Button>
          </div>
        )}

        {/* PIN entry */}
        {quickUnlock?.method === "pin" && showPin && !showMaster && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Enter PIN
              </CardTitle>
              <CardDescription>4-digit quick unlock.</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="pin-form" onSubmit={handlePin} className="space-y-3">
                <Input
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => onPinChange(e.target.value)}
                  placeholder="••••"
                  className="text-center text-3xl tracking-[0.5em] h-16"
                  autoFocus
                />
                {error && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={busy || pin.length !== 4}>
                  {busy ? "Unlocking..." : "Unlock"}
                </Button>
                <Button variant="ghost" className="w-full text-xs" onClick={() => { setShowPin(false); clearError(); setPin(""); }}>
                  Use master password instead
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Master password entry */}
        {(showMaster || !quickUnlock) && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Master password</CardTitle>
              <CardDescription>
                Your data stays encrypted until you unlock.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unlock-pw">Master password</Label>
                  <div className="relative">
                    <Input
                      id="unlock-pw"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) clearError();
                      }}
                      placeholder="Enter password"
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={busy || !password}>
                  {busy ? "Unlocking..." : "Unlock"}
                </Button>
                {quickUnlock && (
                  <Button variant="ghost" className="w-full text-xs" onClick={() => { setShowMaster(false); clearError(); setPassword(""); }}>
                    {quickUnlock.method === "biometric" && biometricSupported
                      ? "Use biometric instead"
                      : quickUnlock.method === "pin"
                      ? "Use PIN instead"
                      : "Back"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Forgot your password?{" "}
          <button
            className="text-amber-600 dark:text-amber-400 underline hover:no-underline"
            onClick={() => { setShowRecovery(!showRecovery); clearError(); }}
          >
            {showRecovery ? "Use password instead" : "Use recovery code"}
          </button>
        </p>

        {/* Recovery code entry */}
        {showRecovery && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Recovery code
              </CardTitle>
              <CardDescription>
                Enter the 24-word code you saved at setup. Words can be separated by spaces or newlines.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecovery} className="space-y-3">
                <textarea
                  value={recoveryCode}
                  onChange={(e) => {
                    setRecoveryCode(e.target.value);
                    if (error) clearError();
                  }}
                  placeholder="word1 word2 word3 ..."
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  rows={3}
                  autoFocus
                />
                {error && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={busy || !recoveryCode.trim()}>
                  {busy ? "Unlocking..." : "Unlock with recovery code"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-[10px] text-center text-muted-foreground/60">
          © Adeshjeet_official
        </p>
      </div>
    </div>
  );
}

// ─── Monthly reminder variant ────────────────────────────────────────────────

function MonthlyReminderScreen({
  password, setPassword, showPw, setShowPw, busy, error, onSubmit,
}: {
  password: string;
  setPassword: (v: string) => void;
  showPw: boolean;
  setShowPw: (v: boolean) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-background to-rose-50 dark:from-amber-950/20 dark:via-background dark:to-rose-950/20 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 ring-4 ring-amber-50 dark:ring-amber-950/30">
            <CalendarClock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Monthly check-in</h1>
            <p className="text-sm text-muted-foreground mt-1">
              For security, please re-enter your master password.
            </p>
          </div>
        </div>

        <Card className="border-amber-300 dark:border-amber-900/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              Master password required
            </CardTitle>
            <CardDescription>
              It&apos;s been over 30 days since you entered your master password.
              After this, you can go back to quick unlock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthly-pw">Master password</Label>
                <div className="relative">
                  <Input
                    id="monthly-pw"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter master password"
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={busy || !password}>
                {busy ? "Unlocking..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          This keeps your data safe — even if someone learns your PIN,
          they can&apos;t access your data without the master password every 30 days.
        </p>
        <p className="text-[10px] text-center text-muted-foreground/60">
          © Adeshjeet_official
        </p>
      </div>
    </div>
  );
}
