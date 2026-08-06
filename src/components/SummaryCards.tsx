import { ArrowDownRight, PieChart, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CATEGORY_META, formatCurrency, type Transaction } from "@/lib/categories";

export function SummaryCards({ transactions }: { transactions: Transaction[] }) {
  const debits = transactions.filter((t) => t.direction === "debit");
  const total = debits.reduce((sum, t) => sum + t.amount, 0);

  const byCategory = new Map<string, number>();
  for (const t of debits) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const biggest = [...debits].sort((a, b) => b.amount - a.amount)[0];

  const items = [
    {
      label: "Total Spent",
      value: formatCurrency(total),
      hint: `${debits.length} debit transactions`,
      icon: ArrowDownRight,
    },
    {
      label: "Top Category",
      value: top ? CATEGORY_META[top[0] as Transaction["category"]].label : "—",
      hint: top ? formatCurrency(top[1]) : "No spend detected",
      icon: PieChart,
    },
    {
      label: "Biggest Expense",
      value: biggest ? formatCurrency(biggest.amount) : "—",
      hint: biggest ? biggest.description : "No spend detected",
      icon: Receipt,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card
          key={item.label}
          className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {item.label}
            </span>
            <item.icon className="h-4 w-4 text-primary" />
          </div>
          <p className="tabular mt-4 truncate text-2xl font-semibold" title={item.value}>
            {item.value}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={item.hint}>
            {item.hint}
          </p>
        </Card>
      ))}
    </div>
  );
}
