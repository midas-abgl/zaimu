interface DisplayableTransaction {
	id: string;
	isHidden?: boolean;
}

export interface TransactionDisplayGroup<T extends DisplayableTransaction> {
	id: string;
	kind: "hidden" | "visible";
	transactions: T[];
}

export function groupTransactionsForDisplay<T extends DisplayableTransaction>(
	transactions: T[],
): TransactionDisplayGroup<T>[] {
	return transactions.reduce<TransactionDisplayGroup<T>[]>((groups, transaction) => {
		const kind = transaction.isHidden ? "hidden" : "visible";
		const previousGroup = groups.at(-1);

		if (previousGroup?.kind === kind) {
			previousGroup.transactions.push(transaction);
			return groups;
		}

		groups.push({ id: `${kind}-${transaction.id}`, kind, transactions: [transaction] });
		return groups;
	}, []);
}
