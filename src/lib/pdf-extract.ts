export type PdfExtractResult = {
  text: string;
  pages: number;
};

export async function extractPdfText(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PdfExtractResult> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const pageTexts: string[] = [];
  const rawPageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    // Collect all raw text items for fallback
    const rawParts: string[] = [];

    // Bucket items by Y-coordinate to reconstruct lines.
    // Use a finer bucket (divide by 2) so tightly-spaced bank statement
    // rows don't merge into garbled text.
    const lines = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      rawParts.push(item.str);
      const y = Math.round((item.transform[5] as number) / 2);
      const x = item.transform[4] as number;
      const bucket = lines.get(y) ?? [];
      bucket.push({ x, str: item.str });
      lines.set(y, bucket);
    }

    // Sort items within each line by X position (left to right),
    // then sort lines top to bottom (highest Y first).
    const ordered = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) =>
        parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);

    pageTexts.push(ordered.join("\n"));
    rawPageTexts.push(rawParts.join(" "));
    onProgress?.(pageNumber, doc.numPages);
  }

  await doc.cleanup();

  const bucketedText = pageTexts.join("\n");
  const rawText = rawPageTexts.join("\n");

  // If the bucketed approach produced very little text per page
  // (e.g. garbled due to unusual coordinate systems), fall back to
  // raw concatenation which is more reliable for edge-case layouts.
  const avgBucketed = bucketedText.trim().length / Math.max(doc.numPages, 1);
  const avgRaw = rawText.trim().length / Math.max(doc.numPages, 1);
  const text = avgBucketed < 100 && avgRaw > avgBucketed ? rawText : bucketedText;

  console.log(
    `[pdf-extract] file="${file.name}" pages=${doc.numPages} ` +
      `bucketedLen=${bucketedText.length} rawLen=${rawText.length} ` +
      `usedFallback=${text === rawText}`,
  );
  console.log("[pdf-extract] first 2000 chars of extracted text:", text.slice(0, 2000));

  return { text, pages: doc.numPages };
}
