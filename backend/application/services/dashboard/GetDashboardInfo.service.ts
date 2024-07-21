import type { AccountsRepository, DashboardInfo, GetDashboardInfoDTO } from "@zaimu/domain";
import { differenceInCalendarWeeks, getWeeksInMonth, isAfter, isSameMonth, previousSunday } from "date-fns";

export class GetDashboardInfo {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute({ userEmail }: GetDashboardInfoDTO): Promise<DashboardInfo> {
		const incomeSources = await this.accountsRepository.findIncomeSources(userEmail);
		const { events, transactions } = await this.accountsRepository.findAllTransactionsAndEvents(userEmail);

		let balance = 0;
		let expectedExpenses = 0;
		const today = new Date();

		for (const {
			amountToPay,
			id,
			details: { dueDate, installment },
		} of events) {
			if (
				isSameMonth(dueDate, today) &&
				!transactions.find(({ date, eventId }) => eventId === id && !isAfter(date, today))
			) {
				expectedExpenses += installment || amountToPay;
			}
		}

		for (const { amount, date, destinationId, eventId, income, originId } of transactions) {
			if (destinationId) {
				balance += amount;
				continue;
			}

			if (originId && !income) {
				// Past transaction
				if (!isAfter(date, today)) {
					balance -= amount;
					continue;
				}

				// Planned transaction not related to an event
				if (!eventId) {
					expectedExpenses += amount;
				}
			}
		}

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
			expectedExpenses,
			expectedIncome,
		};
	}
}
