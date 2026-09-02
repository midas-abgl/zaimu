import { describe, expect, test } from "bun:test";
import type { Transaction } from "@/lib/api";
import { transactionToCreditPurchase } from "./-transaction-to-credit-purchase";

describe("transactionToCreditPurchase", () => {
	test("preserva referência da dívida usada pelo modal de compra", () => {
		const transaction: Transaction = {
			amount: 2480,
			createdAt: "2026-07-17T12:00:00.000Z",
			creditCardStatementId: "statement-id",
			currentInstallment: 1,
			date: "2026-07-17",
			debtPersonId: "person-id",
			debtPersonName: "Ana",
			description: "iPhone 17",
			id: "purchase-id",
			installmentAmount: 248,
			installments: 10,
			source: "CREDIT_CARD",
			type: "EXPENSE",
		};

		expect(transactionToCreditPurchase(transaction)).toMatchObject({
			debtPersonId: "person-id",
			debtPersonName: "Ana",
			id: "purchase-id",
			installments: 10,
		});
	});
});
