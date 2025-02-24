import type { TransactionSelectable as Transaction } from "@zaimu/infra";

export type { Transaction };
export type PresentableTransaction = Pick<Transaction, "amount" | "categories" | "date" | "description">;
