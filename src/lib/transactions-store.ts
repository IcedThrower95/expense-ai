import { type Transaction } from "./categories";

/**
 * A simple in-memory store so the /family route can access the
 * transactions that were parsed on the index page.
 * This avoids prop-drilling or complex state management.
 */
let _transactions: Transaction[] = [];

export function setSharedTransactions(txns: Transaction[]) {
  _transactions = txns;
}

export function getSharedTransactions(): Transaction[] {
  return _transactions;
}
