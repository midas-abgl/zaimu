import { describe, expect, test } from "bun:test";
import { normalizeFinancialInstitutionName } from "./normalize-financial-institution-name";

describe("normalizeFinancialInstitutionName", () => {
	test("preserva o nome de exibição e normaliza espaços e caixa", () => {
		expect(normalizeFinancialInstitutionName("  Mercado   PAGO  ")).toEqual({
			name: "Mercado PAGO",
			normalizedName: "mercado pago",
		});
	});

	test("normaliza caracteres Unicode equivalentes", () => {
		expect(normalizeFinancialInstitutionName("Ｎｕｂａｎｋ").normalizedName).toBe("nubank");
	});
});
