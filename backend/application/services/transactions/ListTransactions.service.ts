import type { Transaction, TransactionsRepository } from "@zaimu/domain";

export interface ListTransactionsDTO {
	userEmail: string;
}

export class ListTransactions {
	constructor(private readonly transactionsRepository: TransactionsRepository) {}

	public async execute({ userEmail }: ListTransactionsDTO): Promise<Transaction[]> {
		const transactions = await this.transactionsRepository.findAllByDate(userEmail);

		return transactions;
	}
}
