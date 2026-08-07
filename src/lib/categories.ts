export const CATEGORIES = [
  "Shopping - Apparel & Shoes",
  "Shopping - Electronics & Other",
  "Food - Delivery & Quick Commerce",
  "Food - Dining Out",
  "Daily Essentials & Micro-spends",
  "Money Received from Parents",
  "Uncategorized / Other",
] as const;

export const PARENT_SENDERS = [
  "pallavi",
  "sudhakara",
  "sudhakar",
  "acs reddy",
  "acsreddy",
  "nagendra mani",
  "nagendramani",
];

export function isParentSender(description: string) {
  const d = description.toLowerCase();
  return PARENT_SENDERS.some((name) => d.includes(name));
}

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<
  Category,
  { label: string; short: string; token: string }
> = {
  "Shopping - Apparel & Shoes": {
    label: "Good Shopping",
    short: "Apparel & Shoes",
    token: "var(--chart-1)",
  },
  "Shopping - Electronics & Other": {
    label: "Shopping - Electronics & Other",
    short: "Electronics & Other",
    token: "var(--chart-2)",
  },
  "Food - Delivery & Quick Commerce": {
    label: "Food - Delivery & Quick Commerce",
    short: "Delivery & Quick Commerce",
    token: "var(--chart-3)",
  },
  "Food - Dining Out": {
    label: "Food - Dining Out",
    short: "Dining Out",
    token: "var(--chart-4)",
  },
  "Daily Essentials & Micro-spends": {
    label: "Daily Essentials & Micro-spends",
    short: "Daily Essentials",
    token: "var(--chart-5)",
  },
  "Money Received from Parents": {
    label: "Money Received from Parents",
    short: "From Parents",
    token: "var(--chart-7)",
  },
  "Uncategorized / Other": {
    label: "Uncategorized / Other",
    short: "Other",
    token: "var(--chart-6)",
  },
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: "debit" | "credit";
  category: Category;
};

export function normalizeCategory(value: unknown): Category {
  const raw = String(value ?? "").toLowerCase();
  const match = CATEGORIES.find((c) => c.toLowerCase() === raw);
  if (match) return match;
  if (raw.includes("apparel") || raw.includes("shoe")) return "Shopping - Apparel & Shoes";
  if (raw.includes("electronic")) return "Shopping - Electronics & Other";
  if (raw.includes("delivery") || raw.includes("quick")) return "Food - Delivery & Quick Commerce";
  if (raw.includes("dining")) return "Food - Dining Out";
  if (raw.includes("essential") || raw.includes("micro")) return "Daily Essentials & Micro-spends";
  return "Uncategorized / Other";
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
