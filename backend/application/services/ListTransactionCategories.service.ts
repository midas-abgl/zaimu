import type { AccountsRepository } from "@zaimu/domain";

export class ListTransactionCategories {
	constructor(private accountsRepository: AccountsRepository) {}

	public async execute(): Promise<string[]> {
		const categories = await this.accountsRepository.findAllTransactionCategories();
		return categories;
	}
}
