import type { FinancialAccount } from "./api";

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
