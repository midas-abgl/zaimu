#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI, primaryKey, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/0091806f888d6a8256f2c2441bdda1873bf8a84604145b15caae554e234cd3be/contract";
import endContract from "../../snapshots/0091806f888d6a8256f2c2441bdda1873bf8a84604145b15caae554e234cd3be/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/f4d372bea28ba11bf40f9a9da457a092b30eb84a8dcb96a95c1adf42d5bdbe8d/contract";
import startContract from "../../snapshots/f4d372bea28ba11bf40f9a9da457a092b30eb84a8dcb96a95c1adf42d5bdbe8d/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("externalId", "character varying(200)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
						notNull: true,
					}),
					col("financialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("transactionId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "TransactionExternalReference_pkey" })],
				schema: "public",
				table: "TransactionExternalReference",
			}),
			rawSql({
				execute: [
					{
						description: "move legacy transaction external IDs into references",
						sql: `INSERT INTO "public"."TransactionExternalReference" ("id", "transactionId", "financialAccountId", "externalId", "createdAt", "updatedAt")
SELECT cuid2(), "id", COALESCE("originFinancialAccountId", "destinationFinancialAccountId"), "externalId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "public"."Transaction"
WHERE "externalId" IS NOT NULL
  AND COALESCE("originFinancialAccountId", "destinationFinancialAccountId") IS NOT NULL`,
					},
				],
				id: "TransactionExternalReference.legacyExternalIds.backfill",
				label: "Backfill transaction external references",
				operationClass: "additive",
				postcheck: [
					{
						description: "every legacy transaction external ID has a reference",
						sql: `SELECT NOT EXISTS (
  SELECT 1
  FROM "public"."Transaction" AS transaction
  LEFT JOIN "public"."TransactionExternalReference" AS reference
    ON reference."transactionId" = transaction."id"
   AND reference."externalId" = transaction."externalId"
   AND reference."financialAccountId" = COALESCE(transaction."originFinancialAccountId", transaction."destinationFinancialAccountId")
  WHERE transaction."externalId" IS NOT NULL
    AND COALESCE(transaction."originFinancialAccountId", transaction."destinationFinancialAccountId") IS NOT NULL
    AND reference."id" IS NULL
) AS ok`,
					},
				],
				precheck: [],
				target: { id: "postgres" },
			}),
			this.createIndex({
				columns: ["financialAccountId", "externalId"],
				extras: { unique: true },
				index: "TransactionExternalReference_accountId_externalId_key",
				schema: "public",
				table: "TransactionExternalReference",
			}),
			this.createIndex({
				columns: ["transactionId"],
				index: "TransactionExternalReference_transactionId_idx",
				schema: "public",
				table: "TransactionExternalReference",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["transactionId"],
					name: "TransactionExternalReference_transactionId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Transaction" },
				},
				schema: "public",
				table: "TransactionExternalReference",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "TransactionExternalReference_financialAccountId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "TransactionExternalReference",
			}),
			this.dropIndex({
				index: "Transaction_externalId_idx",
				schema: "public",
				table: "Transaction",
			}),
			this.dropColumn({ column: "externalId", schema: "public", table: "Transaction" }),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
