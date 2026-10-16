import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AnalyzeInput = z.object({
  text: z.string().min(20).max(400_000),
});

export const analyzeStatement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      return { transactions: [], error: "Gemini API key is not configured for this project." };
    }

    const { analyzeStatementText, chunkStatementText } = await import("./analyze.server");
    const chunks = chunkStatementText(data.text);
    console.log(
      `[analyze] received text length=${data.text.length} chunks=${chunks.length}`,
    );
    console.log("[analyze] first 500 chars of text:", data.text.slice(0, 500));
    try {
      const transactions = await analyzeStatementText(data.text, apiKey);
      console.log(`[analyze] parsed ${transactions.length} transactions`);
      if (transactions.length === 0) {
        return {
          transactions: [],
          error:
            `No transactions could be read from this statement (extracted ${data.text.length} chars). ` +
            `The layout may not be recognized. Check the browser console (F12) for "[pdf-extract]" logs to see the raw text.`,
        };
      }
      return { transactions, error: null as string | null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("analyzeStatement failed", error);
      if (message.includes("429")) {
        return { transactions: [], error: "AI rate limit reached. Please try again in a moment." };
      }
      if (message.includes("402")) {
        return { transactions: [], error: "AI credits exhausted. Add credits to continue." };
      }
      return { transactions: [], error: `AI error: ${message}` };
    }
  });
