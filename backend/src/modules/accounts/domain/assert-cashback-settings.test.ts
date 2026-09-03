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
			"Selecione a conta que receberá o cashback",
		);
	});

	test("requires yield rate and period together", () => {
		expect(() =>
			assertCashbackSettings({ cashbackAccountId: "rewards", cashbackRate: 1, cashbackYieldRate: 0.5 }),
		).toThrow("Informe a taxa e o período do rendimento juntos");
	});
});
