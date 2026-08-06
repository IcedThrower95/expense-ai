import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CATEGORIES,
  CATEGORY_META,
  formatCurrency,
  type Category,
  type Transaction,
} from "@/lib/categories";

const PAGE_SIZE = 10;

type Props = {
  transactions: Transaction[];
  onCategoryChange: (id: string, category: Category) => void;
};

export function TransactionsTable({ transactions, onCategoryChange }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    );
  }, [transactions, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card className="gap-0 overflow-hidden border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Transactions</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {filtered.length} rows · category is editable
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search description..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-5 -mx-6 overflow-x-auto px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[110px]">Date</TableHead>
              <TableHead className="min-w-[220px]">Description</TableHead>
              <TableHead className="w-[130px] text-right">Amount</TableHead>
              <TableHead className="w-[280px]">AI Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="tabular whitespace-nowrap text-xs text-muted-foreground">
                  {t.date}
                </TableCell>
                <TableCell className="max-w-[320px] truncate" title={t.description}>
                  {t.description}
                </TableCell>
                <TableCell
                  className={
                    t.direction === "credit"
                      ? "tabular text-right font-medium text-primary"
                      : "tabular text-right font-medium"
                  }
                >
                  {t.direction === "credit" ? "+" : "−"}
                  {formatCurrency(t.amount)}
                </TableCell>
                <TableCell>
                  <Select
                    value={t.category}
                    onValueChange={(value) => onCategoryChange(t.id, value as Category)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: CATEGORY_META[t.category].token }}
                        />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_META[category].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No transactions match your search.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {safePage + 1} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
