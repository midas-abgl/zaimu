import { describe, expect, test } from "bun:test";
import { groupTransactionsForDisplay } from "./-transaction-display-groups";

describe("groupTransactionsForDisplay", () => {
	test("keeps adjacent hidden transactions in one group", () => {
		const groups = groupTransactionsForDisplay([
			{ id: "visible", isHidden: false },
			{ id: "hidden-1", isHidden: true },
			{ id: "hidden-2", isHidden: true },
		]);

		expect(groups.map(group => [group.kind, group.transactions.map(transaction => transaction.id)])).toEqual([
			["visible", ["visible"]],
			["hidden", ["hidden-1", "hidden-2"]],
		]);
	});

	test("splits hidden groups around visible transactions", () => {
		const groups = groupTransactionsForDisplay([
			{ id: "hidden-before", isHidden: true },
			{ id: "visible", isHidden: false },
			{ id: "hidden-after", isHidden: true },
		]);

		expect(groups.map(group => [group.kind, group.transactions.map(transaction => transaction.id)])).toEqual([
			["hidden", ["hidden-before"]],
			["visible", ["visible"]],
			["hidden", ["hidden-after"]],
		]);
	});
});
