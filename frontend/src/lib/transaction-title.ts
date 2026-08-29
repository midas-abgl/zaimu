import type { Transaction } from "./api";

export function getTransactionTitle({
	description,
	source,
	type,
}: Pick<Transaction, "description" | "source" | "type">) {
	const trimmedDescription = description?.trim();
	if (trimmedDescription) return trimmedDescription;
	if (source === "CREDIT_CARD") return "Compra";
	if (type === "TRANSFER") return "Transferência";
	return "Transação";
}
