"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sun, Moon, Monitor, Lock, Droplets, Brain, Dumbbell, Music,
  Download, Upload, Trash2, Shield, AlertTriangle, FileText,
  Volume2, Vibrate, Sparkles, Fingerprint, KeyRound, User,
  PanelLeft, PanelBottom, Smartphone,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { db } from "@/lib/db/life-os-db";
import { toast } from "sonner";
import { THEMES, type ThemeId } from "@/lib/themes/registry";
import { cn } from "@/lib/utils";

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
];

const WATER_GOAL_OPTIONS = [
  { value: 1500, label: "1.5 L" },
  { value: 2000, label: "2.0 L" },
  { value: 2500, label: "2.5 L" },
  { value: 3000, label: "3.0 L" },
  { value: 3500, label: "3.5 L" },
];

const COUNSELOR_VOICES = [
  { id: "counselor-warm", label: "Warm — empathetic female", desc: "Daily check-ins, emotional support" },
  { id: "counselor-steady", label: "Steady — grounding male", desc: "Stress, anxiety, meditation" },
  { id: "counselor-direct", label: "Direct — action male", desc: "Goal-setting, accountability" },
  { id: "counselor-energetic", label: "Energetic — motivational female", desc: "Pre-workout, low-mood days" },
];

const COACH_VOICES = [
  { id: "coach-1-male-energy", label: "Male — high energy", desc: "Drill-sergeant motivating" },
  { id: "coach-2-female-warm", label: "Female — warm", desc: "Encouraging, supportive" },
  { id: "coach-3-male-calm", label: "Male — calm", desc: "Mindfulness-influenced" },
  { id: "coach-4-female-strong", label: "Female — strong", desc: "Direct, no-nonsense" },
];

export function SettingsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const lock = useAuthStore((s) => s.lock);

  const [autoLock, setAutoLock] = useState(profile?.preferences.auto_lock_minutes ?? 5);
  const [waterGoal, setWaterGoal] = useState(profile?.preferences.daily_water_goal_ml ?? 2500);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(profile?.preferences.theme ?? "system");
  const [soundEnabled, setSoundEnabled] = useState(profile?.preferences.sound_enabled ?? true);
  const [hapticsEnabled, setHapticsEnabled] = useState(profile?.preferences.haptics_enabled ?? true);
  const [animationIntensity, setAnimationIntensity] = useState<"none" | "minimal" | "full">(
    profile?.preferences.animation_intensity ?? "full",
  );
  const [themeId, setThemeId] = useState<ThemeId>(profile?.preferences.theme_id ?? "default");
  const [navPosition, setNavPosition] = useState<"auto" | "left" | "bottom">(
    profile?.preferences.nav_position ?? "auto",
  );
  const [userName, setUserName] = useState(profile?.name ?? "Friend");
  const [userAge, setUserAge] = useState(profile?.age?.toString() ?? "");
  const [counselorVoice, setCounselorVoice] = useState("counselor-warm");
  const [coachVoice, setCoachVoice] = useState("coach-1-male-energy");

  // Quick unlock management
  const quickUnlock = profile?.auth?.quick_unlock;
  const biometricSupported = useAuthStore((s) => s.biometricSupported);
  const enableBiometric = useAuthStore((s) => s.enableBiometric);
  const enablePin = useAuthStore((s) => s.enablePin);
  const disableQuickUnlock = useAuthStore((s) => s.disableQuickUnlock);
  const [quickModalOpen, setQuickModalOpen] = useState<"biometric" | "pin" | null>(null);
  const [masterPw, setMasterPw] = useState("");
  const [newPin, setNewPin] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setAutoLock(profile.preferences.auto_lock_minutes);
    setWaterGoal(profile.preferences.daily_water_goal_ml);
    setTheme(profile.preferences.theme);
    setSoundEnabled(profile.preferences.sound_enabled ?? true);
    setHapticsEnabled(profile.preferences.haptics_enabled ?? true);
    setAnimationIntensity(profile.preferences.animation_intensity ?? "full");
    setThemeId(profile.preferences.theme_id ?? "default");
    setNavPosition(profile.preferences.nav_position ?? "auto");
    setUserName(profile.name);
    setUserAge(profile.age?.toString() ?? "");
  }, [profile]);

  // Apply animation intensity live
  useEffect(() => {
    document.documentElement.setAttribute("data-animations", animationIntensity);
  }, [animationIntensity]);

  // ─── Auto-save: persists any preference change immediately ─────────────
  const skipFirstRef = useRef(true);

  useEffect(() => {
    if (!profile) return;
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      return; // skip initial mount
    }
    const t = setTimeout(async () => {
      const updated = {
        ...profile,
        name: userName.trim() || "Friend",
        age: userAge ? parseInt(userAge, 10) || null : null,
        preferences: {
          ...profile.preferences,
          theme_id: themeId,
          nav_position: navPosition,
          theme,
          auto_lock_minutes: autoLock,
          daily_water_goal_ml: waterGoal,
          sound_enabled: soundEnabled,
          haptics_enabled: hapticsEnabled,
          animation_intensity: animationIntensity,
        },
      };
      try {
        await db.user_profile.put(updated);
        useAuthStore.setState({ profile: updated });
      } catch (err) {
        console.error(err);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [profile, themeId, navPosition, theme, autoLock, waterGoal, soundEnabled, hapticsEnabled, animationIntensity, userName, userAge]);

  async function handleEnableBiometric() {
    setQuickBusy(true);
    const ok = await enableBiometric(masterPw);
    setQuickBusy(false);
    if (ok) {
      toast.success("Biometric unlock enabled");
      setQuickModalOpen(null);
      setMasterPw("");
    }
  }

  async function handleEnablePin() {
    if (!/^\d{4}$/.test(newPin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    setQuickBusy(true);
    const ok = await enablePin(masterPw, newPin);
    setQuickBusy(false);
    if (ok) {
      toast.success("PIN unlock enabled");
      setQuickModalOpen(null);
      setMasterPw("");
      setNewPin("");
    }
  }

  async function handleDisableQuickUnlock() {
    await disableQuickUnlock();
    toast.success("Quick unlock disabled");
  }

  function applyTheme(t: "light" | "dark" | "system") {
    setTheme(t);
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else if (t === "light") root.classList.remove("dark");
    else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-6 pb-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your Life_OS experience. Changes save automatically.
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sun className="h-4 w-4" />
            Appearance
          </CardTitle>
          <CardDescription>How Life_OS looks on your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-medium">Color mode</span>
            <div className="grid grid-cols-3 gap-2">
              <ThemeButton active={theme === "light"} onClick={() => applyTheme("light")} icon={<Sun className="h-4 w-4" />} label="Light" />
              <ThemeButton active={theme === "dark"} onClick={() => applyTheme("dark")} icon={<Moon className="h-4 w-4" />} label="Dark" />
              <ThemeButton active={theme === "system"} onClick={() => applyTheme("system")} icon={<Monitor className="h-4 w-4" />} label="System" />
            </div>
          </div>

          {/* Theme picker */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Theme</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    themeId === t.id
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <span className="text-2xl flex-shrink-0">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                  </div>
                  {themeId === t.id && <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation position */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Navigation position</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setNavPosition("auto")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors",
                  navPosition === "auto" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "border-border hover:bg-accent",
                )}
              >
                <Smartphone className="h-4 w-4" />
                <span>Auto</span>
              </button>
              <button
                onClick={() => setNavPosition("left")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors",
                  navPosition === "left" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "border-border hover:bg-accent",
                )}
              >
                <PanelLeft className="h-4 w-4" />
                <span>Left sidebar</span>
              </button>
              <button
                onClick={() => setNavPosition("bottom")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors",
                  navPosition === "bottom" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "border-border hover:bg-accent",
                )}
              >
                <PanelBottom className="h-4 w-4" />
                <span>Bottom nav</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Auto = sidebar on desktop, bottom bar on mobile.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>Your name and age. Used in greetings, congratulations, and Counselor responses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
              className="mt-1.5"
              maxLength={30}
            />
          </div>
          <div>
            <Label htmlFor="user-age">Age (optional)</Label>
            <Input
              id="user-age"
              type="number"
              value={userAge}
              onChange={(e) => setUserAge(e.target.value)}
              placeholder="e.g., 25"
              className="mt-1.5"
              min={1}
              max={150}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
          <CardDescription>
            Your master password protects everything. Auto-lock kicks in after inactivity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-medium">Auto-lock after</span>
            <Select value={String(autoLock)} onValueChange={(v) => setAutoLock(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUTO_LOCK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The app locks automatically if you&apos;re inactive for this long.
            </p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Lock now
              </div>
              <p className="text-xs text-muted-foreground">
                Immediately lock. You&apos;ll re-enter your master password.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={lock}>Lock</Button>
          </div>
        </CardContent>
      </Card>

      {/* Health goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Droplets className="h-4 w-4" />
            Health goals
          </CardTitle>
          <CardDescription>Daily targets shown on your dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <span className="text-sm font-medium">Daily water goal</span>
          <Select value={String(waterGoal)} onValueChange={(v) => setWaterGoal(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WATER_GOAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Quick Unlock */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fingerprint className="h-4 w-4" />
            Quick unlock
          </CardTitle>
          <CardDescription>
            Skip the long master password on most days. We&apos;ll still ask for it monthly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickUnlock ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border p-3 bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                  {quickUnlock.method === "biometric" ? (
                    <Fingerprint className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <KeyRound className="h-5 w-5 text-emerald-600" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {quickUnlock.method === "biometric" ? "Biometric" : "PIN"} unlock enabled
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {quickUnlock.method === "biometric"
                        ? "Touch / look at your device to unlock"
                        : "4-digit PIN required"}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Active
                </Badge>
              </div>
              <Button variant="outline" className="w-full" onClick={handleDisableQuickUnlock}>
                Disable quick unlock
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {biometricSupported && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => setQuickModalOpen("biometric")}
                >
                  <Fingerprint className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">Enable biometric</span>
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={() => setQuickModalOpen("pin")}
              >
                <KeyRound className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium">Enable PIN (4 digits)</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Experience (sound, haptics, animations) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4" />
            Experience
          </CardTitle>
          <CardDescription>
            Sound effects, haptics, and animation intensity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <ToggleRow
            icon={<Volume2 className="h-4 w-4 text-sky-600" />}
            label="Sound effects"
            desc="Tap, success, error, unlock tones"
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
          <Separator />
          <ToggleRow
            icon={<Vibrate className="h-4 w-4 text-violet-600" />}
            label="Haptics"
            desc="Vibration feedback on supported devices"
            checked={hapticsEnabled}
            onCheckedChange={setHapticsEnabled}
          />
          <Separator />
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <div>
                <div className="text-sm font-medium">Animations</div>
                <div className="text-xs text-muted-foreground">Adjust motion intensity</div>
              </div>
            </div>
            <Select value={animationIntensity} onValueChange={(v) => setAnimationIntensity(v as "none" | "minimal" | "full")}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Counselor voice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-4 w-4" />
            Counselor voice
          </CardTitle>
          <CardDescription>
            The AI Counselor reads responses aloud. Pick a voice that feels right.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COUNSELOR_VOICES.map((v) => (
            <VoiceRow key={v.id} active={counselorVoice === v.id} onClick={() => setCounselorVoice(v.id)} label={v.label} desc={v.desc} />
          ))}
        </CardContent>
      </Card>

      {/* Exercise coach voice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Dumbbell className="h-4 w-4" />
            Exercise coach voice
          </CardTitle>
          <CardDescription>
            Voice cues during workouts — countdowns, encouragement, rest reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COACH_VOICES.map((v) => (
            <VoiceRow key={v.id} active={coachVoice === v.id} onClick={() => setCoachVoice(v.id)} label={v.label} desc={v.desc} />
          ))}
          <p className="text-xs text-muted-foreground pt-2">
            Drop coach audio files in{" "}
            <code className="px-1 py-0.5 bg-muted rounded text-[10px]">public/assets/audio/coaches/</code>{" "}
            — see <FileText className="inline h-3 w-3" />{" "}
            <code className="px-1 py-0.5 bg-muted rounded text-[10px]">ASSETS_NEEDED.md</code>{" "}
            for the cue scripts.
          </p>
        </CardContent>
      </Card>

      {/* Music */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="h-4 w-4" />
            Background music
          </CardTitle>
          <CardDescription>
            Music plays during workouts and meditation. Drop files in{" "}
            <code className="px-1 py-0.5 bg-muted rounded text-[10px]">public/assets/audio/music/</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <MusicCategory label="Exercise" desc="120–145 BPM, uplifting" count={0} />
            <MusicCategory label="Meditation" desc="Ambient, nature, drones" count={0} />
            <MusicCategory label="Focus" desc="Binaural, brain waves" count={0} />
          </div>
        </CardContent>
      </Card>

      {/* Data portability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-4 w-4" />
            Data
          </CardTitle>
          <CardDescription>
            Export your entire Life_OS database to an encrypted .lifeos file, or import from a backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={async () => {
              try {
                const { exportToLifeos, downloadFile } = await import("@/lib/backup/lifeos-export");
                const { data, filename } = await exportToLifeos();
                downloadFile(data, filename);
                toast.success("Backup downloaded");
              } catch (err) {
                console.error(err);
                toast.error("Export failed");
              }
            }}
          >
            <Download className="h-4 w-4" />
            Export .lifeos backup
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".lifeos";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const { importFromLifeos } = await import("@/lib/backup/lifeos-export");
                  const result = await importFromLifeos(text, "replace");
                  toast.success(`Imported ${result.rows} rows across ${result.tables} tables`);
                  setTimeout(() => window.location.reload(), 1500);
                } catch (err) {
                  console.error(err);
                  toast.error(err instanceof Error ? err.message : "Import failed");
                }
              };
              input.click();
            }}
            
          >
            <Upload className="h-4 w-4" />
            Import .lifeos backup
          </Button>
          <Separator />
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-destructive">Danger zone</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Reset Life_OS — wipes all data and the master password. Cannot be undone.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              onClick={async () => {
                if (!confirm("This wipes ALL data and your master password. Cannot be undone. Continue?")) return;
                await db.delete();
                localStorage.clear();
                window.location.reload();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Reset everything
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between"><span>Version</span><span className="font-mono">v2.0.0 — Complete</span></div>
          <div className="flex justify-between"><span>Joined</span><span>{profile ? new Date(profile.joined_at).toLocaleDateString() : "—"}</span></div>
          <div className="flex justify-between"><span>Storage</span><span>On-device (IndexedDB, encrypted)</span></div>
          <div className="flex justify-between"><span>AI</span><span>Hybrid (local + cloud, server-side key)</span></div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground pt-2">
        Changes save automatically.
      </p>

      {/* Quick unlock setup modal */}
      {quickModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setQuickModalOpen(null)}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {quickModalOpen === "biometric" ? (
                  <Fingerprint className="h-5 w-5 text-emerald-600" />
                ) : (
                  <KeyRound className="h-5 w-5 text-amber-600" />
                )}
                Enable {quickModalOpen === "biometric" ? "biometric" : "PIN"} unlock
              </CardTitle>
              <CardDescription>
                Enter your master password to confirm. {quickModalOpen === "pin" && "Then set a 4-digit PIN."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">Master password</span>
                <Input
                  type="password"
                  value={masterPw}
                  onChange={(e) => setMasterPw(e.target.value)}
                  placeholder="Enter master password"
                  className="mt-1.5"
                  autoFocus
                />
              </div>
              {quickModalOpen === "pin" && (
                <div>
                  <span className="text-sm font-medium">New 4-digit PIN</span>
                  <Input
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="mt-1.5 text-center text-lg tracking-widest"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setQuickModalOpen(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={quickBusy || !masterPw || (quickModalOpen === "pin" && newPin.length !== 4)}
                  onClick={quickModalOpen === "biometric" ? handleEnableBiometric : handleEnablePin}
                >
                  {quickBusy ? "Enabling..." : "Enable"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Copyright footer */}
      <div className="pt-4 text-center space-y-1">
        <p className="text-xs text-muted-foreground">Life_OS v2.0 · Built with care for your best self</p>
        <p className="text-[10px] text-muted-foreground/60">© Adeshjeet_official</p>
      </div>
    </div>
  );
}

function ToggleRow({
  icon, label, desc, checked, onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ThemeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; }) {
  return (
    <button
      onClick={onClick}
      className={"flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors " +
        (active ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100" : "border-border hover:bg-accent")}
    >
      {icon}<span>{label}</span>
    </button>
  );
}

function VoiceRow({ active, onClick, label, desc }: { active: boolean; onClick: () => void; label: string; desc: string; }) {
  return (
    <button
      onClick={onClick}
      className={"w-full flex items-center justify-between rounded-md border p-3 text-left transition-colors " +
        (active ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "border-border hover:bg-accent")}
    >
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {active && <div className="h-2 w-2 rounded-full bg-amber-500" />}
    </button>
  );
}

function MusicCategory({ label, desc, count }: { label: string; desc: string; count: number }) {
  return (
    <div className="rounded-md border p-3 space-y-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
      <div className="text-xs text-muted-foreground/70">{count} tracks added</div>
    </div>
  );
}
