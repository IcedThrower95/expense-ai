import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  HeartHandshake,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Area,
  AreaChart,
} from "recharts";

import { Card } from "@/components/ui/card";
import {
  FAMILY_MEMBERS,
  matchFamilyMember,
  formatCurrency,
  type Transaction,
  type FamilyMemberId,
} from "@/lib/categories";
import { getSharedTransactions } from "@/lib/transactions-store";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family Transactions — AI Expense Analyzer" },
      {
        name: "description",
        content:
          "Detailed breakdown of money received from and sent to family members.",
      },
    ],
  }),
  component: FamilyPage,
});

/* ────────────────────────── helpers ────────────────────────── */

type FamilyTxn = Transaction & { memberId: FamilyMemberId };

function getFamilyTransactions(transactions: Transaction[]): FamilyTxn[] {
  return transactions
    .map((t) => {
      const memberId = matchFamilyMember(t.description);
      if (!memberId) return null;
      return { ...t, memberId } as FamilyTxn;
    })
    .filter(Boolean) as FamilyTxn[];
}

function getMemberMeta(id: FamilyMemberId) {
  return FAMILY_MEMBERS.find((m) => m.id === id)!;
}

/* ────────────────────────── page ────────────────────────── */

function FamilyPage() {
  const allTransactions = getSharedTransactions();
  const familyTxns = useMemo(
    () => getFamilyTransactions(allTransactions),
    [allTransactions],
  );

  const totalReceived = familyTxns
    .filter((t) => t.direction === "credit")
    .reduce((s, t) => s + t.amount, 0);
  const totalSent = familyTxns
    .filter((t) => t.direction === "debit")
    .reduce((s, t) => s + t.amount, 0);
  const netFlow = totalReceived - totalSent;

  // Per-member breakdown
  const memberStats = useMemo(() => {
    const stats = new Map<
      FamilyMemberId,
      { received: number; sent: number; count: number }
    >();
    for (const t of familyTxns) {
      const s = stats.get(t.memberId) ?? { received: 0, sent: 0, count: 0 };
      if (t.direction === "credit") s.received += t.amount;
      else s.sent += t.amount;
      s.count++;
      stats.set(t.memberId, s);
    }
    return FAMILY_MEMBERS.filter((m) => stats.has(m.id)).map((m) => ({
      ...m,
      ...stats.get(m.id)!,
      net: (stats.get(m.id)?.received ?? 0) - (stats.get(m.id)?.sent ?? 0),
    }));
  }, [familyTxns]);

  // Pie chart data: received from each member
  const pieData = memberStats
    .filter((m) => m.received > 0)
    .map((m) => ({
      name: m.label,
      value: m.received,
      color: m.color,
    }))
    .sort((a, b) => b.value - a.value);

  // Bar chart: received vs sent per member
  const barData = memberStats.map((m) => ({
    name: m.label.split(" ")[0],
    Received: m.received,
    Sent: m.sent,
    fill: m.color,
  }));

  // Monthly timeline
  const monthlyData = useMemo(() => {
    const months = new Map<string, { received: number; sent: number }>();
    for (const t of familyTxns) {
      const month = t.date.slice(0, 7); // YYYY-MM
      if (month.length < 7) continue;
      const m = months.get(month) ?? { received: 0, sent: 0 };
      if (t.direction === "credit") m.received += t.amount;
      else m.sent += t.amount;
      months.set(month, m);
    }
    return [...months.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        Received: data.received,
        Sent: data.sent,
      }));
  }, [familyTxns]);

  if (familyTxns.length === 0) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="mt-20 text-center">
            <HeartHandshake className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="mt-4 text-xl font-semibold">
              No family transactions yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a bank statement first, then come back here to see your
              family transaction breakdown.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-5">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <HeartHandshake className="h-4.5 w-4.5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                Family Transactions
              </h1>
              <p className="text-xs text-muted-foreground">
                Money flow between you and your family
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-10">
        {/* ── Summary Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Total Received
              </span>
              <ArrowDownRight className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="tabular mt-4 text-2xl font-semibold text-emerald-400">
              +{formatCurrency(totalReceived)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {familyTxns.filter((t) => t.direction === "credit").length}{" "}
              incoming transfers
            </p>
          </Card>

          <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Total Sent
              </span>
              <ArrowUpRight className="h-4 w-4 text-red-400" />
            </div>
            <p className="tabular mt-4 text-2xl font-semibold text-red-400">
              -{formatCurrency(totalSent)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {familyTxns.filter((t) => t.direction === "debit").length}{" "}
              outgoing transfers
            </p>
          </Card>

          <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Net Flow
              </span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p
              className={`tabular mt-4 text-2xl font-semibold ${netFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {netFlow >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(netFlow))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {netFlow >= 0 ? "You received more" : "You sent more"}
            </p>
          </Card>

          <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Family Members
              </span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="tabular mt-4 text-2xl font-semibold">
              {memberStats.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {familyTxns.length} total transactions
            </p>
          </Card>
        </div>

        {/* ── Per-Member Breakdown Cards ── */}
        <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
          <h3 className="text-base font-semibold">Per-member breakdown</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            How money flows with each family member
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberStats.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-border bg-background/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-background"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.label[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.count} transactions
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Received</p>
                    <p className="tabular font-medium text-emerald-400">
                      +{formatCurrency(m.received)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sent</p>
                    <p className="tabular font-medium text-red-400">
                      -{formatCurrency(m.sent)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p
                    className={`tabular font-semibold ${m.net >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {m.net >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(m.net))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Charts Row ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie: Who sends the most */}
          <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
            <h3 className="text-base font-semibold">
              Received from each member
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Share of incoming family money
            </p>
            <div className="relative mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      color: "var(--popover-foreground)",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Total
                </span>
                <span className="tabular text-lg font-semibold">
                  {formatCurrency(totalReceived)}
                </span>
              </div>
            </div>
            <ul className="mt-2 space-y-1.5">
              {pieData.map((entry) => (
                <li
                  key={entry.name}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="flex-1 truncate">{entry.name}</span>
                  <span className="tabular font-medium">
                    {formatCurrency(entry.value)}
                  </span>
                  <span className="tabular w-10 text-right text-xs text-muted-foreground">
                    {totalReceived > 0
                      ? Math.round((entry.value / totalReceived) * 100)
                      : 0}
                    %
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Bar: Received vs Sent per member */}
          <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
            <h3 className="text-base font-semibold">Received vs Sent</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Comparison per family member
            </p>
            <div className="mt-4 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={4} barCategoryGap="20%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      color: "var(--popover-foreground)",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar
                    dataKey="Received"
                    fill="var(--chart-3)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="Sent"
                    fill="var(--chart-4)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ── Monthly Timeline ── */}
        {monthlyData.length > 1 ? (
          <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
            <h3 className="text-base font-semibold">Monthly timeline</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Family money flow over time
            </p>
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient
                      id="receivedGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--chart-3)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--chart-3)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="sentGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--chart-4)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--chart-4)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      color: "var(--popover-foreground)",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Received"
                    stroke="var(--chart-3)"
                    fill="url(#receivedGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Sent"
                    stroke="var(--chart-4)"
                    fill="url(#sentGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : null}

        {/* ── Transactions Table ── */}
        <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
          <h3 className="text-base font-semibold">All family transactions</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {familyTxns.length} transactions with family members
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 text-left font-medium">Date</th>
                  <th className="pb-3 pr-4 text-left font-medium">
                    Description
                  </th>
                  <th className="pb-3 pr-4 text-left font-medium">
                    Family Member
                  </th>
                  <th className="pb-3 pr-4 text-right font-medium">Amount</th>
                  <th className="pb-3 text-left font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {familyTxns.map((t) => {
                  const member = getMemberMeta(t.memberId);
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 pr-4 tabular text-muted-foreground">
                        {t.date}
                      </td>
                      <td className="py-3 pr-4 max-w-[240px] truncate">
                        {t.description}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: member.color }}
                          />
                          {member.label}
                        </span>
                      </td>
                      <td
                        className={`py-3 pr-4 tabular text-right font-medium ${
                          t.direction === "credit"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {t.direction === "credit" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            t.direction === "credit"
                              ? "bg-emerald-400/10 text-emerald-400"
                              : "bg-red-400/10 text-red-400"
                          }`}
                        >
                          {t.direction === "credit" ? "Received" : "Sent"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}
