import { addDays, differenceInMonths, differenceInYears, format, isWeekend, startOfDay } from "date-fns";
import type { FinancialAccount } from "./api";
import { normalizeInstitutionName } from "./financial-institution";

type AccountTransaction = Pick<
	import("./api").Transaction,
	"amount" | "destinationFinancialAccountId" | "originFinancialAccountId"
> & { date?: Date | string };
type CashbackPurchase = Pick<
	import("./api").CreditPurchase,
	"cashbackAccountId" | "cashbackAmount" | "cashbackYieldPeriod" | "cashbackYieldRate" | "purchaseDate"
>;

export interface FinancialAccountYieldEntry {
	amount: number;
	date: string;
}

export function calculateCashbackValue(
	amount: number,
	awardedAt: Date,
	yieldRate?: null | number,
	yieldPeriod?: "MONTHLY" | "YEARLY" | null,
	today = new Date(),
) {
	if (!yieldRate || !yieldPeriod) return amount;
	const periods = Math.max(
		0,
		yieldPeriod === "MONTHLY" ? differenceInMonths(today, awardedAt) : differenceInYears(today, awardedAt),
	);
	return amount * (1 + yieldRate / 100) ** periods;
}

export function calculateFinancialAccountBalances(
	accounts: FinancialAccount[],
	transactions: AccountTransaction[],
	cashbackPurchases: CashbackPurchase[] = [],
	holidays: string[] = [],
	today = new Date(),
): FinancialAccount[] {
	const todayKey = format(startOfDay(today), "yyyy-MM-dd");
	const holidayKeys = new Set(holidays.map(date => date.slice(0, 10)));
	const accountById = new Map(
		accounts.filter(account => account.type !== "CREDIT_CARD").map(account => [account.id, account]),
	);
	const events = new Map<string, Map<string, number>>();
	const cashbackEvents = new Map<
		string,
		Map<
			string,
			Array<{ amount: number; yieldPeriod?: "MONTHLY" | "YEARLY" | null; yieldRate?: null | number }>
		>
	>();
	const addEvent = (accountId: string, date: string | Date | undefined, amount: number) => {
		const day = dateKey(date ?? todayKey);
		if (day > todayKey || !accountById.has(accountId)) return;
		const accountEvents = events.get(accountId) ?? new Map<string, number>();
		accountEvents.set(day, (accountEvents.get(day) ?? 0) + amount);
		events.set(accountId, accountEvents);
	};
	for (const account of accounts.filter(account => account.type === "REWARDS"))
		addEvent(account.id, account.createdAt, account.rewardsAccount?.initialBalance ?? 0);
	for (const transaction of transactions) {
		if (transaction.originFinancialAccountId)
			addEvent(transaction.originFinancialAccountId, transaction.date, -transaction.amount);
		if (transaction.destinationFinancialAccountId)
			addEvent(transaction.destinationFinancialAccountId, transaction.date, transaction.amount);
	}
	for (const purchase of cashbackPurchases) {
		if (
			!purchase.cashbackAccountId ||
			!purchase.cashbackAmount ||
			!accountById.has(purchase.cashbackAccountId)
		)
			continue;
		const day = purchase.purchaseDate.slice(0, 10);
		if (day > todayKey) continue;
		const accountEvents = cashbackEvents.get(purchase.cashbackAccountId) ?? new Map();
		const entries = accountEvents.get(day) ?? [];
		entries.push({
			amount: purchase.cashbackAmount,
			yieldPeriod: purchase.cashbackYieldPeriod,
			yieldRate: purchase.cashbackYieldRate,
		});
		accountEvents.set(day, entries);
		cashbackEvents.set(purchase.cashbackAccountId, accountEvents);
	}
	return accounts.map(account => ({
		...account,
		balance:
			account.type === "CREDIT_CARD"
				? null
				: Number(
						calculateYieldedBalance(
							account,
							events.get(account.id),
							cashbackEvents.get(account.id),
							holidayKeys,
							todayKey,
						).toFixed(4),
					),
	}));
}

export function calculateFinancialAccountYieldEntries(
	account: FinancialAccount,
	transactions: AccountTransaction[],
	holidays: string[] = [],
	today = new Date(),
): FinancialAccountYieldEntry[] {
	if (account.type === "CREDIT_CARD") return [];
	const todayKey = format(startOfDay(today), "yyyy-MM-dd");
	const events = new Map<string, number>();
	for (const transaction of transactions) {
		const day = dateKey(transaction.date ?? todayKey);
		if (day > todayKey) continue;
		const amount =
			transaction.destinationFinancialAccountId === account.id
				? transaction.amount
				: transaction.originFinancialAccountId === account.id
					? -transaction.amount
					: 0;
		events.set(day, (events.get(day) ?? 0) + amount);
	}
	const firstDay = [...events.keys()].toSorted()[0];
	if (!firstDay) return [];
	const holidayKeys = new Set(holidays.map(date => date.slice(0, 10)));
	const entries: FinancialAccountYieldEntry[] = [];
	let balance = 0;
	for (
		let day = new Date(`${firstDay}T12:00:00`);
		format(day, "yyyy-MM-dd") <= todayKey;
		day = addDays(day, 1)
	) {
		const key = format(day, "yyyy-MM-dd");
		balance += events.get(key) ?? 0;
		if (isWeekend(day) || holidayKeys.has(key) || balance <= 0) continue;
		const settings = getYieldSettings(account, key);
		const amount = balance * getDailyYieldRate(settings.yieldRate, settings.yieldPeriod);
		if (amount > 0) {
			entries.push({ amount, date: key });
			balance += amount;
		}
	}
	return entries;
}

function dateKey(value: Date | string) {
	if (typeof value === "string") return value.slice(0, 10);
	return format(value, "yyyy-MM-dd");
}

function getDailyYieldRate(rate?: null | number, period?: "MONTHLY" | "YEARLY" | null) {
	if (!rate || !period) return 0;
	return (1 + rate / 100) ** (1 / (period === "MONTHLY" ? 21 : 252)) - 1;
}

function calculateYieldedBalance(
	account: FinancialAccount,
	events: Map<string, number> | undefined,
	cashbackEvents:
		| Map<
				string,
				Array<{ amount: number; yieldPeriod?: "MONTHLY" | "YEARLY" | null; yieldRate?: null | number }>
		  >
		| undefined,
	holidays: Set<string>,
	todayKey: string,
) {
	const firstDay = [...(events?.keys() ?? []), ...(cashbackEvents?.keys() ?? [])].toSorted()[0];
	if (!firstDay) return 0;
	let balance = 0;
	const cashbackBalances = new Map<number, number>();
	for (
		let day = new Date(`${firstDay}T12:00:00`);
		format(day, "yyyy-MM-dd") <= todayKey;
		day = addDays(day, 1)
	) {
		const key = format(day, "yyyy-MM-dd");
		balance += events?.get(key) ?? 0;
		for (const cashback of cashbackEvents?.get(key) ?? []) {
			const dailyRate = getDailyYieldRate(cashback.yieldRate, cashback.yieldPeriod);
			if (dailyRate)
				cashbackBalances.set(dailyRate, (cashbackBalances.get(dailyRate) ?? 0) + cashback.amount);
			else balance += cashback.amount;
		}
		if (isWeekend(day) || holidays.has(key)) continue;
		const yieldSettings = getYieldSettings(account, key);
		if (balance > 0) balance *= 1 + getDailyYieldRate(yieldSettings.yieldRate, yieldSettings.yieldPeriod);
		for (const [dailyRate, cashbackBalance] of cashbackBalances) {
			if (cashbackBalance > 0) cashbackBalances.set(dailyRate, cashbackBalance * (1 + dailyRate));
		}
	}
	return balance + [...cashbackBalances.values()].reduce((total, value) => total + value, 0);
}

function getYieldSettings(account: FinancialAccount, day: string) {
	const history = account.yieldRateHistories
		?.filter(item => item.effectiveDate.slice(0, 10) <= day)
		.toSorted((left, right) => left.effectiveDate.localeCompare(right.effectiveDate))
		.at(-1);
	return history ?? { yieldPeriod: account.yieldPeriod, yieldRate: account.yieldRate };
}

const financialAccountTypeLabels = {
	CASH: "Dinheiro",
	CHECKING: "Conta corrente",
	CREDIT_CARD: "Cartão de crédito",
	INVESTMENT: "Investimentos",
	REWARDS: "Pontos / cashback",
	SAVINGS: "Poupança",
} as const;

const financialAccountOptionPrefixes = {
	CASH: "Dinheiro",
	CHECKING: "Conta",
	CREDIT_CARD: "Cartão",
	INVESTMENT: "Investimentos",
	REWARDS: "Pontos/cashback",
	SAVINGS: "Poupança",
} as const;

const displayNameCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

export function getFinancialAccountDisplayName(
	account: Pick<FinancialAccount, "institution" | "name" | "type">,
) {
	return account.name?.trim() || account.institution?.name || financialAccountTypeLabels[account.type];
}

export function getFinancialAccountTitle(account: Pick<FinancialAccount, "institution" | "name" | "type">) {
	const name = account.name?.trim();
	const repeatsInstitution =
		name &&
		account.institution &&
		normalizeInstitutionName(name) === normalizeInstitutionName(account.institution.name);
	return name && !repeatsInstitution ? name : financialAccountTypeLabels[account.type];
}

export function getFinancialAccountOptionLabel(
	account: Pick<FinancialAccount, "institution" | "name" | "type">,
) {
	const displayName = getFinancialAccountDisplayName(account);
	return displayName === financialAccountTypeLabels[account.type]
		? displayName
		: `${financialAccountOptionPrefixes[account.type]} ${displayName}`;
}

export function compareFinancialAccountsByOptionLabel(
	left: Pick<FinancialAccount, "institution" | "name" | "type">,
	right: Pick<FinancialAccount, "institution" | "name" | "type">,
) {
	return displayNameCollator.compare(
		getFinancialAccountOptionLabel(left),
		getFinancialAccountOptionLabel(right),
	);
}

export function compareFinancialAccountsByDisplayName(
	left: Pick<FinancialAccount, "institution" | "name" | "type">,
	right: Pick<FinancialAccount, "institution" | "name" | "type">,
) {
	return displayNameCollator.compare(
		getFinancialAccountDisplayName(left),
		getFinancialAccountDisplayName(right),
	);
}

export function compareFinancialAccountsByTitle(
	left: Pick<FinancialAccount, "institution" | "name" | "type">,
	right: Pick<FinancialAccount, "institution" | "name" | "type">,
) {
	return displayNameCollator.compare(getFinancialAccountTitle(left), getFinancialAccountTitle(right));
}

export function getFinancialAccountTypeLabel(type: FinancialAccount["type"]) {
	return financialAccountTypeLabels[type];
}

export function getFinancialAccountCurrencyValue(account: FinancialAccount) {
	if (account.type === "CREDIT_CARD") return 0;
	if (account.type !== "REWARDS") return account.balance ?? 0;
	if (account.rewardsAccount?.kind === "CASHBACK") return account.balance ?? 0;
	const points = account.rewardsAccount?.conversionPoints;
	const amount = account.rewardsAccount?.conversionAmount;
	return points && amount ? ((account.balance ?? 0) / points) * amount : 0;
}
