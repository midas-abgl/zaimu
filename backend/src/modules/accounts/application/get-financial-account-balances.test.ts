import { describe, expect, test } from "bun:test";
import { calculateCashbackValue } from "./get-financial-account-balances";

describe("calculateCashbackValue", () => {
	test("compounds complete monthly periods", () => {
		expect(
			calculateCashbackValue(
				100,
				new Date("2026-01-15T12:00:00Z"),
				10,
				100,
				"MONTHLY",
				new Date("2026-03-15T12:00:00Z"),
			),
		).toBeCloseTo(121);
	});

	test("compounds complete annual periods", () => {
		expect(
			calculateCashbackValue(
				100,
				new Date("2024-01-15T12:00:00Z"),
				10,
				100,
				"YEARLY",
				new Date("2026-01-15T12:00:00Z"),
			),
		).toBeCloseTo(121);
	});

	test("returns base amount without yield", () => {
		expect(calculateCashbackValue(25, new Date(), null, null, null)).toBe(25);
	});
});
