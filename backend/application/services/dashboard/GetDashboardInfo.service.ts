import type { AccountsRepository, DashboardInfo, GetDashboardInfoDTO } from "@zaimu/domain";

export class GetDashboardInfo {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute({ userEmail }: GetDashboardInfoDTO): Promise<DashboardInfo> {
		const { events, transactions } = await this.accountsRepository.findAllTransactionsAndEvents(userEmail);

		let balance = 0;

		for (const { amount } of events) {
			balance -= amount;
		}
		for (const { amount, destinationId, income, originId } of transactions) {
			if (destinationId) {
				balance += amount;
			} else if (originId && !income) {
				balance -= amount;
			}
		}

		return {
			balance,
		};
	}
}
