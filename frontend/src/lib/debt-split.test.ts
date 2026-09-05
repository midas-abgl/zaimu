import { describe, expect, test } from "bun:test";
import { calculateDebtSplit, debtSplitError, debtSplitToInput } from "./debt-split";

describe("calculateDebtSplit", () => {
	test("distributes equal shares and uses stable order for remaining cents", () => {
		const split = calculateDebtSplit(10, {
			mode: "SHARES",
			ownerShares: null,
			participants: [
				{ debtPersonId: "a", shares: 1 },
				{ debtPersonId: "b", shares: 1 },
				{ debtPersonId: "c", shares: 1 },
			],
		});

		expect(split?.participants.map(participant => participant.amount)).toEqual([3.34, 3.33, 3.33]);
		expect(split?.ownerAmount).toBe(0);
	});

	test("leaves the percentage remainder with the owner", () => {
		const split = calculateDebtSplit(99.99, {
			mode: "PERCENTAGE",
			ownerIncluded: true,
			participants: [{ debtPersonId: "a", percentage: 33.33 }],
		});

		expect(split?.participants[0].amount).toBe(33.32);
		expect(split?.ownerAmount).toBe(66.67);
	});

	test("keeps fixed participant amounts and assigns the difference to the owner", () => {
		const split = calculateDebtSplit(120, {
			mode: "FIXED",
			ownerIncluded: true,
			participants: [
				{ debtPersonId: "a", fixedAmount: 25 },
				{ debtPersonId: "b", fixedAmount: 35 },
			],
		});

		expect(split?.participants.map(participant => participant.amount)).toEqual([25, 35]);
		expect(split?.ownerAmount).toBe(60);
	});

	test("rejects duplicate people and totals that do not close", () => {
		expect(
			debtSplitError(10, {
				mode: "FIXED",
				ownerIncluded: false,
				participants: [
					{ debtPersonId: "a", fixedAmount: 5 },
					{ debtPersonId: "a", fixedAmount: 5 },
				],
			}),
		).toBe("Cada pessoa pode aparecer uma vez.");
		expect(
			calculateDebtSplit(10, {
				mode: "PERCENTAGE",
				ownerIncluded: false,
				participants: [{ debtPersonId: "a", percentage: 99.99 }],
			}),
		).toBeNull();
	});
});

describe("debtSplitToInput", () => {
	test("removes calculated fields before editing and sending the split", () => {
		expect(
			debtSplitToInput({
				mode: "SHARES",
				ownerAmount: 5,
				ownerShares: 1,
				participants: [{ amount: 5, debtPersonId: "a", debtPersonName: "Ana", shares: 1 }],
			}),
		).toEqual({
			mode: "SHARES",
			ownerShares: 1,
			participants: [{ debtPersonId: "a", shares: 1 }],
		});
	});
});
