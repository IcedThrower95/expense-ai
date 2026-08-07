import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AnalyzeInput = z.object({
  text: z.string().min(20).max(400_000),
});

export const analyzeStatement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { transactions: [], error: "AI is not configured for this project." };
    }
    const { analyzeStatementText } = await import("./analyze.server");
    try {
      const transactions = await analyzeStatementText(data.text, apiKey);
      if (transactions.length === 0) {
        return {
          transactions: [],
          error:
            "No transactions could be read from this statement. It may be a scanned image or an unsupported layout.",
        };
      }
      return { transactions, error: null as string | null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("analyzeStatement failed", error);
      if (message.includes("429") || /rate.?limit/i.test(message)) {
        return { transactions: [], error: "AI rate limit reached. Please try again in a moment." };
      }
      if (
        message.includes("402") ||
        /payment_required|not enough credits|insufficient/i.test(message)
      ) {
        return {
          transactions: [],
          error:
            "AI credits are exhausted for this workspace. Add credits in workspace billing settings, then re-upload — your existing statements stay on the dashboard.",
        };
      }
      return { transactions: [], error: "The AI could not analyze this statement. Please try again." };

    }
  });
