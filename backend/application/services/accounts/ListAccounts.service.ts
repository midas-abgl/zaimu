import type { Account, AccountsRepository } from "@zaimu/domain";

export class ListAccounts {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute(): Promise<Account[]> {
		const accounts = await this.accountsRepository.findAllByRecentlyUsed();

		return accounts;
	}
}
