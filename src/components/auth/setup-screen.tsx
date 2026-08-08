"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Eye, EyeOff, ShieldCheck, KeyRound, AlertTriangle,
  Copy, Check, Fingerprint, Lock as LockIcon, SkipForward,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";

export function SetupScreen() {
  const setup = useAuthStore((s) => s.setup);
  const enableBiometric = useAuthStore((s) => s.enableBiometric);
  const enablePin = useAuthStore((s) => s.enablePin);
  const biometricSupported = useAuthStore((s) => s.biometricSupported);
  const completeSetup = useAuthStore((s) => s.completeSetup);
  const error = useAuthStore((s) => s.error);

  const [step, setStep] = useState<"password" | "recovery" | "quick-unlock" | "done">("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  // Quick unlock setup
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);

  async function handleSetPassword() {
    if (password.length < 8) return;
    if (password !== confirm) return;
    setBusy(true);
    const code = await setup(password);
    setBusy(false);
    if (code) {
      setRecoveryCode(code);
      setStep("recovery");
    }
  }

  function handleContinue() {
    setStep("quick-unlock");
  }

  function copyCode() {
    navigator.clipboard.writeText(recoveryCode.join(" "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleEnableBiometric() {
    setQuickBusy(true);
    const ok = await enableBiometric(password);
    setQuickBusy(false);
    if (ok) {
      toast.success("Biometric unlock enabled");
      completeSetup();
    }
  }

  async function handleEnablePin() {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    if (pin !== pinConfirm) {
      toast.error("PINs don't match");
      return;
    }
    setQuickBusy(true);
    const ok = await enablePin(password, pin);
    setQuickBusy(false);
    if (ok) {
      toast.success("PIN unlock enabled");
      completeSetup();
    }
  }

  function skipQuickUnlock() {
    completeSetup();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-background to-rose-50 dark:from-amber-950/20 dark:via-background dark:to-rose-950/20 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <Sparkles className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Life_OS</h1>
          <p className="text-sm text-muted-foreground">
            Your private life-management companion. Let&apos;s set up your master password.
          </p>
        </div>

        {step === "password" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-5 w-5 text-amber-600" />
                Create your master password
              </CardTitle>
              <CardDescription>
                This single password unlocks your journal, finances, vault, and everything else.
                Choose something memorable — there is no email reset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">Master password</Label>
                <div className="relative">
                  <Input
                    id="pw"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pr-10"
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
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type it again"
                />
              </div>

              {password && password.length < 8 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Password should be at least 8 characters.
                </p>
              )}
              {password && confirm && password !== confirm && (
                <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
              )}
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <Button
                className="w-full"
                onClick={handleSetPassword}
                disabled={busy || password.length < 8 || password !== confirm}
              >
                {busy ? "Encrypting..." : "Continue"}
              </Button>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      Your data is encrypted on this device
                    </p>
                    <p className="text-amber-800 dark:text-amber-200 mt-1">
                      We use PBKDF2 (200,000 iterations) + AES-GCM. Nothing leaves your browser.
                      If you forget the password, the data is gone — so we&apos;ll show you a
                      recovery code next.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "recovery" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Save your recovery code
              </CardTitle>
              <CardDescription>
                This 24-word code is your <span className="font-semibold">only</span> way back
                into your data if you forget the master password. Write it down on paper and
                store it somewhere safe. We will never show it again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="grid grid-cols-3 gap-2 text-sm font-mono">
                  {recoveryCode.map((word, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <span className="font-medium">{word}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={copyCode}>
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy code"}
                </Button>
                <Button className="flex-1" onClick={handleContinue}>
                  I&apos;ve saved it
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Take your time. Once you click &quot;I&apos;ve saved it&quot;, this code is gone forever.
              </p>
            </CardContent>
          </Card>
        )}

        {step === "quick-unlock" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Fingerprint className="h-5 w-5 text-amber-600" />
                Enable quick unlock?
              </CardTitle>
              <CardDescription>
                Skip the long master password on most days. We&apos;ll still ask for it
                once a month for security.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {biometricSupported && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-14"
                    onClick={handleEnableBiometric}
                    disabled={quickBusy}
                  >
                    <Fingerprint className="h-5 w-5 text-emerald-600" />
                    <div className="text-left flex-1">
                      <div className="text-sm font-semibold">Use biometric</div>
                      <div className="text-xs text-muted-foreground">
                        Windows Hello · Touch ID · Face ID · Fingerprint
                      </div>
                    </div>
                  </Button>
                </div>
              )}

                <div className="space-y-2">
                  <Label htmlFor="setup-pin">Or set a 4-digit PIN</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="setup-pin"
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      className="text-center text-lg tracking-widest"
                    />
                    <Input
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      value={pinConfirm}
                      onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="confirm"
                      className="text-center text-lg tracking-widest"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={handleEnablePin}
                    disabled={quickBusy || pin.length !== 4 || pin !== pinConfirm}
                  >
                    <LockIcon className="h-4 w-4" />
                    {quickBusy ? "Setting up..." : "Enable PIN unlock"}
                  </Button>
                </div>

              <div className="flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <Button variant="ghost" className="w-full gap-2" onClick={skipQuickUnlock}>
                <SkipForward className="h-4 w-4" />
                Skip — use master password only
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-2">
                You can change this anytime in Settings → Security.
              </p>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Check className="h-5 w-5 text-emerald-600" />
                You&apos;re all set
              </CardTitle>
              <CardDescription>
                Your master password is set, your data is encrypted, and your recovery code
                is (hopefully) written down somewhere safe. Life_OS is ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <Check className="h-3 w-3 mr-1" /> Master password
                  </Badge>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <Check className="h-3 w-3 mr-1" /> Recovery code
                  </Badge>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <Check className="h-3 w-3 mr-1" /> Encryption active
                  </Badge>
                </div>
                <Separator />
                <p className="text-muted-foreground">
                  The dashboard is loading. Over the next few weeks, modules will light up
                  one by one — Journal, Tasks, Finances, Exercise, Counselor, and more.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Life_OS v2.0 · On-device encrypted
        </p>
        <p className="text-[10px] text-center text-muted-foreground/60">
          © Adeshjeet_official
        </p>
      </div>
    </div>
  );
}
