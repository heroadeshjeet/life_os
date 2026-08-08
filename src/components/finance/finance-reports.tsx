"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import {
  getReportData, formatCurrency, type ReportPeriod, type ReportData,
} from "@/lib/finance/queries";

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

export function FinanceReports() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const d = await getReportData(period);
    setData(d);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    let cancelled = false;
    getReportData(period).then((d) => {
      if (cancelled) return;
      setData(d);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [period]);

  if (loading || !data) return <div className="p-8 text-center text-muted-foreground">Crunching numbers...</div>;

  const tooltipStyle = {
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#fff",
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-4 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Visualize your financial patterns.</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              period === p.value
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Income" value={formatCurrency(data.totalIncome)} color="text-emerald-600 dark:text-emerald-400" />
        <MetricCard label="Expenses" value={formatCurrency(data.totalExpense)} color="text-rose-600 dark:text-rose-400" />
        <MetricCard label="Net" value={formatCurrency(data.netSavings)} color={data.netSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
        <MetricCard label="Savings Rate" value={`${data.savingsRate.toFixed(1)}%`} color={data.savingsRate >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
      </div>

      {/* Spending Breakdown doughnut */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Spending Breakdown</CardTitle></CardHeader>
        <CardContent>
          {data.expenseByCategory.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No expense data for this period.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.expenseByCategory}
                      dataKey="amount" nameKey="name"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={2}
                    >
                      {data.expenseByCategory.map((e) => (
                        <Cell key={e.categoryId} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 text-sm">
                {data.expenseByCategory.slice(0, 8).map((e) => (
                  <div key={e.categoryId} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded flex-shrink-0" style={{ background: e.color }} />
                    <span className="flex-1 truncate">{e.emoji} {e.name}</span>
                    <span className="text-xs text-muted-foreground">{e.pct.toFixed(1)}%</span>
                    <span className="text-xs font-medium tabular-nums">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income vs Expenses bar */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Income vs Expenses</CardTitle></CardHeader>
        <CardContent>
          {data.barData.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No data for this period.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.barData}>
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [formatCurrency(v), n === "income" ? "Income" : "Expense"]} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="income" name="Income" fill="rgba(16,185,129,0.8)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="rgba(239,68,68,0.8)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Trend line */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Spending Trend</CardTitle></CardHeader>
        <CardContent>
          {data.trendData.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No data for this period.</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trendData}>
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Spent"]} />
                  <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Comparison horizontal bar */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Category Comparison</CardTitle></CardHeader>
        <CardContent>
          {data.categoryComparison.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No expense data for this period.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryComparison} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Spent"]} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {data.categoryComparison.map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Risk Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <RiskRow
            label="Fastest Growing Category"
            value={
              data.risk.fastestGrowing
                ? `${data.risk.fastestGrowing.name}${data.risk.fastestGrowing.growthPct !== null ? ` (+${data.risk.fastestGrowing.growthPct.toFixed(1)}%)` : " (new)"}`
                : "—"
            }
            color="text-amber-600 dark:text-amber-400"
          />
          <RiskRow label="Avg Daily Spend" value={formatCurrency(data.risk.avgDailySpend)} color="text-rose-600 dark:text-rose-400" />
          <RiskRow label="Avg Daily Income" value={formatCurrency(data.risk.avgDailyIncome)} color="text-emerald-600 dark:text-emerald-400" />
          <div className="flex items-center justify-between py-1.5 border-t">
            <span className="text-sm text-muted-foreground">Budget Utilization</span>
            <span className={cn(
              "text-sm font-medium flex items-center gap-1.5",
              data.risk.budgetUtilization > 80 ? "text-rose-600 dark:text-rose-400" : "text-foreground",
            )}>
              {data.risk.budgetUtilization.toFixed(1)}%
              {data.risk.budgetUtilization > 80 && <span className="text-xs">⚠️ Over 80%</span>}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-t">
            <span className="text-sm text-muted-foreground">Savings Rate</span>
            <span className={cn(
              "text-sm font-medium flex items-center gap-1.5",
              data.risk.savingsRate > 20 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}>
              {data.risk.savingsRate.toFixed(1)}% {data.risk.savingsRate > 0 ? "📈" : "📉"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("text-lg font-bold truncate", color)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function RiskRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", color)}>{value}</span>
    </div>
  );
}
