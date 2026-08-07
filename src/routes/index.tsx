import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { AlertCircle, FileText, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/UploadZone";
import { SummaryCards } from "@/components/SummaryCards";
import { CategoryPie } from "@/components/CategoryPie";
import { TransactionsTable } from "@/components/TransactionsTable";
import { analyzeStatement } from "@/lib/analyze.functions";
import type { Category, Transaction } from "@/lib/categories";

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
};

function Index() {
  const analyze = useServerFn(analyzeStatement);
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
          const sourceId = `src-${Date.now()}-${i}`;
          setFileName(
            pdfs.length > 1 ? `${file.name} (${i + 1} of ${pdfs.length})` : file.name,
          );
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

            const parsed = (result.transactions as Transaction[]).map((t, index) => ({
              ...t,
              id: `${sourceId}-${index}`,
            }));

            setTransactions((prev) => [...prev, ...parsed]);
            setSources((prev) => [
              ...prev,
              { id: sourceId, name: file.name, count: parsed.length },
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
    [analyze],
  );

  const updateCategory = useCallback((id: string, category: Category) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)));
  }, []);

  const removeSource = useCallback((sourceId: string) => {
    setTransactions((prev) => prev.filter((t) => !t.id.startsWith(`${sourceId}-`)));
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
  }, []);

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
          {hasResults ? (
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Start over
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        {!hasResults ? (
          <div className="mx-auto max-w-2xl">
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
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p>{error}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
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
          </div>
        )}
      </div>
    </main>
  );
}
