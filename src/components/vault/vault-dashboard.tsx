"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock, FileText, Image as ImageIcon, FolderOpen, CreditCard,
  StickyNote, Users, TrendingUp,
} from "lucide-react";
import {
  getVaultStats, formatFileSize, KIND_META, KIND_ORDER,
  type VaultStats,
} from "@/lib/vault/queries";
import type { VaultItemKind } from "@/lib/db/life-os-db";
import { cn } from "@/lib/utils";

type View = "dashboard" | "document" | "image" | "file" | "card" | "note" | "contact" | "activity";

const KIND_ICONS: Record<VaultItemKind, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  image: ImageIcon,
  file: FolderOpen,
  card: CreditCard,
  note: StickyNote,
  contact: Users,
};

export function VaultDashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getVaultStats();
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getVaultStats().then((s) => {
      if (cancelled) return;
      setStats(s);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading vault...</div>;
  if (!stats) return null;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-5 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Lock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Vault
        </h1>
        <p className="text-sm text-muted-foreground">
          Everything here is encrypted with your master password. Even we can&apos;t read it.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Lock className="h-3.5 w-3.5" />
              Total items
            </div>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <FolderOpen className="h-3.5 w-3.5" />
              Storage used
            </div>
            <div className="text-2xl font-bold">{formatFileSize(stats.totalSizeBytes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Categories
            </div>
            <div className="text-2xl font-bold">
              {KIND_ORDER.filter((k) => stats.byKind[k] > 0).length}/6
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {KIND_ORDER.map((kind) => {
            const meta = KIND_META[kind];
            const Icon = KIND_ICONS[kind];
            const count = stats.byKind[kind];
            return (
              <Card
                key={kind}
                className="cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                onClick={() => onNavigate(kind)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={cn("h-5 w-5", meta.color)} />
                    <Badge variant="outline" className="text-[10px]">{count}</Badge>
                  </div>
                  <div className="text-sm font-medium">{meta.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}
