# AI Expense Analyzer

A single-page app where you drop in a bank statement PDF and get back a categorized spending dashboard.

## What gets built

**Upload view (`/`)**
- Drag-and-drop zone for a PDF (click-to-browse fallback), file name + size preview.
- Loading state: spinner with "AI is analyzing your statement…", plus sub-steps ("Reading pages", "Categorizing transactions").
- Clear error states for non-PDF files, password-protected/scanned PDFs, and AI errors (rate limit / credits).

**Results dashboard**
- Three summary cards: Total Spent, Top Category, Biggest Expense.
- Colorful pie chart (Recharts) of the five categories, with a legend showing amount and % share.
- Paginated table: Date | Description | Amount | AI Category, with search and sort by date/amount.
- Every row's category is editable via a dropdown; totals and the pie chart recompute instantly.
- "Analyze another statement" reset button.

**Categories (fixed set)**
1. Shopping — Apparel & Shoes (labelled "Good Shopping" in the UI, with a distinct accent)
2. Shopping — Electronics & Other
3. Food — Delivery & Quick Commerce (Swiggy, Zomato, Zepto, Blinkit, Instamart…)
4. Food — Dining Out
5. Daily Essentials & Micro-spends (generic UPI, local kirana, street vendors)

Plus an "Uncategorized / Other" fallback so nothing silently disappears — visible in the table, shown in the chart only if non-empty.

**Design**
Premium fintech: dark-first surface, deep ink background, soft elevated cards, one confident accent, tabular numerals for money, restrained motion. All colors as semantic tokens in `src/styles.css` — no hardcoded color classes.

## Technical notes

- Stack is TanStack Start (React 19 + Vite), not Next.js — same React/Tailwind/shadcn/Recharts experience, routing via TanStack Router. Home page is rewritten at `src/routes/index.tsx`.
- PDF text extraction runs **in the browser** with `pdfjs-dist` (loaded client-only to avoid SSR issues), page by page, preserving line order. Only the extracted text leaves the browser — the PDF file itself is never uploaded.
- A `createServerFn` (`src/lib/analyze.functions.ts`) receives the statement text and returns structured transactions. It calls Lovable AI (`openai/gpt-5.6-sol`) via the gateway Responses API with streaming, a strict JSON schema (`date`, `description`, `amount`, `category`), and a prompt that pins the five buckets and the delivery/quick-commerce keyword rules.
- Long statements are chunked by line count and sent as parallel-batched requests, then merged, so a large PDF doesn't blow the context window.
- Debits only are counted toward spend; credits/refunds are parsed and excluded from totals.
- Results live in client state only — no database, nothing persisted. (Say the word and I'll add Cloud + saved statement history.)
- Lovable AI needs a `LOVABLE_API_KEY`; I'll provision it during the build. No OpenAI account or key from you.

## Out of scope for this pass
Scanned/image-only PDFs (no OCR), CSV/XLS import, multi-statement history, auth.
