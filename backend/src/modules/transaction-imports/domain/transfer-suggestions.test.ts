import { describe, expect, test } from "bun:test";
import {
	getTransferSuggestionPair,
	getTransferSuggestions,
	type TransferSuggestionItem,
	transferSuggestionRejectionKey,
} from "./transfer-suggestions";

const outgoing: TransferSuggestionItem = {
	amount: 42.5,
	date: "2026-09-10",
	externalId: "outgoing-id",
	financialAccountId: "account-a",
	id: "outgoing-item",
	source: "IMPORT_ITEM",
	type: "EXPENSE",
};
const incoming: TransferSuggestionItem = {
	amount: 42.5,
	date: "2026-09-11",
	externalId: "incoming-id",
	financialAccountId: "account-b",
	id: "incoming-item",
	source: "TRANSACTION",
	type: "INCOME",
};

describe("getTransferSuggestionPair", () => {
	test("matches opposite imported movements of equal value within one day", () => {
		expect(getTransferSuggestionPair(outgoing, incoming)).toEqual({ incoming, outgoing });
	});

	test("does not match movements in the same account or beyond one day", () => {
		expect(
			getTransferSuggestionPair(outgoing, { ...incoming, financialAccountId: outgoing.financialAccountId }),
		).toBeNull();
		expect(getTransferSuggestionPair(outgoing, { ...incoming, date: "2026-09-12" })).toBeNull();
	});
});

describe("getTransferSuggestions", () => {
	test("only suggests materialized transactions for an import item", () => {
		expect(getTransferSuggestions(outgoing, [{ ...incoming, source: "IMPORT_ITEM" }], new Set())).toEqual([]);
		expect(getTransferSuggestions({ ...outgoing, source: "TRANSACTION" }, [incoming], new Set())).toEqual([]);
		expect(getTransferSuggestions(outgoing, [incoming], new Set())).toEqual([{ incoming, outgoing }]);
	});

	test("omits a rejected pair", () => {
		const rejected = new Set([
			transferSuggestionRejectionKey({
				incomingExternalId: incoming.externalId!,
				incomingFinancialAccountId: incoming.financialAccountId,
				outgoingExternalId: outgoing.externalId!,
				outgoingFinancialAccountId: outgoing.financialAccountId,
			}),
		]);
		expect(getTransferSuggestions(outgoing, [incoming], rejected)).toEqual([]);
	});
});
