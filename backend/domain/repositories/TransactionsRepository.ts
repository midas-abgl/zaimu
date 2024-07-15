import type { AddTransactionDTO, EditTransactionDTO } from "~/dtos";
import type { Transaction } from "~/entities";

export abstract class TransactionsRepository {
	abstract create(data: AddTransactionDTO): Promise<Transaction>;
	abstract delete(id: string): Promise<void>;
	abstract findAllByDate(): Promise<Transaction[]>;
	abstract findById(id: string): Promise<Transaction | undefined>;
	abstract findCategoriesByLastUsed(): Promise<string[]>;
	abstract update(id: string, data: Omit<EditTransactionDTO, "transactionId">): Promise<Transaction>;
}
