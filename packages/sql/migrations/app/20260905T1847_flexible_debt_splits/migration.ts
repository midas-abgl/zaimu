#!/usr/bin/env -S node
import { col, fn, lit, Migration, MigrationCLI, primaryKey, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/c7b6a0a86fa0ea1d315d0af29a41976ad2e628101acc6dc7ddc923968787f52c/contract";
import endContract from "../../snapshots/c7b6a0a86fa0ea1d315d0af29a41976ad2e628101acc6dc7ddc923968787f52c/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/e28c0e217297c4f6a98a7572a06a59489a9e0ef22021ecd296c83f6e945e68d4/contract";
import startContract from "../../snapshots/e28c0e217297c4f6a98a7572a06a59489a9e0ef22021ecd296c83f6e945e68d4/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.createNativeEnumType({
				members: ["SHARES", "PERCENTAGE", "FIXED"],
				schema: "public",
				typeName: "DebtSplitMode",
			}),
			this.dropConstraint({
				constraint: "DebtPurchaseLink_creditPurchaseId_key",
				schema: "public",
				table: "DebtPurchaseLink",
			}),
			this.dropConstraint({
				constraint: "DebtTransactionLink_transactionId_key",
				schema: "public",
				table: "DebtTransactionLink",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("creditPurchaseId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("mode", '"DebtSplitMode"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "DebtSplitMode" } },
						notNull: true,
					}),
					col("ownerIncluded", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
						notNull: true,
					}),
					col("ownerShares", "int2", { codecRef: { codecId: "pg/int2@1" } }),
					col("recurringPaymentId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("subscriptionId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("transactionId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "DebtSplit_pkey" })],
				schema: "public",
				table: "DebtSplit",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("debtPersonId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("debtSplitId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("fixedAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("percentage", "numeric(5,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 5, scale: 2 } },
					}),
					col("shares", "int2", { codecRef: { codecId: "pg/int2@1" } }),
					col("sortOrder", "int2", { codecRef: { codecId: "pg/int2@1" }, notNull: true }),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "DebtSplitParticipant_pkey" })],
				schema: "public",
				table: "DebtSplitParticipant",
			}),
			this.addUnique({
				columns: ["creditPurchaseId"],
				constraint: "DebtSplit_creditPurchaseId_key",
				schema: "public",
				table: "DebtSplit",
			}),
			this.addUnique({
				columns: ["recurringPaymentId"],
				constraint: "DebtSplit_recurringPaymentId_key",
				schema: "public",
				table: "DebtSplit",
			}),
			this.addUnique({
				columns: ["subscriptionId"],
				constraint: "DebtSplit_subscriptionId_key",
				schema: "public",
				table: "DebtSplit",
			}),
			this.addUnique({
				columns: ["transactionId"],
				constraint: "DebtSplit_transactionId_key",
				schema: "public",
				table: "DebtSplit",
			}),
			this.createIndex({
				columns: ["creditPurchaseId"],
				index: "DebtPurchaseLink_creditPurchaseId_idx",
				schema: "public",
				table: "DebtPurchaseLink",
			}),
			this.createIndex({
				columns: ["userId"],
				index: "DebtSplit_userId_idx",
				schema: "public",
				table: "DebtSplit",
			}),
			this.createIndex({
				columns: ["debtPersonId"],
				index: "DebtSplitParticipant_debtPersonId_idx",
				schema: "public",
				table: "DebtSplitParticipant",
			}),
			this.createIndex({
				columns: ["debtSplitId", "debtPersonId"],
				extras: { unique: true },
				index: "DebtSplitParticipant_debtSplitId_debtPersonId_key",
				schema: "public",
				table: "DebtSplitParticipant",
			}),
			this.createIndex({
				columns: ["debtSplitId", "sortOrder"],
				extras: { unique: true },
				index: "DebtSplitParticipant_debtSplitId_sortOrder_key",
				schema: "public",
				table: "DebtSplitParticipant",
			}),
			this.createIndex({
				columns: ["transactionId"],
				index: "DebtTransactionLink_transactionId_idx",
				schema: "public",
				table: "DebtTransactionLink",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "DebtSplit_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "DebtSplit",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["transactionId"],
					name: "DebtSplit_transactionId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Transaction" },
				},
				schema: "public",
				table: "DebtSplit",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["creditPurchaseId"],
					name: "DebtSplit_creditPurchaseId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditPurchase" },
				},
				schema: "public",
				table: "DebtSplit",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["subscriptionId"],
					name: "DebtSplit_subscriptionId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Subscription" },
				},
				schema: "public",
				table: "DebtSplit",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["recurringPaymentId"],
					name: "DebtSplit_recurringPaymentId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "RecurringPayment" },
				},
				schema: "public",
				table: "DebtSplit",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["debtSplitId"],
					name: "DebtSplitParticipant_debtSplitId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "DebtSplit" },
				},
				schema: "public",
				table: "DebtSplitParticipant",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["debtPersonId"],
					name: "DebtSplitParticipant_debtPersonId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "DebtPerson" },
				},
				schema: "public",
				table: "DebtSplitParticipant",
			}),
			rawSql({
				execute: [
					{
						description: "Enforce debt split target and owner invariants",
						sql: `ALTER TABLE "public"."DebtSplit"
ADD CONSTRAINT "DebtSplit_exactly_one_target_check" CHECK (
  num_nonnulls("transactionId", "creditPurchaseId", "subscriptionId", "recurringPaymentId") = 1
),
ADD CONSTRAINT "DebtSplit_owner_fields_check" CHECK (
  ("mode" = 'SHARES' AND "ownerIncluded" = ("ownerShares" IS NOT NULL) AND ("ownerShares" IS NULL OR "ownerShares" > 0))
  OR ("mode" IN ('PERCENTAGE', 'FIXED') AND "ownerShares" IS NULL)
)`,
					},
					{
						description: "Enforce debt split participant value invariants",
						sql: `ALTER TABLE "public"."DebtSplitParticipant"
ADD CONSTRAINT "DebtSplitParticipant_value_check" CHECK (
  num_nonnulls("shares", "percentage", "fixedAmount") = 1
  AND ("shares" IS NULL OR "shares" > 0)
  AND ("percentage" IS NULL OR ("percentage" > 0 AND "percentage" <= 100))
  AND ("fixedAmount" IS NULL OR "fixedAmount" > 0)
  AND "sortOrder" >= 0
)`,
					},
					{
						description: "Convert transaction debt associations to equal-share splits",
						sql: `INSERT INTO "public"."DebtSplit" (
  "id", "transactionId", "mode", "ownerIncluded", "userId", "createdAt", "updatedAt"
)
SELECT link."eventId", link."transactionId", 'SHARES', false, link."userId", link."createdAt", link."updatedAt"
FROM "public"."DebtTransactionLink" AS link
WHERE link."isCreator" = true`,
					},
					{
						description: "Convert purchase debt associations to equal-share splits",
						sql: `INSERT INTO "public"."DebtSplit" (
  "id", "creditPurchaseId", "mode", "ownerIncluded", "userId", "createdAt", "updatedAt"
)
SELECT link."eventId", link."creditPurchaseId", 'SHARES', false, link."userId", link."createdAt", link."updatedAt"
FROM "public"."DebtPurchaseLink" AS link
WHERE link."isCreator" = true`,
					},
					{
						description: "Create participants for migrated debt splits",
						sql: `INSERT INTO "public"."DebtSplitParticipant" (
  "debtSplitId", "debtPersonId", "sortOrder", "shares", "createdAt", "updatedAt"
)
SELECT split."id", event."debtPersonId", 0, 1, split."createdAt", split."updatedAt"
FROM "public"."DebtSplit" AS split
INNER JOIN "public"."DebtEvent" AS event ON event."id" = split."id"`,
					},
				],
				id: "debtSplit.invariantsAndLegacyData",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
