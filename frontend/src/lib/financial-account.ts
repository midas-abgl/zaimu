import type { FinancialAccount } from "./api";

const financialAccountTypeLabels = {
	CASH: "Dinheiro",
	CHECKING: "Conta corrente",
	CREDIT_CARD: "Cartão de crédito",
	INVESTMENT: "Investimentos",
	SAVINGS: "Poupança",
} as const;

export function getFinancialAccountDisplayName(account: Pick<FinancialAccount, "name" | "type">) {
	return account.name ?? financialAccountTypeLabels[account.type];
}

export function getFinancialAccountTypeLabel(type: FinancialAccount["type"]) {
	return financialAccountTypeLabels[type];
}
