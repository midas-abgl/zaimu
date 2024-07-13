import type { AddTransactionDTO } from "~/dtos/AddTransaction.dto";
import type { Transaction } from "~/entities";

export abstract class TransactionsRepository {
	abstract create(data: AddTransactionDTO): Promise<Transaction>;
	abstract findCategoriesByLastUsed(): Promise<string[]>;
}
