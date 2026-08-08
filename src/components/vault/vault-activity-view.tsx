"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Trash2 } from "lucide-react";
import {
  getActivityLog, clearActivityLog, KIND_META,
  type VaultActivity,
} from "@/lib/vault/queries";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACTION_META: Record<VaultActivity["action"], { label: string; color: string }> = {
  created: { label: "Created",  color: "text-emerald-600 dark:text-emerald-400" },
  updated: { label: "Updated",  color: "text-sky-600 dark:text-sky-400" },
  deleted: { label: "Deleted",  color: "text-rose-600 dark:text-rose-400" },
  viewed:  { label: "Viewed",   color: "text-muted-foreground" },
};

export function VaultActivityView() {
  const [activities, setActivities] = useState<VaultActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const log = await getActivityLog();
    setActivities(log);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getActivityLog().then((log) => {
      if (cancelled) return;
      setActivities(log);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleClear() {
    if (!confirm("Clear activity log? This cannot be undone.")) return;
    await clearActivityLog();
    toast.success("Activity log cleared");
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Activity Log
          </h1>
          <p className="text-sm text-muted-foreground">{activities.length} entr{activities.length === 1 ? "y" : "ies"} (max 200)</p>
        </div>
        {activities.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No activity yet. Your vault actions will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {activities.map((a) => {
            const action = ACTION_META[a.action];
            const kind = KIND_META[a.itemKind];
            return (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-accent/50">
                <div className="text-lg flex-shrink-0">{kind.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className={cn("font-medium", action.color)}>{action.label}</span>{" "}
                    <span className="text-muted-foreground">·</span>{" "}
                    <span className="font-medium">{a.itemName}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {kind.label} · {new Date(a.timestamp).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}
