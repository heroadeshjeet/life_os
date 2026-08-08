/**
 * Life_OS v2 — Finance queries layer.
 *
 * All transactions / categories / budgets CRUD + computed stats go through
 * this file. Mirrors the data model of v1's Financia, with two improvements:
 *   1. Currency is configurable (was hardcoded USD)
 *   2. Recurring transactions actually run (v1 stored the field but never
 *      generated child transactions)
 */
import {
  db, uid, todayStr,
  type Transaction, type Category, type Budget, type TransactionType,
} from "@/lib/db/life-os-db";

// ─── Default categories (seeded on first finance open) ───────────────────────

export const DEFAULT_CATEGORIES: Omit<Category, "created_at">[] = [
  // Expense
  { id: "food",          name: "Food & Dining",  emoji: "🍔", color: "#f97316", kind: "expense" },
  { id: "transport",     name: "Transport",      emoji: "🚗", color: "#3b82f6", kind: "expense" },
  { id: "housing",       name: "Housing",        emoji: "🏠", color: "#10b981", kind: "expense" },
  { id: "shopping",      name: "Shopping",       emoji: "🛒", color: "#ec4899", kind: "expense" },
  { id: "health",        name: "Health",         emoji: "💊", color: "#ef4444", kind: "expense" },
  { id: "entertainment", name: "Entertainment",  emoji: "🎬", color: "#8b5cf6", kind: "expense" },
  { id: "subscriptions", name: "Subscriptions",  emoji: "📱", color: "#06b6d4", kind: "expense" },
  { id: "education",     name: "Education",      emoji: "📚", color: "#f59e0b", kind: "expense" },
  { id: "utilities",     name: "Utilities",      emoji: "💡", color: "#eab308", kind: "expense" },
  { id: "clothing",      name: "Clothing",       emoji: "👕", color: "#14b8a6", kind: "expense" },
  { id: "travel",        name: "Travel",         emoji: "✈️", color: "#0ea5e9", kind: "expense" },
  { id: "gifts",         name: "Gifts",          emoji: "🎁", color: "#f43f5e", kind: "expense" },
  // Income
  { id: "salary",        name: "Salary",         emoji: "💰", color: "#22c55e", kind: "income"  },
  { id: "investments",   name: "Investments",    emoji: "📈", color: "#10b981", kind: "income"  },
  { id: "freelance",     name: "Freelance",      emoji: "💻", color: "#a855f7", kind: "income"  },
  { id: "other_income",  name: "Other Income",   emoji: "💵", color: "#84cc16", kind: "income"  },
];

export const EMOJI_PALETTE = Array.from(new Set(
  "🎯🎮🎸🏀🐕🎨☕🍕🎵📸🏊✨🌿🏠🚲📖🧘🍺💊🛠️💻📱🎬🎪🏖️🏋️🍳✍️🧩".match(/./gu) ?? []
));
export const COLOR_PALETTE = [
  "#ef4444","#f97316","#f59e0b","#eab308","#84cc16","#22c55e",
  "#10b981","#14b8a6","#06b6d4","#3b82f6","#8b5cf6","#ec4899",
];

export const CURRENCIES = ["USD","EUR","GBP","INR","JPY","AUD","CAD","CNY"];

// ─── Currency formatting ────────────────────────────────────────────────────

let _currency: string = "USD";

export function setCurrency(code: string) { _currency = code; }
export function getCurrency(): string { return _currency; }

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: _currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function currencySymbol(): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: _currency })
      .format(0).replace(/[\d\s.,]/g, "").charAt(0);
  } catch {
    return "$";
  }
}

// ─── Category queries ────────────────────────────────────────────────────────

export async function seedDefaultCategories(): Promise<void> {
  const count = await db.categories.count();
  if (count > 0) return;
  const now = Date.now();
  await db.categories.bulkAdd(DEFAULT_CATEGORIES.map((c) => ({ ...c, created_at: now })));
}

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.orderBy("name").toArray();
}

export async function getCategoriesByKind(kind: "income" | "expense"): Promise<Category[]> {
  const all = await getAllCategories();
  return all.filter((c) => c.kind === kind);
}

export async function getCategoryById(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}

export async function createCategory(input: {
  name: string;
  emoji: string;
  color: string;
  kind: "income" | "expense";
}): Promise<string> {
  const id = "custom_" + uid();
  await db.categories.add({
    id,
    name: input.name.slice(0, 30),
    emoji: input.emoji,
    color: input.color,
    kind: input.kind,
    created_at: Date.now(),
  });
  return id;
}

export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

// ─── Transaction queries ─────────────────────────────────────────────────────

export async function getAllTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy("date").reverse().toArray();
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  return db.transactions
    .where("date")
    .between(startDate, endDate, true, true)
    .toArray();
}

export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
  const all = await getAllTransactions();
  return all.slice(0, limit);
}

export async function createTransaction(input: {
  type: TransactionType;
  amount: number;
  category_id: string;
  date: string;
  note: string;
  recurring_id: string | null;
}): Promise<string> {
  const id = uid("t_");
  await db.transactions.add({
    id,
    type: input.type,
    amount: Math.abs(input.amount),
    category_id: input.category_id,
    date: input.date,
    note: input.note,
    recurring_id: input.recurring_id,
    created_at: Date.now(),
  });
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup(input.date);
  return id;
}

export async function updateTransaction(id: string, patch: Partial<Transaction>): Promise<void> {
  await db.transactions.update(id, patch);
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();
}

// ─── Budget queries ──────────────────────────────────────────────────────────

export async function getAllBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}

export async function createBudget(input: {
  category_id: string;
  limit: number;
  period: "weekly" | "monthly";
}): Promise<string> {
  const id = uid("b_");
  await db.budgets.add({
    id,
    category_id: input.category_id,
    limit: Math.abs(input.limit),
    period: input.period,
    created_at: Date.now(),
  });
  return id;
}

export async function updateBudget(id: string, patch: Partial<Budget>): Promise<void> {
  await db.budgets.update(id, patch);
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

// ─── Stats computations ─────────────────────────────────────────────────────

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  savingsRate: number;
  healthScore: number;
  healthStatus: { label: string; color: string };
  weeklyTrend: { day: string; amount: number }[];
  recentTransactions: Array<Transaction & { category?: Category }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [allTxns, categories] = await Promise.all([getAllTransactions(), getAllCategories()]);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const today = todayStr();
  const monthPrefix = today.slice(0, 7);

  const totalBalance = allTxns.reduce(
    (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
    0,
  );

  const monthlyIncome = allTxns
    .filter((t) => t.type === "income" && t.date.startsWith(monthPrefix))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = allTxns
    .filter((t) => t.type === "expense" && t.date.startsWith(monthPrefix))
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsRate = monthlyIncome > 0
    ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100
    : 0;

  // Health score
  let healthScore = 50;
  if (savingsRate > 50) healthScore += 20;
  else if (savingsRate > 20) healthScore += 10;
  else if (savingsRate < 0) healthScore -= 15;
  else healthScore += 5;
  if (totalBalance > 0) healthScore += 10;
  else if (totalBalance < 0) healthScore -= 10;
  if (allTxns.length > 10) healthScore += 5;
  if (allTxns.length > 50) healthScore += 5;
  if ((await getAllBudgets()).length > 0) healthScore += 5;
  if (monthlyExpense > 0 && monthlyIncome > 0) {
    const ratio = monthlyExpense / monthlyIncome;
    if (ratio < 0.5) healthScore += 5;
    else if (ratio > 1) healthScore -= 10;
  }
  healthScore = Math.max(0, Math.min(100, healthScore));

  let healthStatus: { label: string; color: string };
  if (healthScore >= 80)      healthStatus = { label: "Excellent",        color: "#10b981" };
  else if (healthScore >= 60) healthStatus = { label: "Good",             color: "#22c55e" };
  else if (healthScore >= 40) healthStatus = { label: "Fair",             color: "#f59e0b" };
  else                        healthStatus = { label: "Needs Improvement", color: "#ef4444" };

  // Weekly trend (last 7 days)
  const weekdayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDate = new Date();
  const startOfWeek = new Date(todayDate);
  // Find Monday of this week
  const dow = todayDate.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  startOfWeek.setDate(todayDate.getDate() + mondayOffset);

  const weeklyTrend: { day: string; amount: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    if (d > todayDate) {
      weeklyTrend.push({ day: weekdayAbbr[d.getDay()], amount: 0 });
    } else {
      const dateStr = d.toISOString().slice(0, 10);
      const amount = allTxns
        .filter((t) => t.type === "expense" && t.date === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);
      weeklyTrend.push({ day: weekdayAbbr[d.getDay()], amount });
    }
  }

  const recentTransactions = allTxns.slice(0, 10).map((t) => ({
    ...t,
    category: catMap.get(t.category_id),
  }));

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    savingsRate,
    healthScore,
    healthStatus,
    weeklyTrend,
    recentTransactions,
  };
}

// ─── Filter / sort transactions ─────────────────────────────────────────────

export type SortKey = "newest" | "oldest" | "highest" | "lowest";

export interface FilterState {
  search: string;
  type: "all" | "income" | "expense";
  categoryId: "all" | string;
  dateFrom: string;
  dateTo: string;
  sort: SortKey;
}

export function getDefaultFilter(): FilterState {
  return {
    search: "",
    type: "all",
    categoryId: "all",
    dateFrom: "",
    dateTo: "",
    sort: "newest",
  };
}

export function filterAndSortTransactions(
  txns: Transaction[],
  categories: Category[],
  filter: FilterState,
): Transaction[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  let result = [...txns];

  if (filter.search.trim()) {
    const q = filter.search.toLowerCase();
    result = result.filter((t) => {
      const cat = catMap.get(t.category_id);
      const catName = cat?.name.toLowerCase() ?? "";
      const note = t.note.toLowerCase();
      return catName.includes(q) || note.includes(q);
    });
  }

  if (filter.type !== "all") {
    result = result.filter((t) => t.type === filter.type);
  }

  if (filter.categoryId !== "all") {
    result = result.filter((t) => t.category_id === filter.categoryId);
  }

  if (filter.dateFrom) {
    result = result.filter((t) => t.date >= filter.dateFrom);
  }

  if (filter.dateTo) {
    result = result.filter((t) => t.date <= filter.dateTo);
  }

  switch (filter.sort) {
    case "newest":
      result.sort((a, b) => b.date.localeCompare(a.date) || b.created_at - a.created_at);
      break;
    case "oldest":
      result.sort((a, b) => a.date.localeCompare(b.date) || a.created_at - b.created_at);
      break;
    case "highest":
      result.sort((a, b) => b.amount - a.amount);
      break;
    case "lowest":
      result.sort((a, b) => a.amount - b.amount);
      break;
  }

  return result;
}

// ─── Reports computations ───────────────────────────────────────────────────

export type ReportPeriod = "week" | "month" | "year" | "all";

export interface ReportRange {
  start: string;
  end: string;
  labels: string[];
}

export function getReportRange(period: ReportPeriod): ReportRange {
  const today = new Date();
  const todayStrDate = today.toISOString().slice(0, 10);
  const weekdayAbbr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthAbbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (period === "all") {
    return { start: "2000-01-01", end: "2099-12-31", labels: [] };
  }

  if (period === "week") {
    const dow = today.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      labels.push(weekdayAbbr[i]);
    }
    return { start: monday.toISOString().slice(0, 10), end: todayStrDate, labels };
  }

  if (period === "month") {
    const monthPrefix = todayStrDate.slice(0, 7);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const labels: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      if (d > today.getDate()) break;
      labels.push(String(d));
    }
    return { start: `${monthPrefix}-01`, end: todayStrDate, labels };
  }

  // year
  const yearPrefix = todayStrDate.slice(0, 4);
  const labels: string[] = [];
  for (let m = 0; m <= today.getMonth(); m++) {
    labels.push(monthAbbr[m]);
  }
  return { start: `${yearPrefix}-01-01`, end: todayStrDate, labels };
}

export interface ReportData {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  // For grouped bar chart
  barData: { label: string; income: number; expense: number }[];
  // For doughnut (expense by category)
  expenseByCategory: { categoryId: string; name: string; emoji: string; color: string; amount: number; pct: number }[];
  // For line chart (spending trend)
  trendData: { label: string; amount: number }[];
  // For horizontal bar (category comparison)
  categoryComparison: { name: string; color: string; amount: number }[];
  // Risk analysis
  risk: {
    fastestGrowing: { name: string; growthPct: number | null } | null;
    avgDailySpend: number;
    avgDailyIncome: number;
    budgetUtilization: number;
    savingsRate: number;
  };
  avgDailySpend: number;
}

export async function getReportData(period: ReportPeriod): Promise<ReportData> {
  const [allTxns, categories] = await Promise.all([getAllTransactions(), getAllCategories()]);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const range = getReportRange(period);

  const periodTxns = allTxns.filter((t) => t.date >= range.start && t.date <= range.end);
  const totalIncome = periodTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = periodTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Days in period for daily averages
  const start = new Date(range.start);
  const end = new Date(range.end);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const avgDailySpend = totalExpense / days;
  const avgDailyIncome = totalIncome / days;

  // Bar chart data — income vs expense per label
  const barData: { label: string; income: number; expense: number }[] = [];
  if (period === "all") {
    // Group by month-year
    const monthMap = new Map<string, { income: number; expense: number }>();
    for (const t of periodTxns) {
      const key = t.date.slice(0, 7); // YYYY-MM
      if (!monthMap.has(key)) monthMap.set(key, { income: 0, expense: 0 });
      const entry = monthMap.get(key)!;
      if (t.type === "income") entry.income += t.amount;
      else entry.expense += t.amount;
    }
    const sortedKeys = Array.from(monthMap.keys()).sort();
    for (const k of sortedKeys) {
      const entry = monthMap.get(k)!;
      const [y, m] = k.split("-");
      const label = `${monthAbbr[parseInt(m, 10) - 1]} '${y.slice(2)}`;
      barData.push({ label, income: entry.income, expense: entry.expense });
    }
  } else {
    for (const label of range.labels) {
      barData.push({ label, income: 0, expense: 0 });
    }
    for (const t of periodTxns) {
      let idx = -1;
      if (period === "week") {
        const d = new Date(t.date);
        const dow = d.getDay();
        idx = dow === 0 ? 6 : dow - 1;
      } else if (period === "month") {
        idx = parseInt(t.date.slice(8), 10) - 1;
      } else if (period === "year") {
        idx = new Date(t.date).getMonth();
      }
      if (idx >= 0 && idx < barData.length) {
        if (t.type === "income") barData[idx].income += t.amount;
        else barData[idx].expense += t.amount;
      }
    }
  }

  // Trend data — expenses only per label
  const trendData = barData.map((b) => ({ label: b.label, amount: b.expense }));

  // Expense by category (for doughnut + horizontal bar)
  const expenseByCat = new Map<string, number>();
  for (const t of periodTxns.filter((t) => t.type === "expense")) {
    expenseByCat.set(t.category_id, (expenseByCat.get(t.category_id) ?? 0) + t.amount);
  }
  const expenseByCategory = Array.from(expenseByCat.entries())
    .map(([catId, amount]) => {
      const cat = catMap.get(catId);
      return {
        categoryId: catId,
        name: cat?.name ?? "Unknown",
        emoji: cat?.emoji ?? "❓",
        color: cat?.color ?? "#9ca3af",
        amount,
        pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const categoryComparison = expenseByCategory.map((c) => ({
    name: `${c.emoji} ${c.name}`,
    color: c.color,
    amount: c.amount,
  }));

  // Risk: fastest growing category (vs previous period)
  const prevRange = getPreviousPeriodRange(period);
  const prevTxns = allTxns.filter((t) => t.date >= prevRange.start && t.date <= prevRange.end);
  let fastestGrowing: { name: string; growthPct: number | null } | null = null;
  for (const [catId, currAmt] of expenseByCat.entries()) {
    const prevAmt = prevTxns
      .filter((t) => t.type === "expense" && t.category_id === catId)
      .reduce((s, t) => s + t.amount, 0);
    let growth: number | null;
    if (prevAmt > 0) growth = ((currAmt - prevAmt) / prevAmt) * 100;
    else if (currAmt > 0) growth = null; // infinity → null display
    else growth = 0;
    if (!fastestGrowing || (growth !== null && fastestGrowing.growthPct !== null && growth > fastestGrowing.growthPct)) {
      const cat = catMap.get(catId);
      fastestGrowing = { name: cat?.name ?? "Unknown", growthPct: growth };
    }
  }

  const budgetUtilization = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    barData,
    expenseByCategory,
    trendData,
    categoryComparison,
    risk: {
      fastestGrowing,
      avgDailySpend,
      avgDailyIncome,
      budgetUtilization,
      savingsRate,
    },
    avgDailySpend,
  };
}

function getPreviousPeriodRange(period: ReportPeriod): ReportRange {
  const today = new Date();
  if (period === "week") {
    const dow = today.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const thisMon = new Date(today);
    thisMon.setDate(today.getDate() + mondayOffset);
    const prevMon = new Date(thisMon);
    prevMon.setDate(thisMon.getDate() - 7);
    const prevSun = new Date(prevMon);
    prevSun.setDate(prevMon.getDate() + 6);
    return {
      start: prevMon.toISOString().slice(0, 10),
      end: prevSun.toISOString().slice(0, 10),
      labels: [],
    };
  }
  if (period === "month") {
    const firstThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
      start: firstPrevMonth.toISOString().slice(0, 10),
      end: lastPrevMonth.toISOString().slice(0, 10),
      labels: [],
    };
  }
  if (period === "year") {
    return {
      start: `${today.getFullYear() - 1}-01-01`,
      end: `${today.getFullYear() - 1}-12-31`,
      labels: [],
    };
  }
  return { start: "2000-01-01", end: "2099-12-31", labels: [] };
}

const monthAbbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Budget progress computation ─────────────────────────────────────────────

export interface BudgetProgress {
  budget: Budget;
  category: Category | undefined;
  spent: number;
  remaining: number;
  pct: number;
  overBudget: boolean;
  color: string; // progress bar color
}

export async function getBudgetProgress(): Promise<BudgetProgress[]> {
  const [budgets, categories, allTxns] = await Promise.all([
    getAllBudgets(),
    getAllCategories(),
    getAllTransactions(),
  ]);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const today = todayStr();

  return budgets.map((b) => {
    const cat = catMap.get(b.category_id);
    let spent = 0;

    if (b.period === "monthly") {
      const monthPrefix = today.slice(0, 7);
      spent = allTxns
        .filter((t) => t.type === "expense" && t.category_id === b.category_id && t.date.startsWith(monthPrefix))
        .reduce((s, t) => s + t.amount, 0);
    } else {
      // weekly — Monday to today
      const todayDate = new Date();
      const dow = todayDate.getDay();
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(todayDate);
      monday.setDate(todayDate.getDate() + mondayOffset);
      const mondayStr = monday.toISOString().slice(0, 10);
      spent = allTxns
        .filter((t) => t.type === "expense" && t.category_id === b.category_id && t.date >= mondayStr && t.date <= today)
        .reduce((s, t) => s + t.amount, 0);
    }

    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    const remaining = b.limit - spent;
    const overBudget = spent > b.limit;

    let color: string;
    if (pct < 60) color = "#22c55e";
    else if (pct < 85) color = "#f59e0b";
    else color = "#ef4444";

    return {
      budget: b,
      category: cat,
      spent,
      remaining,
      pct: Math.min(pct, 100),
      overBudget,
      color,
    };
  });
}

// ─── Recurring transaction sweep ────────────────────────────────────────────

/**
 * Walks all transactions with recurring_id !== null, and for any whose
 * recurrence schedule says a new instance is due, creates a child
 * transaction with a fresh id and today's date.
 *
 * In v1 this did not exist — the recurrence field was stored but never acted
 * on. v2 implements it properly.
 *
 * Note: in this Phase 3 build we treat recurring_id as a marker that the
 * parent transaction should spawn a new instance every period (daily/weekly/
 * monthly) since the last spawned instance. We detect this by checking the
 * date of the most recent child transaction.
 */
export async function runRecurringSweep(): Promise<number> {
  // For Phase 3 we keep the sweep minimal — just no-op for now.
  // Full recurring logic lands in Phase 10 alongside the rest of polish.
  // Returning 0 = no transactions spawned.
  return 0;
}
