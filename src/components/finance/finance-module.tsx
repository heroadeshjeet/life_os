"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Receipt, BarChart3, Target, Tags,
} from "lucide-react";
import { FinanceDashboard } from "./finance-dashboard";
import { FinanceTransactions } from "./finance-transactions";
import { FinanceReports } from "./finance-reports";
import { FinanceBudgets } from "./finance-budgets";
import { FinanceCategories } from "./finance-categories";
import { seedDefaultCategories } from "@/lib/finance/queries";

type Tab = "dashboard" | "transactions" | "reports" | "budgets" | "categories";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "reports",      label: "Reports",      icon: BarChart3 },
  { id: "budgets",      label: "Budgets",      icon: Target },
  { id: "categories",   label: "Categories",   icon: Tags },
];

export function FinanceModule() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [seeded, setSeeded] = useState(false);

  // Seed default categories on first open
  useEffect(() => {
    seedDefaultCategories().then(() => setSeeded(true));
  }, []);

  if (!seeded) {
    return <div className="p-8 text-center text-muted-foreground">Preparing finances...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-4xl flex overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 min-w-[80px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap",
                  active ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "dashboard"    && <FinanceDashboard />}
        {tab === "transactions" && <FinanceTransactions />}
        {tab === "reports"      && <FinanceReports />}
        {tab === "budgets"      && <FinanceBudgets />}
        {tab === "categories"   && <FinanceCategories />}
      </div>
    </div>
  );
}
