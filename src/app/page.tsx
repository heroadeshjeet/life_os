"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { SetupScreen } from "@/components/auth/setup-screen";
import { LockScreen } from "@/components/auth/lock-screen";
import { AppShell } from "@/components/shell/app-shell";

export default function Home() {
  const status = useAuthStore((s) => s.status);
  const setupInProgress = useAuthStore((s) => s.setupInProgress);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  // While setup is in progress (recovery code, quick unlock), keep showing SetupScreen
  if (setupInProgress) {
    return <SetupScreen />;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-200 dark:bg-amber-900/40" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Waking up Life_OS...</p>
      </div>
    );
  }

  if (status === "needs-setup") {
    return <SetupScreen />;
  }

  if (status === "locked" || status === "monthly-reminder") {
    return <LockScreen />;
  }

  // status === "unlocked"
  return <AppShell />;
}
