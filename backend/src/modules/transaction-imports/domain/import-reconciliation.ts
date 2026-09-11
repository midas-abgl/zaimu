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
		(candidate.type === "TRANSFER" &&
			((item.type === "INCOME" && candidate.destinationFinancialAccountId === financialAccountId) ||
				(item.type === "EXPENSE" && candidate.originFinancialAccountId === financialAccountId))) ||
		(item.type === "INCOME" &&
			candidate.type === "EXPENSE" &&
			candidate.originFinancialAccountId !== financialAccountId) ||
		(item.type === "EXPENSE" &&
			candidate.type === "INCOME" &&
			candidate.destinationFinancialAccountId !== financialAccountId)
	);
}
