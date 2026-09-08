interface SortableTransaction {
	createdAt: string;
	date: string;
	id: string;
	time?: null | string;
}

function getTimeSortValue(time: string | null | undefined): string {
	return time?.match(/(?:T)?(\d{2}:\d{2}(?::\d{2})?)/)?.[1] ?? "";
}

export function sortTransactionsByMostRecent<T extends SortableTransaction>(transactions: readonly T[]): T[] {
	return transactions.toSorted((left, right) => {
		const dateComparison = right.date.slice(0, 10).localeCompare(left.date.slice(0, 10));
		if (dateComparison !== 0) return dateComparison;

		const timeComparison = getTimeSortValue(right.time).localeCompare(getTimeSortValue(left.time));
		if (timeComparison !== 0) return timeComparison;

		const createdAtComparison = right.createdAt.localeCompare(left.createdAt);
		if (createdAtComparison !== 0) return createdAtComparison;

		return right.id.localeCompare(left.id);
	});
}
