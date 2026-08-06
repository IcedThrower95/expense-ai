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
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    const lines = new Map<number, string[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round((item.transform[5] as number) / 3);
      const bucket = lines.get(y) ?? [];
      bucket.push(item.str);
      lines.set(y, bucket);
    }

    const ordered = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.join(" ").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    pageTexts.push(ordered.join("\n"));
    onProgress?.(pageNumber, doc.numPages);
  }

  await doc.destroy();

  return { text: pageTexts.join("\n"), pages: doc.numPages };
}
