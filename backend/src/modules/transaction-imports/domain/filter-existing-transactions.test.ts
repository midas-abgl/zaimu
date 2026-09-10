import { describe, expect, test } from "bun:test";
import { filterExistingTransactions } from "./filter-existing-transactions";

describe("filterExistingTransactions", () => {
	test("removes transactions whose external IDs are already persisted", () => {
		const transactions = [
			{ date: "2026-09-01", externalId: "already-imported", type: "INCOME", value: 10 },
			{ date: "2026-09-02", externalId: "new-transaction", type: "EXPENSE", value: 20 },
		];

		expect(filterExistingTransactions(transactions, new Set(["already-imported"]))).toEqual([
			{ date: "2026-09-02", externalId: "new-transaction", type: "EXPENSE", value: 20 },
		]);
	});

	test("removes yields already saved before external IDs were tracked", () => {
		const transactions = [
			{ date: "2026-09-01", externalId: "legacy-yield", type: "YIELD" },
			{ date: "2026-09-01", externalId: "income", type: "INCOME" },
		];

		expect(filterExistingTransactions(transactions, new Set(), new Set(["2026-09-01"]))).toEqual([
			{ date: "2026-09-01", externalId: "income", type: "INCOME" },
		]);
	});
});
