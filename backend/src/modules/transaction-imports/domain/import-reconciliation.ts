export type ImportTransactionType = "EXPENSE" | "INCOME" | "TRANSFER" | "YIELD";

export function matchesTransferCounterpart(
	item: { type: ImportTransactionType },
	candidate: {
		destinationFinancialAccountId: string | null;
		originFinancialAccountId: string | null;
		type: ImportTransactionType;
	},
	financialAccountId: string,
) {
	return (
		candidate.type === "TRANSFER" &&
		((item.type === "INCOME" && candidate.destinationFinancialAccountId === financialAccountId) ||
			(item.type === "EXPENSE" && candidate.originFinancialAccountId === financialAccountId))
	);
}

export function matchesDuplicateTransactionShape(
	item: {
		destinationFinancialAccountId: string | null;
		originFinancialAccountId: string | null;
		type: ImportTransactionType;
	},
	candidate: {
		destinationFinancialAccountId: string | null;
		originFinancialAccountId: string | null;
		type: ImportTransactionType;
	},
	financialAccountId: string,
) {
	if (item.type === "TRANSFER" && candidate.type === "TRANSFER")
		return (
			item.originFinancialAccountId === candidate.originFinancialAccountId &&
			item.destinationFinancialAccountId === candidate.destinationFinancialAccountId
		);
	return item.type === candidate.type || matchesTransferCounterpart(item, candidate, financialAccountId);
}
