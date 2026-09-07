import { describe, expect, test } from "bun:test";
import { assertFinancialAccountYieldSettings } from "./assert-financial-account-yield-settings";

describe("assertFinancialAccountYieldSettings", () => {
	test("accepts a complete positive yield setting", () => {
		expect(() =>
			assertFinancialAccountYieldSettings({ type: "SAVINGS", yieldPeriod: "MONTHLY", yieldRate: 0.95 }),
		).not.toThrow();
	});

	test("rejects credit-card yield", () => {
		expect(() =>
			assertFinancialAccountYieldSettings({ type: "CREDIT_CARD", yieldPeriod: "YEARLY", yieldRate: 12 }),
		).toThrow("Cartão de crédito não pode ter rendimento");
	});
});
