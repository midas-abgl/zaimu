import { describe, expect, test } from "bun:test";
import { matchesTransferCounterpart } from "./import-reconciliation";

const accountId = "account-a";

describe("matchesTransferCounterpart", () => {
	test("associa entrada importada ao destino da transferência", () => {
		expect(
			matchesTransferCounterpart(
				{ type: "INCOME" },
				{ destinationFinancialAccountId: accountId, originFinancialAccountId: "account-b", type: "TRANSFER" },
				accountId,
			),
		).toBe(true);
	});

	test("associa saída importada à origem da transferência", () => {
		expect(
			matchesTransferCounterpart(
				{ type: "EXPENSE" },
				{ destinationFinancialAccountId: "account-b", originFinancialAccountId: accountId, type: "TRANSFER" },
				accountId,
			),
		).toBe(true);
	});

	test("não associa o lado oposto da transferência", () => {
		expect(
			matchesTransferCounterpart(
				{ type: "INCOME" },
				{ destinationFinancialAccountId: "account-b", originFinancialAccountId: accountId, type: "TRANSFER" },
				accountId,
			),
		).toBe(false);
	});
});
