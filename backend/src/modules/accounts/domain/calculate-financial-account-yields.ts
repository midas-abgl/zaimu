import { addDays, format, isWeekend, startOfDay } from "date-fns";

export type YieldPeriod = "MONTHLY" | "YEARLY";

export interface YieldAccount {
	createdAt: Date;
	id: string;
	type: string;
	yieldPeriod?: null | YieldPeriod;
	yieldRate?: null | number;
	yieldRateHistories?: YieldRateHistory[];
}

export interface YieldRateHistory {
	effectiveDate: Date;
	yieldPeriod?: null | YieldPeriod;
	yieldRate?: null | number;
}

export interface YieldTransaction {
	amount: number;
	date: Date;
	destinationFinancialAccountId?: null | string;
	originFinancialAccountId?: null | string;
}

export interface CashbackCredit {
	cashbackAccountId?: null | string;
	cashbackAmount?: null | number;
	cashbackYieldPeriod?: null | YieldPeriod;
	cashbackYieldRate?: null | number;
	purchaseDate: Date;
}

export interface FinancialAccountYield {
	amount?: null | number;
	date: Date;
	financialAccountId: string;
	isExcluded: boolean;
	kind: "AUTOMATIC" | "MANUAL";
}

export function calculateFinancialAccountYieldBalances({
	accounts,
	cashbackCredits,
	holidays,
	initialRewardsBalances,
	today = new Date(),
	transactions,
	yields = [],
}: {
	accounts: YieldAccount[];
	cashbackCredits: CashbackCredit[];
	holidays: Date[];
	initialRewardsBalances: Map<string, number>;
	today?: Date;
	transactions: YieldTransaction[];
	yields?: FinancialAccountYield[];
}) {
	const todayKey = format(startOfDay(today), "yyyy-MM-dd");
	const holidayKeys = new Set(holidays.map(dateKey));
	const accountById = new Map(
		accounts.filter(account => account.type !== "CREDIT_CARD").map(account => [account.id, account]),
	);
	const events = new Map<string, Map<string, number>>();
	const cashbackEvents = new Map<string, Map<string, CashbackCredit[]>>();
	const yieldsByAccountId = new Map<string, FinancialAccountYield[]>();
	for (const yieldEntry of yields) {
		const accountYields = yieldsByAccountId.get(yieldEntry.financialAccountId) ?? [];
		accountYields.push(yieldEntry);
		yieldsByAccountId.set(yieldEntry.financialAccountId, accountYields);
	}
	const addEvent = (accountId: string, date: Date, amount: number) => {
		const day = dateKey(date);
		if (day > todayKey || !accountById.has(accountId)) return;
		const accountEvents = events.get(accountId) ?? new Map<string, number>();
		accountEvents.set(day, (accountEvents.get(day) ?? 0) + amount);
		events.set(accountId, accountEvents);
	};
	for (const account of accounts.filter(account => account.type === "REWARDS"))
		addEvent(account.id, account.createdAt, initialRewardsBalances.get(account.id) ?? 0);
	for (const transaction of transactions) {
		if (transaction.originFinancialAccountId)
			addEvent(transaction.originFinancialAccountId, transaction.date, -transaction.amount);
		if (transaction.destinationFinancialAccountId)
			addEvent(transaction.destinationFinancialAccountId, transaction.date, transaction.amount);
	}
	for (const credit of cashbackCredits) {
		if (!credit.cashbackAccountId || !credit.cashbackAmount || !accountById.has(credit.cashbackAccountId))
			continue;
		const day = dateKey(credit.purchaseDate);
		if (day > todayKey) continue;
		const accountEvents = cashbackEvents.get(credit.cashbackAccountId) ?? new Map<string, CashbackCredit[]>();
		const entries = accountEvents.get(day) ?? [];
		entries.push(credit);
		accountEvents.set(day, entries);
		cashbackEvents.set(credit.cashbackAccountId, accountEvents);
	}
	return new Map(
		accounts.map(account => [
			account.id,
			account.type === "CREDIT_CARD"
				? 0
				: Number(
						calculateYieldedBalance(
							account,
							events.get(account.id),
							cashbackEvents.get(account.id),
							holidayKeys,
							todayKey,
							yieldsByAccountId.get(account.id),
						).toFixed(4),
					),
		]),
	);
}

function dateKey(date: Date) {
	return format(date, "yyyy-MM-dd");
}

function dailyRate(rate?: null | number, period?: null | YieldPeriod) {
	if (!rate || !period) return 0;
	return (1 + rate / 100) ** (1 / (period === "MONTHLY" ? 21 : 252)) - 1;
}

function calculateYieldedBalance(
	account: YieldAccount,
	events: Map<string, number> | undefined,
	cashbackEvents: Map<string, CashbackCredit[]> | undefined,
	holidays: Set<string>,
	todayKey: string,
	yields: FinancialAccountYield[] | undefined,
) {
	const firstDay = [
		...(events?.keys() ?? []),
		...(cashbackEvents?.keys() ?? []),
		...(yields?.map(yieldEntry => dateKey(yieldEntry.date)) ?? []),
	].toSorted()[0];
	if (!firstDay) return 0;
	let balance = 0;
	const cashbackBalances = new Map<number, number>();
	for (let day = new Date(`${firstDay}T12:00:00`); dateKey(day) <= todayKey; day = addDays(day, 1)) {
		const key = dateKey(day);
		balance += events?.get(key) ?? 0;
		for (const credit of cashbackEvents?.get(key) ?? []) {
			const rate = dailyRate(credit.cashbackYieldRate, credit.cashbackYieldPeriod);
			if (rate) cashbackBalances.set(rate, (cashbackBalances.get(rate) ?? 0) + Number(credit.cashbackAmount));
			else balance += Number(credit.cashbackAmount);
		}
		const manualYields = yields?.filter(
			yieldEntry =>
				yieldEntry.kind === "MANUAL" && dateKey(yieldEntry.date) === key && !yieldEntry.isExcluded,
		);
		if (isWeekend(day) || holidays.has(key)) {
			for (const manualYield of manualYields ?? []) balance += manualYield.amount ?? 0;
			continue;
		}
		const yieldSettings = getYieldSettings(account, key);
		const automaticYield = yields?.find(
			yieldEntry => yieldEntry.kind === "AUTOMATIC" && dateKey(yieldEntry.date) === key,
		);
		if (balance > 0 && !automaticYield?.isExcluded) {
			const calculatedAmount = balance * dailyRate(yieldSettings.yieldRate, yieldSettings.yieldPeriod);
			balance += automaticYield?.amount ?? calculatedAmount;
		}
		for (const [rate, cashbackBalance] of cashbackBalances) {
			if (cashbackBalance > 0) cashbackBalances.set(rate, cashbackBalance * (1 + rate));
		}
		for (const manualYield of manualYields ?? []) {
			balance += manualYield.amount ?? 0;
		}
	}
	return balance + [...cashbackBalances.values()].reduce((total, value) => total + value, 0);
}

function getYieldSettings(account: YieldAccount, day: string) {
	const history = account.yieldRateHistories
		?.filter(item => dateKey(item.effectiveDate) <= day)
		.toSorted((left, right) => left.effectiveDate.valueOf() - right.effectiveDate.valueOf())
		.at(-1);
	return history ?? { yieldPeriod: account.yieldPeriod, yieldRate: account.yieldRate };
}
