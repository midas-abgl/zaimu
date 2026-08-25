import { describe, expect, test } from "bun:test";
import { normalizeInstitutionName } from "./financial-institution";

describe("normalizeInstitutionName", () => {
	test("normaliza caixa, espaços e Unicode", () => {
		expect(normalizeInstitutionName("  Ｍｅｒｃａｄｏ   PAGO ")).toBe("mercado pago");
	});
});
