import { describe, expect, test } from "bun:test";
import {
	calculateDebtTotals,
	debtEffectForPerspective,
	debtEffectForTransaction,
	isCompatibleDebtPair,
} from "./debt-balance";

describe("livro de dívidas", () => {
	test("soma origens e abate pagamentos no saldo da pessoa", () => {
		const balance = [120, 80, debtEffectForTransaction(50, "INCOME")].reduce(
			(sum, effect) => sum + effect,
			0,
		);
		expect(balance).toBe(150);
		expect(calculateDebtTotals([balance])).toEqual({ iOwe: 0, net: 150, owedToMe: 150 });
	});

	test("pagamento excedente cruza zero e contraparte vê sinal inverso", () => {
		const ownerBalance = 100 + debtEffectForTransaction(140, "INCOME");
		expect(ownerBalance).toBe(-40);
		expect(debtEffectForPerspective(ownerBalance, false)).toBe(40);
		expect(calculateDebtTotals([ownerBalance])).toEqual({ iOwe: 40, net: -40, owedToMe: 0 });
	});

	test("transferência própria não altera dívida", () => {
		expect(debtEffectForTransaction(500, "TRANSFER")).toBe(0);
	});

	test("pareamento exige efeito, valor e dia iguais", () => {
		const pair = {
			amount: 75,
			date: "2026-09-01T10:00:00.000Z",
			effect: -75,
			eventAmount: 75,
			eventDate: "2026-09-01",
			eventPerspectiveEffect: -75,
		};
		expect(isCompatibleDebtPair(pair)).toBeTrue();
		expect(isCompatibleDebtPair({ ...pair, date: "2026-09-02" })).toBeFalse();
	});
});
