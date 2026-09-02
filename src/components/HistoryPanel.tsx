import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/categories";
import {
  deleteSavedStatement,
  listSavedStatements,
  type SavedStatement,
} from "@/lib/statements-store";

type HistoryPanelProps = {
  enabled: boolean;
  openIds: string[];
  onOpen: (statement: SavedStatement) => void;
};

export function HistoryPanel({ enabled, openIds, onOpen }: HistoryPanelProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["statements"],
    queryFn: listSavedStatements,
    enabled,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((item) => {
      if (q && !item.fileName.toLowerCase().includes(q)) return false;
      const day = new Date(item.createdAt).toISOString().slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }, [data, search, from, to]);

  if (!enabled) return null;

  const hasFilters = search.trim() !== "" || from !== "" || to !== "";

  const remove = async (id: string) => {
    try {
      await deleteSavedStatement(id);
      await queryClient.invalidateQueries({ queryKey: ["statements"] });
      toast.success("Statement removed from history");
    } catch {
      toast.error("Couldn't delete that statement");
    }
  };

  return (
    <Card className="gap-0 border-border bg-card/70 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Saved history
        </h2>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name..."
            aria-label="Search saved statements"
            className="pl-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="history-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="history-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[150px]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="history-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="history-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[150px]"
          />
        </div>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFrom("");
              setTo("");
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your saved statements...
        </div>
      ) : !data || data.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing saved yet. Analyze a statement and it'll be stored here automatically.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No saved statements match your search or date range.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {filtered.map((item) => {

            const isOpen = openIds.includes(item.id);
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/50 px-4 py-3"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.fileName}>
                    {item.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()} · {item.transactionCount}{" "}
                    transactions · {formatCurrency(item.totalSpent)} spent
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isOpen ? "secondary" : "outline"}
                  disabled={isOpen}
                  onClick={() => onOpen(item)}
                >
                  {isOpen ? "Open" : "Re-open"}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${item.fileName}`}
                  onClick={() => void remove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
