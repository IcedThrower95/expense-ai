import { CATEGORY_META, type Transaction } from "@/lib/categories";

function cell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildTransactionsCsv(transactions: Transaction[]) {
  const lines: string[] = [];

  const debits = transactions.filter((t) => t.direction === "debit");
  const total = debits.reduce((sum, t) => sum + t.amount, 0);

  const byCategory = new Map<string, { count: number; amount: number }>();
  for (const t of transactions) {
    const entry = byCategory.get(t.category) ?? { count: 0, amount: 0 };
    entry.count += 1;
    if (t.direction === "debit") entry.amount += t.amount;
    else entry.amount -= t.amount;
    byCategory.set(t.category, entry);
  }

  lines.push("Category Summary");
  lines.push(["Category", "Transactions", "Net Amount (INR)", "% of Spend"].map(cell).join(","));
  for (const [category, entry] of [...byCategory.entries()].sort((a, b) => b[1].amount - a[1].amount)) {
    const share = total > 0 && entry.amount > 0 ? ((entry.amount / total) * 100).toFixed(1) : "0.0";
    lines.push(
      [
        CATEGORY_META[category as Transaction["category"]]?.label ?? category,
        entry.count,
        entry.amount.toFixed(2),
        share,
      ]
        .map(cell)
        .join(","),
    );
  }
  lines.push(["Total Spent", debits.length, total.toFixed(2), "100.0"].map(cell).join(","));
  lines.push("");

  lines.push("Transactions");
  lines.push(
    ["Date", "Description", "Amount (INR)", "Type", "AI Category"].map(cell).join(","),
  );
  for (const t of transactions) {
    lines.push(
      [
        t.date,
        t.description,
        t.amount.toFixed(2),
        t.direction,
        CATEGORY_META[t.category]?.label ?? t.category,
      ]
        .map(cell)
        .join(","),
    );
  }

  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
