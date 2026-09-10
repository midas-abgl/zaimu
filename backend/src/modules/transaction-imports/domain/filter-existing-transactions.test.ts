import { describe, expect, test } from "bun:test";
import { filterExistingTransactions } from "./filter-existing-transactions";

describe("filterExistingTransactions", () => {
	test("removes transactions whose external IDs are already persisted", () => {
		const transactions = [
			{ externalId: "already-imported", value: 10 },
			{ externalId: "new-transaction", value: 20 },
		];

		expect(filterExistingTransactions(transactions, new Set(["already-imported"]))).toEqual([
			{ externalId: "new-transaction", value: 20 },
		]);
	});
});
