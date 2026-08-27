import type { CreditCard } from "./api";

export function getCreditCardDisplayName(card: Pick<CreditCard, "accountName">) {
	return card.accountName || "Cartão de crédito";
}
