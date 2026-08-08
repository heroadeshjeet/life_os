"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ModuleDef } from "@/lib/modules";

export function ModulePlaceholder({ module }: { module: ModuleDef }) {
  const Icon = module.icon;
  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-10 space-y-6">
      <div className="flex flex-col items-center text-center gap-3 py-8">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-muted ${module.accent}`}>
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">{module.name}</h1>
        <p className="text-sm text-muted-foreground max-w-md">{module.description}</p>
      </div>

      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground space-y-3">
          <p>
            This module is part of Life_OS v2.0. It&apos;s connected to the shared
            encrypted database, accessible with your master password, and feeds
            data into your unified dashboard and streak calendar.
          </p>
          <p>
            See the planning PDF for the full specification and timeline.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
