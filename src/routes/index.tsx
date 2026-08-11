import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { AlertCircle, FileText, LogOut, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/UploadZone";
import { SummaryCards } from "@/components/SummaryCards";
import { CategoryPie } from "@/components/CategoryPie";
import { TransactionsTable } from "@/components/TransactionsTable";
import { HistoryPanel } from "@/components/HistoryPanel";
import { analyzeStatement } from "@/lib/analyze.functions";
import type { Category, Transaction } from "@/lib/categories";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import {
  loadSavedStatement,
  saveStatement,
  updateStatementTransactions,
  type SavedStatement,
} from "@/lib/statements-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Expense Analyzer — Categorize Your Bank Statement" },
      {
        name: "description",
        content:
          "Upload one or more bank statement PDFs and get an instant AI-categorized spending dashboard with charts, totals and an editable transaction table.",
      },
      { property: "og:title", content: "AI Expense Analyzer" },
      {
        property: "og:description",
        content:
          "Drop in bank statement PDFs and see combined spending across shopping, food delivery, dining, daily essentials and money received from parents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type StatementSource = {
  id: string;
  name: string;
  count: number;
  saved: boolean;
};

function Index() {
  const analyze = useServerFn(analyzeStatement);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sources, setSources] = useState<StatementSource[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setError(null);

      const pdfs = files.filter(
        (f) => f.type.includes("pdf") || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (pdfs.length === 0) {
        setError("Those don't look like PDFs. Please upload PDF bank statements.");
        return;
      }

      setIsBusy(true);
      const failures: string[] = [];

      try {
        const { extractPdfText } = await import("@/lib/pdf-extract");

        for (let i = 0; i < pdfs.length; i++) {
          const file = pdfs[i]!;
          let sourceId = `src-${Date.now()}-${i}`;
          setFileName(pdfs.length > 1 ? `${file.name} (${i + 1} of ${pdfs.length})` : file.name);
          setStatus("Reading pages...");

          try {
            const { text } = await extractPdfText(file, (page, total) =>
              setStatus(`Reading page ${page} of ${total}...`),
            );

            if (text.trim().length < 40) {
              failures.push(`${file.name}: no readable text (scanned or protected PDF)`);
              continue;
            }

            setStatus("Categorizing transactions...");
            const result = await analyze({ data: { text } });

            if (result.error) {
              failures.push(`${file.name}: ${result.error}`);
              continue;
            }

            let parsed = (result.transactions as Transaction[]).map((t, index) => ({
              ...t,
              id: `${sourceId}-${index}`,
            }));

            let saved = false;
            if (user) {
              try {
                setStatus("Saving to your history...");
                const savedId = await saveStatement({
                  userId: user.id,
                  fileName: file.name,
                  transactions: parsed,
                });
                sourceId = savedId;
                saved = true;
                parsed = parsed.map((t, index) => ({ ...t, id: `${savedId}-${index}` }));
                await queryClient.invalidateQueries({ queryKey: ["statements"] });
              } catch {
                toast.error(`Couldn't save ${file.name} to your history`);
              }
            }

            setTransactions((prev) => [...prev, ...parsed]);
            setSources((prev) => [
              ...prev,
              { id: sourceId, name: file.name, count: parsed.length, saved },
            ]);
          } catch (err) {
            console.error(err);
            failures.push(`${file.name}: couldn't be read`);
          }
        }
      } finally {
        setIsBusy(false);
        setStatus(null);
        setFileName(null);
      }

      if (failures.length > 0) setError(failures.join(" · "));
    },
    [analyze, queryClient, user],
  );

  const updateCategory = useCallback(
    (id: string, category: Category) => {
      setTransactions((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, category } : t));
        const source = sources.find((s) => s.saved && id.startsWith(`${s.id}-`));
        if (source) {
          const rows = next.filter((t) => t.id.startsWith(`${source.id}-`));
          void updateStatementTransactions(source.id, rows).catch(() =>
            toast.error("Couldn't save that category change"),
          );
        }
        return next;
      });
    },
    [sources],
  );

  const removeSource = useCallback((sourceId: string) => {
    setTransactions((prev) => prev.filter((t) => !t.id.startsWith(`${sourceId}-`)));
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
  }, []);

  const openSaved = useCallback(
    async (statement: SavedStatement) => {
      try {
        const detail = await loadSavedStatement(statement.id);
        setTransactions((prev) => [
          ...prev.filter((t) => !t.id.startsWith(`${detail.id}-`)),
          ...detail.transactions,
        ]);
        setSources((prev) => [
          ...prev.filter((s) => s.id !== detail.id),
          {
            id: detail.id,
            name: detail.fileName,
            count: detail.transactions.length,
            saved: true,
          },
        ]);
      } catch {
        toast.error("Couldn't open that saved statement");
      }
    },
    [],
  );

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setTransactions([]);
    setSources([]);
    navigate({ to: "/auth", replace: true });
  };

  const reset = () => {
    setTransactions([]);
    setSources([]);
    setError(null);
    setFileName(null);
  };

  const hasResults = sources.length > 0;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight">AI Expense Analyzer</h1>
              <p className="text-xs text-muted-foreground">
                Statements in, categorized spending out
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasResults ? (
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Clear view
              </Button>
            ) : null}
            {user ? (
              <>
                <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:inline">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:py-14">
        {!hasResults ? (
          <div className="mx-auto max-w-2xl space-y-6">
            {!isBusy ? (
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-semibold sm:text-4xl">
                  Where did your money actually go?
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
                  Upload one or several statements and the AI sorts every line into apparel,
                  electronics, food delivery, dining out, daily micro-spends and money received
                  from parents.
                </p>
              </div>
            ) : null}

            <UploadZone
              onFiles={(files) => void handleFiles(files)}
              isBusy={isBusy}
              statusLabel={status}
              fileName={fileName}
            />

            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p>{error}</p>
              </div>
            ) : null}

            {user ? (
              <HistoryPanel
                enabled
                openIds={sources.map((s) => s.id)}
                onOpen={(s) => void openSaved(s)}
              />
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">
                  Sign in
                </Link>{" "}
                to save every analyzed statement and re-open it later.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Statements
              </span>
              {sources.map((source) => (
                <span
                  key={source.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="max-w-[180px] truncate" title={source.name}>
                    {source.name}
                  </span>
                  <span className="text-muted-foreground">{source.count}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${source.name}`}
                    onClick={() => removeSource(source.id)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <UploadZone
              compact
              onFiles={(files) => void handleFiles(files)}
              isBusy={isBusy}
              statusLabel={status}
              fileName={fileName}
            />

            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p>{error}</p>
              </div>
            ) : null}

            <SummaryCards transactions={transactions} />
            <CategoryPie transactions={transactions} />
            <TransactionsTable transactions={transactions} onCategoryChange={updateCategory} />

            {user ? (
              <HistoryPanel
                enabled
                openIds={sources.map((s) => s.id)}
                onOpen={(s) => void openSaved(s)}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
