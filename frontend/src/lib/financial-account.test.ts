import { describe, expect, test } from "bun:test";
import {
	calculateFinancialAccountBalances,
	compareFinancialAccountsByDisplayName,
	compareFinancialAccountsByOptionLabel,
	getFinancialAccountDisplayName,
	getFinancialAccountOptionLabel,
} from "./financial-account";

describe("getFinancialAccountDisplayName", () => {
	test("uses the account title when present", () => {
		expect(
			getFinancialAccountDisplayName({
				institution: { id: "institution-id", name: "Banco Exemplo" },
				name: "Conta principal",
				type: "CHECKING",
			}),
		).toBe("Conta principal");
	});

	test("uses the institution name when the account has no title", () => {
		expect(
			getFinancialAccountDisplayName({
				institution: { id: "institution-id", name: "Banco Exemplo" },
				name: null,
				type: "CHECKING",
			}),
		).toBe("Banco Exemplo");
	});

	test("uses the institution name when the account title is blank", () => {
		expect(
			getFinancialAccountDisplayName({
				institution: { id: "institution-id", name: "Banco Exemplo" },
				name: "   ",
				type: "CREDIT_CARD",
			}),
		).toBe("Banco Exemplo");
	});

	test("uses the account type when title and institution are absent", () => {
		expect(getFinancialAccountDisplayName({ institution: null, name: null, type: "CHECKING" })).toBe(
			"Conta corrente",
		);
	});
});

describe("getFinancialAccountOptionLabel", () => {
	test("prefixes the account type to distinguish accounts in selectors", () => {
		expect(
			getFinancialAccountOptionLabel({
				institution: { id: "mercado-pago-id", name: "Mercado Pago" },
				name: null,
				type: "SAVINGS",
			}),
		).toBe("Poupança Mercado Pago");
		expect(
			getFinancialAccountOptionLabel({
				institution: { id: "mercado-pago-id", name: "Mercado Pago" },
				name: null,
				type: "CHECKING",
			}),
		).toBe("Conta Mercado Pago");
	});

	test("does not repeat the type when it is the only available account name", () => {
		expect(getFinancialAccountOptionLabel({ institution: null, name: null, type: "SAVINGS" })).toBe(
			"Poupança",
		);
	});
});

describe("compareFinancialAccountsByDisplayName", () => {
	test("sorts accounts alphabetically by their final display names", () => {
		const accounts = [
			{ institution: { id: "zeta-id", name: "Zeta" }, name: null, type: "CHECKING" as const },
			{ institution: null, name: "Banco Central", type: "CHECKING" as const },
			{ institution: { id: "agil-id", name: "Ágil" }, name: null, type: "CHECKING" as const },
		];

		expect(
			accounts.toSorted(compareFinancialAccountsByDisplayName).map(getFinancialAccountDisplayName),
		).toEqual(["Ágil", "Banco Central", "Zeta"]);
	});
});

describe("compareFinancialAccountsByOptionLabel", () => {
	test("sorts accounts alphabetically by their selector labels", () => {
		const accounts = [
			{ institution: { id: "mercado-id", name: "Mercado Pago" }, name: null, type: "SAVINGS" as const },
			{ institution: { id: "nubank-id", name: "Nubank" }, name: null, type: "CHECKING" as const },
			{ institution: { id: "inter-id", name: "Inter" }, name: null, type: "CHECKING" as const },
		];

		expect(
			accounts.toSorted(compareFinancialAccountsByOptionLabel).map(getFinancialAccountOptionLabel),
		).toEqual(["Conta Inter", "Conta Nubank", "Poupança Mercado Pago"]);
	});
});

describe("calculateFinancialAccountBalances", () => {
	test("derives balances from account transactions", () => {
		const accounts = calculateFinancialAccountBalances(
			[
				{ balance: 999, id: "checking", type: "CHECKING" },
				{ balance: 999, id: "savings", type: "SAVINGS" },
				{ balance: 999, id: "card", type: "CREDIT_CARD" },
			] as never,
			[
				{ amount: 100, destinationFinancialAccountId: "checking" },
				{ amount: 25, originFinancialAccountId: "checking" },
				{ amount: 10, destinationFinancialAccountId: "savings", originFinancialAccountId: "checking" },
			],
		);

		expect(accounts.map(account => account.balance)).toEqual([65, 10, null]);
	});

	test("keeps rewards in native units and compounds cashback", () => {
		const accounts = calculateFinancialAccountBalances(
			[
				{
					balance: 0,
					id: "rewards",
					rewardsAccount: { initialBalance: 100, kind: "POINTS" },
					type: "REWARDS",
				},
			] as never,
			[],
			[
				{
					cashbackAccountId: "rewards",
					cashbackAmount: 10,
					purchaseDate: new Date().toISOString(),
				},
			],
		);

		expect(accounts[0]?.balance).toBe(110);
	});
});
