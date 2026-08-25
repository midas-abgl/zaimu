import { describe, expect, test } from "bun:test";
import { assertCreditCardBillingDays } from "./assert-credit-card-billing-days";

describe("assertCreditCardBillingDays", () => {
	test("accepts a due day after the statement day", () => {
		expect(() => assertCreditCardBillingDays(10, 17)).not.toThrow();
	});

	test.each([
		[18, 17],
		[17, 17],
	])("rejects statement day %d with due day %d", (statementDay, dueDay) => {
		expect(() => assertCreditCardBillingDays(statementDay, dueDay)).toThrow(
			"O vencimento deve ser posterior ao fechamento da fatura",
		);
	});
});
