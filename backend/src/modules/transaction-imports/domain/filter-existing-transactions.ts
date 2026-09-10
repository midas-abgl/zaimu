export function filterExistingTransactions<T extends { date: string; externalId: string; type: string }>(
	transactions: T[],
	existingExternalIds: ReadonlySet<string>,
	existingYieldDates: ReadonlySet<string> = new Set(),
) {
	return transactions.filter(
		transaction =>
			!existingExternalIds.has(transaction.externalId) &&
			(transaction.type !== "YIELD" || !existingYieldDates.has(transaction.date)),
	);
}
