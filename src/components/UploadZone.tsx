import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadZoneProps = {
  onFiles: (files: File[]) => void;
  isBusy: boolean;
  statusLabel: string | null;
  fileName: string | null;
  compact?: boolean;
};

export function UploadZone({
  onFiles,
  isBusy,
  statusLabel,
  fileName,
  compact = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const list = files ? Array.from(files) : [];
      if (list.length > 0) onFiles(list);
    },
    [onFiles],
  );

  if (isBusy) {
    return (
      <div
        className={cn(
          "rounded-3xl border border-border bg-card/70 text-center shadow-[var(--shadow-elevated)] backdrop-blur",
          compact ? "p-6" : "p-12",
        )}
      >
        <Loader2
          className={cn("mx-auto animate-spin text-primary", compact ? "h-6 w-6" : "h-10 w-10")}
        />
        <h2 className={cn("font-semibold", compact ? "mt-3 text-base" : "mt-6 text-xl")}>
          AI is analyzing your statement...
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {statusLabel ?? "Working through your transactions"}
        </p>
        {fileName ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {fileName}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-3xl border-2 border-dashed border-border bg-card/60 text-center shadow-[var(--shadow-elevated)] backdrop-blur transition-colors",
        compact ? "p-6" : "p-10 sm:p-16",
        isDragging && "border-primary bg-primary/5",
      )}
    >
      {compact ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <UploadCloud className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Drop more statement PDFs to merge them into this dashboard
          </p>
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            Add statements
          </Button>
        </div>
      ) : (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold">Drop your bank statements</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            PDF statements only — add several at once and they'll be combined into one dashboard.
            Your files stay in your browser; only the extracted text is sent for categorization.
          </p>
          <Button className="mt-7" size="lg" onClick={() => inputRef.current?.click()}>
            Choose PDFs
          </Button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
