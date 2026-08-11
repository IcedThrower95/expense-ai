import { supabase } from "@/integrations/supabase/client";
import type { Transaction } from "@/lib/categories";
import { normalizeCategory } from "@/lib/categories";

export type SavedStatement = {
  id: string;
  fileName: string;
  createdAt: string;
  transactionCount: number;
  totalSpent: number;
};

export type SavedStatementDetail = SavedStatement & {
  transactions: Transaction[];
};

function totalSpentOf(transactions: Transaction[]) {
  return transactions
    .filter((t) => t.direction === "debit")
    .reduce((sum, t) => sum + t.amount, 0);
}

function coerceTransactions(value: unknown, statementId: string): Transaction[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const t = (raw ?? {}) as Partial<Transaction>;
    return {
      id: `${statementId}-${index}`,
      date: String(t.date ?? ""),
      description: String(t.description ?? ""),
      amount: Number(t.amount ?? 0),
      direction: t.direction === "credit" ? "credit" : "debit",
      category: normalizeCategory(t.category),
    };
  });
}

export async function listSavedStatements(): Promise<SavedStatement[]> {
  const { data, error } = await supabase
    .from("statements")
    .select("id, file_name, created_at, transaction_count, total_spent")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    fileName: row.file_name,
    createdAt: row.created_at,
    transactionCount: row.transaction_count,
    totalSpent: Number(row.total_spent),
  }));
}

export async function loadSavedStatement(id: string): Promise<SavedStatementDetail> {
  const { data, error } = await supabase
    .from("statements")
    .select("id, file_name, created_at, transaction_count, total_spent, transactions")
    .eq("id", id)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    fileName: data.file_name,
    createdAt: data.created_at,
    transactionCount: data.transaction_count,
    totalSpent: Number(data.total_spent),
    transactions: coerceTransactions(data.transactions, data.id),
  };
}

export async function saveStatement(input: {
  userId: string;
  fileName: string;
  transactions: Transaction[];
}): Promise<string> {
  const payload = input.transactions.map(({ date, description, amount, direction, category }) => ({
    date,
    description,
    amount,
    direction,
    category,
  }));
  const { data, error } = await supabase
    .from("statements")
    .insert({
      user_id: input.userId,
      file_name: input.fileName,
      transactions: payload,
      transaction_count: payload.length,
      total_spent: totalSpentOf(input.transactions),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateStatementTransactions(
  id: string,
  transactions: Transaction[],
): Promise<void> {
  const payload = transactions.map(({ date, description, amount, direction, category }) => ({
    date,
    description,
    amount,
    direction,
    category,
  }));
  const { error } = await supabase
    .from("statements")
    .update({
      transactions: payload,
      transaction_count: payload.length,
      total_spent: totalSpentOf(transactions),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSavedStatement(id: string): Promise<void> {
  const { error } = await supabase.from("statements").delete().eq("id", id);
  if (error) throw error;
}
