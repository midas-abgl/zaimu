import { describe, expect, test } from "bun:test";
import { assertCashbackSettings } from "./assert-cashback-settings";

describe("assertCashbackSettings", () => {
	test("accepts cashback destination and paired yield", () => {
		expect(() =>
			assertCashbackSettings({
				cashbackAccountId: "rewards",
				cashbackRate: 1.5,
				cashbackYieldPeriod: "MONTHLY",
				cashbackYieldRate: 0.5,
			}),
		).not.toThrow();
	});

	test("requires destination when cashback is active", () => {
		expect(() => assertCashbackSettings({ cashbackRate: 1 })).toThrow(
			"Informe a conta ou a modalidade da recompensa",
		);
	});

	test("accepts automatic rewards account setup", () => {
		expect(() =>
			assertCashbackSettings({ cashbackRate: 1, cashbackRewards: { kind: "POINTS" } }),
		).not.toThrow();
	});

	test("requires yield rate and period together", () => {
		expect(() =>
			assertCashbackSettings({ cashbackAccountId: "rewards", cashbackRate: 1, cashbackYieldRate: 0.5 }),
		).toThrow("Informe a taxa e o período do rendimento juntos");
	});
});
