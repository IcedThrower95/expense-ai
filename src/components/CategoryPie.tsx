import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import {
  CATEGORIES,
  CATEGORY_META,
  formatCurrency,
  type Category,
  type Transaction,
} from "@/lib/categories";

export function CategoryPie({ transactions }: { transactions: Transaction[] }) {
  const debits = transactions.filter((t) => t.direction === "debit");
  const total = debits.reduce((sum, t) => sum + t.amount, 0);

  const data = CATEGORIES.map((category) => ({
    category,
    name: CATEGORY_META[category].short,
    value: debits.filter((t) => t.category === category).reduce((sum, t) => sum + t.amount, 0),
  }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
      <h3 className="text-base font-semibold">Spending breakdown</h3>
      <p className="mt-1 text-xs text-muted-foreground">By AI category, debits only</p>

      <div className="mt-4 grid items-center gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="relative h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={72}
                outerRadius={110}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_META[entry.category as Category].token}
                  />
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
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Total
            </span>
            <span className="tabular text-lg font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>

        <ul className="space-y-2.5">
          {data.length === 0 ? (
            <li className="text-sm text-muted-foreground">No spending detected.</li>
          ) : null}
          {data.map((entry) => (
            <li key={entry.category} className="flex items-center gap-3 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_META[entry.category as Category].token }}
              />
              <span className="min-w-0 flex-1 truncate">
                {CATEGORY_META[entry.category as Category].label}
              </span>
              <span className="tabular font-medium">{formatCurrency(entry.value)}</span>
              <span className="tabular w-12 text-right text-xs text-muted-foreground">
                {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
