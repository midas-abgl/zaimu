import { describe, expect, test } from "bun:test";
import { compareFinancialAccountsByDisplayName, getFinancialAccountDisplayName } from "./financial-account";

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
