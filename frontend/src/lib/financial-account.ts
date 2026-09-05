import { differenceInMonths, differenceInYears } from "date-fns";
import type { FinancialAccount } from "./api";
import { normalizeInstitutionName } from "./financial-institution";

type AccountTransaction = Pick<
	import("./api").Transaction,
	"amount" | "destinationFinancialAccountId" | "originFinancialAccountId"
>;
type CashbackPurchase = Pick<
	import("./api").CreditPurchase,
	"cashbackAccountId" | "cashbackAmount" | "cashbackYieldPeriod" | "cashbackYieldRate" | "purchaseDate"
>;

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
): FinancialAccount[] {
	const balances = new Map(
		accounts
			.filter(account => account.type !== "CREDIT_CARD" && account.type !== "REWARDS")
			.map(account => [account.id, 0]),
	);
	const transactionAccountIds = new Set(balances.keys());
	for (const account of accounts.filter(account => account.type === "REWARDS")) {
		balances.set(account.id, account.rewardsAccount?.initialBalance ?? 0);
	}
	for (const transaction of transactions) {
		if (
			transaction.originFinancialAccountId &&
			transactionAccountIds.has(transaction.originFinancialAccountId)
		) {
			balances.set(
				transaction.originFinancialAccountId,
				balances.get(transaction.originFinancialAccountId)! - transaction.amount,
			);
		}
		if (
			transaction.destinationFinancialAccountId &&
			transactionAccountIds.has(transaction.destinationFinancialAccountId)
		) {
			balances.set(
				transaction.destinationFinancialAccountId,
				balances.get(transaction.destinationFinancialAccountId)! + transaction.amount,
			);
		}
	}
	for (const purchase of cashbackPurchases) {
		if (!purchase.cashbackAccountId || !purchase.cashbackAmount || !balances.has(purchase.cashbackAccountId))
			continue;
		balances.set(
			purchase.cashbackAccountId,
			balances.get(purchase.cashbackAccountId)! +
				calculateCashbackValue(
					purchase.cashbackAmount,
					new Date(`${purchase.purchaseDate.slice(0, 10)}T12:00:00`),
					purchase.cashbackYieldRate,
					purchase.cashbackYieldPeriod,
				),
		);
	}
	return accounts.map(account => ({
		...account,
		balance: account.type === "CREDIT_CARD" ? null : Number((balances.get(account.id) ?? 0).toFixed(4)),
	}));
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
