export function filterExistingTransactions<T extends { externalId: string }>(
	transactions: T[],
	existingExternalIds: ReadonlySet<string>,
) {
	return transactions.filter(transaction => !existingExternalIds.has(transaction.externalId));
}
