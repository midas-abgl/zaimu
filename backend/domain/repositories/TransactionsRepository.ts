import type { AddTransactionDTO } from "~/dtos";
import type { Transaction } from "~/entities";

export abstract class TransactionsRepository {
	abstract create(data: AddTransactionDTO): Promise<Transaction>;
	abstract delete(id: string): Promise<void>;
	abstract findById(id: string): Promise<Transaction | undefined>;
	abstract findCategoriesByLastUsed(): Promise<string[]>;
}
