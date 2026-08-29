import { describe, expect, test } from "bun:test";
import { getTransactionTitle } from "./transaction-title";

describe("getTransactionTitle", () => {
	test("uses a non-empty description", () => {
		expect(
			getTransactionTitle({ description: "  Jogos  ", source: "FINANCIAL_ACCOUNT", type: "EXPENSE" }),
		).toBe("Jogos");
	});

	test("uses Compra for credit card purchases without a description", () => {
		expect(getTransactionTitle({ source: "CREDIT_CARD", type: "EXPENSE" })).toBe("Compra");
	});

	test("uses Transferência for transfers without a description", () => {
		expect(getTransactionTitle({ source: "FINANCIAL_ACCOUNT", type: "TRANSFER" })).toBe("Transferência");
	});

	test("uses Transação for account income and expenses without a description", () => {
		expect(getTransactionTitle({ source: "FINANCIAL_ACCOUNT", type: "INCOME" })).toBe("Transação");
		expect(getTransactionTitle({ description: "   ", source: "FINANCIAL_ACCOUNT", type: "EXPENSE" })).toBe(
			"Transação",
		);
	});
});
