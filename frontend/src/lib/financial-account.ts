import type { FinancialAccount } from "./api";

type AccountTransaction = Pick<
	import("./api").Transaction,
	"amount" | "destinationFinancialAccountId" | "originFinancialAccountId"
>;

export function calculateFinancialAccountBalances(
	accounts: FinancialAccount[],
	transactions: AccountTransaction[],
): FinancialAccount[] {
	const balances = new Map(
		accounts.filter(account => account.type !== "CREDIT_CARD").map(account => [account.id, 0]),
	);
	for (const transaction of transactions) {
		if (transaction.originFinancialAccountId && balances.has(transaction.originFinancialAccountId)) {
			balances.set(
				transaction.originFinancialAccountId,
				balances.get(transaction.originFinancialAccountId)! - transaction.amount,
			);
		}
		if (
			transaction.destinationFinancialAccountId &&
			balances.has(transaction.destinationFinancialAccountId)
		) {
			balances.set(
				transaction.destinationFinancialAccountId,
				balances.get(transaction.destinationFinancialAccountId)! + transaction.amount,
			);
		}
	}
	return accounts.map(account => ({
		...account,
		balance: account.type === "CREDIT_CARD" ? null : (balances.get(account.id) ?? 0),
	}));
}

const financialAccountTypeLabels = {
	CASH: "Dinheiro",
	CHECKING: "Conta corrente",
	CREDIT_CARD: "Cartão de crédito",
	INVESTMENT: "Investimentos",
	SAVINGS: "Poupança",
} as const;

const displayNameCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

export function getFinancialAccountDisplayName(
	account: Pick<FinancialAccount, "institution" | "name" | "type">,
) {
	return account.name?.trim() || account.institution?.name || financialAccountTypeLabels[account.type];
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

export function getFinancialAccountTypeLabel(type: FinancialAccount["type"]) {
	return financialAccountTypeLabels[type];
}
