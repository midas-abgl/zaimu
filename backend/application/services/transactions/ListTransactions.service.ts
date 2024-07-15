import type { Transaction, TransactionsRepository } from "@zaimu/domain";

export class ListTransactions {
	constructor(private readonly transactionsRepository: TransactionsRepository) {}

	public async execute(): Promise<Transaction[]> {
		const transactions = await this.transactionsRepository.findAllByDate();

		return transactions;
	}
}
