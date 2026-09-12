export type TransferSuggestionItemType = "EXPENSE" | "INCOME" | "TRANSFER" | "YIELD";

export interface TransferSuggestionItem {
	amount: number;
	date: Date | string;
	externalId: string | null;
	financialAccountId: string;
	id: string;
	source: "IMPORT_ITEM" | "TRANSACTION";
	type: TransferSuggestionItemType;
	transferCounterpartExternalId?: string | null;
}

export interface TransferSuggestionRejection {
	incomingExternalId: string;
	incomingFinancialAccountId: string;
	outgoingExternalId: string;
	outgoingFinancialAccountId: string;
}

export interface TransferSuggestion<Item extends TransferSuggestionItem = TransferSuggestionItem> {
	incoming: Item;
	outgoing: Item;
}

const dateKey = (value: Date | string) => new Date(value).toISOString().slice(0, 10);

const daysApart = (left: Date | string, right: Date | string) => {
	const leftDay = Date.parse(`${dateKey(left)}T00:00:00.000Z`);
	const rightDay = Date.parse(`${dateKey(right)}T00:00:00.000Z`);
	return Math.abs(leftDay - rightDay) / 86_400_000;
};

export function transferSuggestionRejectionKey(rejection: TransferSuggestionRejection) {
	return JSON.stringify([
		rejection.outgoingFinancialAccountId,
		rejection.outgoingExternalId,
		rejection.incomingFinancialAccountId,
		rejection.incomingExternalId,
	]);
}

export function getTransferSuggestionPair<Item extends TransferSuggestionItem>(
	left: Item,
	right: Item,
): TransferSuggestion<Item> | null {
	if (!left.externalId || !right.externalId) return null;
	if (left.financialAccountId === right.financialAccountId) return null;
	if (left.transferCounterpartExternalId || right.transferCounterpartExternalId) return null;
	if (Number(left.amount) !== Number(right.amount) || daysApart(left.date, right.date) > 1) return null;
	if (left.type === "EXPENSE" && right.type === "INCOME") return { incoming: right, outgoing: left };
	if (left.type === "INCOME" && right.type === "EXPENSE") return { incoming: left, outgoing: right };
	return null;
}

export function getTransferSuggestions<Item extends TransferSuggestionItem>(
	item: Item,
	candidates: Item[],
	rejectedPairs: ReadonlySet<string>,
) {
	return candidates.flatMap(candidate => {
		if (candidate.id === item.id) return [];
		if (item.source !== "IMPORT_ITEM" || candidate.source !== "TRANSACTION") return [];
		const pair = getTransferSuggestionPair(item, candidate);
		if (!pair?.outgoing.externalId || !pair.incoming.externalId) return [];
		return rejectedPairs.has(
			transferSuggestionRejectionKey({
				incomingExternalId: pair.incoming.externalId,
				incomingFinancialAccountId: pair.incoming.financialAccountId,
				outgoingExternalId: pair.outgoing.externalId,
				outgoingFinancialAccountId: pair.outgoing.financialAccountId,
			}),
		)
			? []
			: [pair];
	});
}
