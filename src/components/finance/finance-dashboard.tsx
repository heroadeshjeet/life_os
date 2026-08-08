"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, Lightbulb,
  ArrowDownCircle, ArrowUpCircle, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  getDashboardStats, formatCurrency, type DashboardStats,
} from "@/lib/finance/queries";
import { TransactionModal } from "./transaction-modal";
import { cn } from "@/lib/utils";

const FINANCIAL_TIPS = [
  "Track every expense, no matter how small — they add up faster than you think.",
  "Aim to save at least 20% of your income each month.",
  "Review your subscriptions monthly — cancel what you don't use.",
  "Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings.",
  "Set up an emergency fund covering 3-6 months of expenses.",
  "Pay yourself first — automate savings the day you get paid.",
  "Avoid lifestyle inflation when your income grows.",
  "Invest in yourself — courses, books, and skills pay the best returns.",
  "Compare prices before any purchase over $50.",
  "Cook at home more — it's healthier and saves thousands per year.",
  "Pay off high-interest debt before investing in low-return assets.",
  "Use cashback and rewards cards for regular expenses, pay them off monthly.",
  "Set specific financial goals with deadlines.",
  "Review your net worth quarterly to track long-term progress.",
  "Negotiate your bills — internet, phone, insurance are often negotiable.",
  "Don't time the market — invest consistently through dollar-cost averaging.",
  "Teach someone else about money — it reinforces your own knowledge.",
];

function tipOfTheDay(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return FINANCIAL_TIPS[dayOfYear % FINANCIAL_TIPS.length];
}

export function FinanceDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getDashboardStats();
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDashboardStats().then((s) => {
      if (cancelled) return;
      setStats(s);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading || !stats) return <div className="p-8 text-center text-muted-foreground">Loading your finances...</div>;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const isWeekend = [0, 5, 6].includes(new Date().getDay());

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-5 pb-12">
      {/* Welcome header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back!</h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {/* Weekend banner */}
      {isWeekend && (
        <div className="rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300 dark:border-amber-900/50 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          🗓️ Weekend reminder: Take a moment to log your finances!
        </div>
      )}

      {/* Tip of the day */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-900/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Tip of the Day</div>
            <p className="text-sm text-emerald-900 dark:text-emerald-100 mt-1">{tipOfTheDay()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Total Balance"
          value={formatCurrency(stats.totalBalance)}
          color={stats.totalBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Monthly Income"
          value={formatCurrency(stats.monthlyIncome)}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<TrendingDown className="h-4 w-4" />}
          label="Monthly Expenses"
          value={formatCurrency(stats.monthlyExpense)}
          color="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          icon={<PiggyBank className="h-4 w-4" />}
          label="Savings Rate"
          value={`${stats.savingsRate.toFixed(1)}%`}
          color={
            stats.savingsRate > 50 ? "text-emerald-600 dark:text-emerald-400"
            : stats.savingsRate >= 20 ? "text-amber-600 dark:text-amber-400"
            : "text-rose-600 dark:text-rose-400"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Financial health score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Financial Health
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative h-32 w-32">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke={stats.healthStatus.color}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50 * stats.healthScore / 100} ${2 * Math.PI * 50}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold" style={{ color: stats.healthStatus.color }}>
                  {stats.healthScore}
                </div>
                <div className="text-[10px] text-muted-foreground">out of 100</div>
              </div>
            </div>
            <div className="mt-3 text-sm font-medium" style={{ color: stats.healthStatus.color }}>
              {stats.healthStatus.label}
            </div>
          </CardContent>
        </Card>

        {/* Weekly trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Spending Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weeklyTrend}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(148,163,184,0.2)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    formatter={(v: number) => [formatCurrency(v), "Spent"]}
                  />
                  <Area
                    type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2}
                    fill="url(#trendGrad)" dot={{ r: 3, fill: "#10b981" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentTransactions.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              📝 No transactions yet. Tap + to add one!
            </div>
          ) : (
            <div className="space-y-1">
              {stats.recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-base flex-shrink-0"
                    style={{ background: `${t.category?.color ?? "#9ca3af"}20`, color: t.category?.color }}
                  >
                    {t.category?.emoji ?? "❓"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.category?.name ?? "Unknown"}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.note || "—"}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={cn(
                      "text-sm font-semibold",
                      t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                    )}>
                      {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className={cn("text-xl font-bold truncate", color)}>{value}</div>
      </CardContent>
    </Card>
  );
}
