import type { AccountsRepository, DashboardInfo, GetDashboardInfoDTO } from "@zaimu/domain";
import {
	addMonths,
	differenceInCalendarWeeks,
	getWeeksInMonth,
	isAfter,
	isSameMonth,
	isSunday,
	previousSunday,
	setDate,
} from "date-fns";

export class GetDashboardInfo {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute({ userEmail }: GetDashboardInfoDTO): Promise<DashboardInfo> {
		const incomeSources = await this.accountsRepository.findIncomeSources(userEmail);
		const { events, transactions } = await this.accountsRepository.findAllTransactionsAndEvents(userEmail);

		let balance = 0;
		const expenses = {
			current: 0,
			next: 0,
		};
		const today = new Date();

		for (const {
			amountToPay,
			id,
			details: { dueDate, installment },
		} of events) {
			const amount = installment || amountToPay;
			const paymentTransaction = transactions.find(
				({ date, eventId }) => eventId === id && !isAfter(date, today),
			);

			if (!paymentTransaction) {
				if (isSameMonth(dueDate, today)) {
					expenses.current += amount;
				} else {
					expenses.next += amount;
				}
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
					if (isSameMonth(date, today)) {
						expenses.current += amount;
					} else {
						expenses.next += amount;
					}
				}
			}
		}

		const firstDayOfMonth = setDate(today, 1);
		const nextMonth = addMonths(today, 1);

		const expectedIncome = {
			current: 0,
			next: 0,
		};
		for (const { id, income } of incomeSources) {
			const { amount, frequency } = income!;

			const incomeTransactions = transactions.filter(transaction => transaction.originId === id);
			switch (frequency) {
				case "weekly": {
					let times = getWeeksInMonth(today) - differenceInCalendarWeeks(today, firstDayOfMonth);

					// If the user already received this week's paycheck
					if (
						incomeTransactions.at(-1)!.date.getDate() >=
						(isSunday(today) ? today.getDate() : previousSunday(today).getDate())
					) {
						times -= 1;
					}

					expectedIncome.current += amount * times;
					expectedIncome.next += amount * (getWeeksInMonth(nextMonth) - 1);

					break;
				}
				case "monthly": {
					// if the user hasn't received this month's paycheck
					if (incomeTransactions.length === 0) {
						expectedIncome.current += amount;
					}

					expectedIncome.next += amount;
					break;
				}
			}
		}

		return {
			balance,
			expenses,
			income: expectedIncome,
		};
	}
}
