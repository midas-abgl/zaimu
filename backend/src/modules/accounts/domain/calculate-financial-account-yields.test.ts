import { describe, expect, test } from "bun:test";
import { calculateFinancialAccountYieldBalances } from "./calculate-financial-account-yields";

describe("calculateFinancialAccountYieldBalances", () => {
	const account = {
		createdAt: new Date("2026-01-05T12:00:00"),
		id: "account",
		type: "CHECKING",
		yieldPeriod: "MONTHLY" as const,
		yieldRate: 10,
	};

	test("compounds only on weekdays", () => {
		const balances = calculateFinancialAccountYieldBalances({
			accounts: [account],
			cashbackCredits: [],
			holidays: [],
			initialRewardsBalances: new Map(),
			today: new Date("2026-01-06T12:00:00"),
			transactions: [
				{ amount: 100, date: new Date("2026-01-05T12:00:00"), destinationFinancialAccountId: "account" },
			],
		});
		const dailyRate = 1.1 ** (1 / 21) - 1;
		expect(balances.get("account")).toBeCloseTo(100 * (1 + dailyRate) ** 2, 4);
	});

	test("skips all account yields on a holiday", () => {
		const balances = calculateFinancialAccountYieldBalances({
			accounts: [account],
			cashbackCredits: [],
			holidays: [new Date("2026-01-06T12:00:00")],
			initialRewardsBalances: new Map(),
			today: new Date("2026-01-06T12:00:00"),
			transactions: [
				{ amount: 100, date: new Date("2026-01-05T12:00:00"), destinationFinancialAccountId: "account" },
			],
		});
		const dailyRate = 1.1 ** (1 / 21) - 1;
		expect(balances.get("account")).toBeCloseTo(100 * (1 + dailyRate), 4);
	});

	test("preserves the former rate before a scheduled change", () => {
		const balances = calculateFinancialAccountYieldBalances({
			accounts: [
				{
					...account,
					yieldRate: 20,
					yieldRateHistories: [
						{ effectiveDate: new Date("2026-01-05T12:00:00"), yieldPeriod: "MONTHLY", yieldRate: 10 },
						{ effectiveDate: new Date("2026-01-06T12:00:00"), yieldPeriod: "MONTHLY", yieldRate: 20 },
					],
				},
			],
			cashbackCredits: [],
			holidays: [],
			initialRewardsBalances: new Map(),
			today: new Date("2026-01-06T12:00:00"),
			transactions: [
				{ amount: 100, date: new Date("2026-01-05T12:00:00"), destinationFinancialAccountId: "account" },
			],
		});
		expect(balances.get("account")).toBeCloseTo(100 * 1.1 ** (1 / 21) * 1.2 ** (1 / 21), 4);
	});
});
