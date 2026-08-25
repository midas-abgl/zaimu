#!/usr/bin/env -S node
import { col, Migration, MigrationCLI, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/7e10bdadb0733ef1799bba084f3d689d6b4e7b6763223924f604ebb2dc78915e/contract";
import startContract from "../../snapshots/7e10bdadb0733ef1799bba084f3d689d6b4e7b6763223924f604ebb2dc78915e/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/b1bc2da8ff152b901f53357bec2d3325644f57361ae04c6b41a5c77af7ea3b16/contract";
import endContract from "../../snapshots/b1bc2da8ff152b901f53357bec2d3325644f57361ae04c6b41a5c77af7ea3b16/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.dropIndex({
				index: "Account_userId_name_key",
				schema: "public",
				table: "FinancialAccount",
			}),
			this.addColumn({
				column: col("securityDeposit", "numeric(12,2)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
				}),
				schema: "public",
				table: "CreditCard",
			}),
			this.dropNotNull({ column: "balance", schema: "public", table: "FinancialAccount" }),
			rawSql({
				execute: [
					{
						description: "Remove legacy balances from credit cards",
						sql: `UPDATE "public"."FinancialAccount"
SET "balance" = NULL
WHERE "type" = 'CREDIT_CARD'`,
					},
				],
				id: "FinancialAccount.creditCardBalance.backfill",
				label: "Remove legacy credit card balances",
				operationClass: "widening",
				postcheck: [
					{
						description: "Every credit card has no account balance",
						sql: `SELECT NOT EXISTS (
  SELECT 1
  FROM "public"."FinancialAccount"
  WHERE "type" = 'CREDIT_CARD' AND "balance" IS NOT NULL
) AS ok`,
					},
				],
				precheck: [],
				target: { id: "postgres" },
			}),
			this.createIndex({
				columns: ["userId", "name", "type"],
				extras: { unique: true },
				index: "FinancialAccount_userId_name_type_key",
				schema: "public",
				table: "FinancialAccount",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
