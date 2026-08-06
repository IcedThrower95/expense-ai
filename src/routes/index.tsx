import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { AlertCircle, RotateCcw, Sparkles } from "lucide-react";
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
          "Upload a bank statement PDF and get an instant AI-categorized spending dashboard with charts, totals and an editable transaction table.",
      },
      { property: "og:title", content: "AI Expense Analyzer" },
      {
        property: "og:description",
        content:
          "Drop in a bank statement PDF and see your spending split across shopping, food delivery, dining and daily essentials.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const analyze = useServerFn(analyzeStatement);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setTransactions(null);

      if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("That doesn't look like a PDF. Please upload a PDF bank statement.");
        return;
      }

      setFileName(file.name);
      setIsBusy(true);
      setStatus("Reading pages...");

      try {
        const { extractPdfText } = await import("@/lib/pdf-extract");
        const { text } = await extractPdfText(file, (page, total) =>
          setStatus(`Reading page ${page} of ${total}...`),
        );

        if (text.trim().length < 40) {
          setError(
            "No readable text found in this PDF. It may be a scanned image or password protected.",
          );
          return;
        }

        setStatus("Categorizing transactions...");
        const result = await analyze({ data: { text } });

        if (result.error) {
          setError(result.error);
          return;
        }
        setTransactions(result.transactions as Transaction[]);
      } catch (err) {
        console.error(err);
        setError("We couldn't read that PDF. Try a different statement file.");
      } finally {
        setIsBusy(false);
        setStatus(null);
      }
    },
    [analyze],
  );

  const updateCategory = useCallback((id: string, category: Category) => {
    setTransactions((prev) =>
      prev ? prev.map((t) => (t.id === id ? { ...t, category } : t)) : prev,
    );
  }, []);

  const reset = () => {
    setTransactions(null);
    setError(null);
    setFileName(null);
  };

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
                Statement in, categorized spending out
              </p>
            </div>
          </div>
          {transactions ? (
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Analyze another
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        {!transactions ? (
          <div className="mx-auto max-w-2xl">
            {!isBusy ? (
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-semibold sm:text-4xl">
                  Where did your money actually go?
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
                  Upload a statement and the AI sorts every line into apparel, electronics, food
                  delivery, dining out and daily micro-spends.
                </p>
              </div>
            ) : null}

            <UploadZone
              onFile={(file) => void handleFile(file)}
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
            <SummaryCards transactions={transactions} />
            <CategoryPie transactions={transactions} />
            <TransactionsTable transactions={transactions} onCategoryChange={updateCategory} />
          </div>
        )}
      </div>
    </main>
  );
}
