import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const { data, isLoading } = useQuery({
    queryKey: ["statements"],
    queryFn: listSavedStatements,
    enabled,
  });

  if (!enabled) return null;

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

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your saved statements...
        </div>
      ) : !data || data.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing saved yet. Analyze a statement and it'll be stored here automatically.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {data.map((item) => {
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
