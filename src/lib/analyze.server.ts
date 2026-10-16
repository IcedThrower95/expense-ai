import { streamText } from "ai";
import { createGeminiProvider } from "./ai-gateway.server";

import { normalizeCategory, isParentSender, type Transaction, type Category } from "./categories";

const SYSTEM_PROMPT = `You are a meticulous financial statement parser and spend categorizer for Indian bank/credit-card statements.

You receive raw text extracted from a bank statement PDF (column alignment may be lost).
Extract EVERY real transaction line. Ignore headers, footers, page numbers, balance summaries,
address blocks, interest-rate tables and marketing text.

For each transaction return:
- date: ISO "YYYY-MM-DD" when the year is known, else "YYYY-MM-DD" using the statement year if inferable; keep the original order otherwise.
- description: the cleaned merchant/narration text (keep merchant name, drop long reference numbers).
- amount: positive number, no currency symbol or separators.
- direction: "debit" for money going out (spend/withdrawal/purchase), "credit" for money coming in (refund, salary, reversal, payment received).
- category: EXACTLY one of the following strings.

CATEGORY RULES (strict):
1. "Shopping - Apparel & Shoes" — clothing, footwear, fashion & accessory brands and stores
   (Myntra, Ajio, Zara, H&M, Uniqlo, Nike, Adidas, Puma, Bata, Levis, Westside, Lifestyle, Max, Decathlon apparel, boutiques, tailors).
2. "Shopping - Electronics & Other" — electronics, gadgets, appliances, general retail and marketplaces
   (Amazon, Flipkart, Croma, Reliance Digital, Apple, Samsung, gaming, furniture, home goods, subscriptions to hardware/software products).
3. "Food - Delivery & Quick Commerce" — ONLY food/grocery delivery and quick commerce apps.
   Explicitly match keywords: Swiggy, Zomato, Zepto, Blinkit, Instamart, Dunzo, BigBasket, Licious, EatSure, Box8, Faasos.
4. "Food - Dining Out" — physically visited restaurants, cafes, bars, pubs, bakeries, food courts, hotels' F&B, coffee chains (Starbucks, Third Wave, Barista, CCD), breweries.
5. "Daily Essentials & Micro-spends" — small-value transactions (typically under 500), generic person-to-person UPI transfers with no clear merchant,
   local kirana/grocery shops, street vendors and street food (pani puri, chai, tea stall, juice, vada pav), auto/cab micro-fares, milk, water cans, paan shops, petty cash.
6. "Money Received from Parents" — ANY credit/incoming transfer where the sender name contains
   Pallavi, Sudhakara / Sudhakar, ACS Reddy, or Nagendra Mani (in any spelling/casing, with or without
   initials, UPI handles or bank suffixes). These are always direction "credit".
7. "Uncategorized / Other" — use ONLY when none of the above plausibly applies (rent, EMIs, salary credits, fuel, utilities, insurance, medical, travel, ATM withdrawals, card payments).

Disambiguation:
- A merchant that both delivers and has outlets: if the narration contains a delivery/quick-commerce keyword from rule 3, use rule 3; otherwise use rule 4.
- Amount matters: an unnamed UPI debit under 500 belongs in rule 5, even if the merchant is unclear.
- Rule 6 takes priority over every other rule when one of those sender names appears.
- Never invent transactions. Never merge two transactions into one.

OUTPUT FORMAT: return ONLY a JSON array (no prose, no markdown fences) of objects shaped like:
[{"date":"2024-03-11","description":"SWIGGY BANGALORE","amount":432.5,"direction":"debit","category":"Food - Delivery & Quick Commerce"}]`;

export function chunkStatementText(text: string, maxChars = 9000): string[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (size + line.length > maxChars && current.length > 0) {
      chunks.push(current.join("\n"));
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.length > 0) chunks.push(current.join("\n"));
  return chunks.length > 0 ? chunks : [text];
}

function parseJsonArray(raw: string): unknown[] {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) text = fence[1].trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.abs(value);
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

export function coerceTransactions(rows: unknown[], offset: number): Transaction[] {
  const out: Transaction[] = [];
  rows.forEach((row, i) => {
    if (typeof row !== "object" || row === null) return;
    const r = row as Record<string, unknown>;
    const description = String(r["description"] ?? "").trim();
    const amount = toNumber(r["amount"]);
    if (!description || amount <= 0) return;
    const direction = String(r["direction"] ?? "debit").toLowerCase() === "credit" ? "credit" : "debit";
    const fromParents = direction === "credit" && isParentSender(description);
    out.push({
      id: `txn-${offset + i}`,
      date: String(r["date"] ?? "").trim() || "—",
      description: description.slice(0, 160),
      amount,
      direction,
      category: (fromParents
        ? "Money Received from Parents"
        : normalizeCategory(r["category"])) as Category,
    });
  });
  return out;
}

async function analyzeChunk(
  provider: ReturnType<typeof createGeminiProvider>,
  chunk: string,
): Promise<unknown[]> {
  const result = streamText({
    model: provider("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    prompt: `Statement text:\n\n${chunk}`,
  });
  const text = await result.text;
  console.log(
    `[analyze-chunk] chunkLen=${chunk.length} responseLen=${text.length}`,
  );
  console.log("[analyze-chunk] AI response (first 500):", text.slice(0, 500));
  const parsed = parseJsonArray(text);
  console.log(`[analyze-chunk] parsed ${parsed.length} items from chunk`);
  return parsed;
}

export async function analyzeStatementText(text: string, apiKey: string): Promise<Transaction[]> {
  const provider = createGeminiProvider(apiKey);

  const chunks = chunkStatementText(text).slice(0, 12);

  const results: unknown[][] = [];
  const batchSize = 3;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const settled = await Promise.all(
      batch.map(async (c) => {
        try {
          return await analyzeChunk(provider, c);
        } catch (error) {
          console.error("chunk analysis failed", error);
          return [] as unknown[];
        }
      }),
    );
    results.push(...settled);
  }

  const transactions: Transaction[] = [];
  for (const rows of results) {
    transactions.push(...coerceTransactions(rows, transactions.length));
  }
  return transactions;
}
