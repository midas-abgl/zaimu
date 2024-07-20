import type { AccountsRepository, DashboardInfo, GetDashboardInfoDTO } from "@zaimu/domain";
import { differenceInCalendarWeeks, getWeeksInMonth, previousSunday } from "date-fns";

export class GetDashboardInfo {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute({ userEmail }: GetDashboardInfoDTO): Promise<DashboardInfo> {
		const incomeSources = await this.accountsRepository.findIncomeSources(userEmail);
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

		const today = new Date();
		const firstDayOfMonth = new Date(today);
		firstDayOfMonth.setDate(1);

		let expectedIncome = 0;
		for (const { id, income } of incomeSources) {
			const { amount, frequency } = income!;

			const incomeTransactions = transactions.filter(transaction => transaction.originId === id);
			switch (frequency) {
				case "weekly": {
					let times = getWeeksInMonth(today) - differenceInCalendarWeeks(today, firstDayOfMonth);

					// If the user already received this week's paycheck
					if (incomeTransactions.at(-1)!.date.getDate() >= previousSunday(today).getDate()) {
						times -= 1;
					}

					expectedIncome += amount * times;
					break;
				}
				case "monthly": {
					// if the user hasn't received this month's paycheck
					if (incomeTransactions.length === 0) {
						expectedIncome += amount;
					}

					break;
				}
			}
		}

		return {
			balance,
			expectedIncome,
		};
	}
}
