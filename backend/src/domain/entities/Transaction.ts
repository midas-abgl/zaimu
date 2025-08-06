import type { TransactionSelectable as Transaction } from "@infra";

export type { Transaction };
export type PresentableTransaction = Pick<Transaction, "amount" | "categories" | "date" | "description">;
