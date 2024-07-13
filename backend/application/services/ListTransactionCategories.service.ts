import type { TransactionsRepository } from "@zaimu/domain";

export class ListTransactionCategories {
	constructor(private readonly transactionsRepository: TransactionsRepository) {}

	public async execute(): Promise<string[]> {
		const categories = await this.transactionsRepository.findCategoriesByLastUsed();

		return categories;
	}
}
