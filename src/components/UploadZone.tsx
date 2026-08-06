import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadZoneProps = {
  onFile: (file: File) => void;
  isBusy: boolean;
  statusLabel: string | null;
  fileName: string | null;
};

export function UploadZone({ onFile, isBusy, statusLabel, fileName }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  if (isBusy) {
    return (
      <div className="rounded-3xl border border-border bg-card/70 p-12 text-center shadow-[var(--shadow-elevated)] backdrop-blur">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <h2 className="mt-6 text-xl font-semibold">AI is analyzing your statement...</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {statusLabel ?? "Working through your transactions"}
        </p>
        {fileName ? (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs text-muted-foreground">
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
        "rounded-3xl border-2 border-dashed border-border bg-card/60 p-10 text-center shadow-[var(--shadow-elevated)] backdrop-blur transition-colors sm:p-16",
        isDragging && "border-primary bg-primary/5",
      )}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <UploadCloud className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold">Drop your bank statement</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        PDF statements only. Your file stays in your browser — only the extracted text is sent for
        categorization.
      </p>
      <Button className="mt-7" size="lg" onClick={() => inputRef.current?.click()}>
        Choose PDF
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
