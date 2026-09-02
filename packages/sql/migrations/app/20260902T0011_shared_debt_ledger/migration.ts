#!/usr/bin/env -S node
import { col, fn, lit, Migration, MigrationCLI, primaryKey, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/bdfe3bb8d0ff8bebb6da6759be133510c12e52cf816ecbfbadae540ea8398246/contract";
import endContract from "../../snapshots/bdfe3bb8d0ff8bebb6da6759be133510c12e52cf816ecbfbadae540ea8398246/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/f3e48e63cfeb48a9fb6e78bd58ba2dc77364ecd193dbaaace3721b0555997ec1/contract";
import startContract from "../../snapshots/f3e48e63cfeb48a9fb6e78bd58ba2dc77364ecd193dbaaace3721b0555997ec1/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.createNativeEnumType({
				members: ["PENDING", "ACCEPTED", "DECLINED"],
				schema: "public",
				typeName: "DebtConnectionStatus",
			}),
			this.createNativeEnumType({
				members: ["ORIGIN", "TRANSACTION", "PURCHASE", "MIGRATED_SETTLEMENT"],
				schema: "public",
				typeName: "DebtEventKind",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("recipientId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("requesterId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("respondedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
					}),
					col("status", '"DebtConnectionStatus"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "DebtConnectionStatus" } },
						default: lit("PENDING"),
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "DebtConnection_pkey" })],
				schema: "public",
				table: "DebtConnection",
			}),
			this.createTable({
				columns: [
					col("amount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("connectionId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("createdByUserId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("date", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("debtPersonId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("description", "character varying(1000)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 1000 } },
					}),
					col("dueDate", "date", { codecRef: { codecId: "pg/date@1" } }),
					col("effect", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("kind", '"DebtEventKind"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "DebtEventKind" } },
						default: lit("ORIGIN"),
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "DebtEvent_pkey" })],
				schema: "public",
				table: "DebtEvent",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("eventId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("hiddenAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
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
				constraints: [primaryKey(["id"], { name: "DebtEventVisibility_pkey" })],
				schema: "public",
				table: "DebtEventVisibility",
			}),
			this.createTable({
				columns: [
					col("connectionId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("hiddenAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("name", "character varying(100)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
						notNull: true,
					}),
					col("normalizedName", "character varying(100)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
						notNull: true,
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
				constraints: [primaryKey(["id"], { name: "DebtPerson_pkey" })],
				schema: "public",
				table: "DebtPerson",
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
						notNull: true,
					}),
					col("eventId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("isCreator", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
						notNull: true,
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
				constraints: [primaryKey(["id"], { name: "DebtPurchaseLink_pkey" })],
				schema: "public",
				table: "DebtPurchaseLink",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("eventId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("isCreator", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
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
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "DebtTransactionLink_pkey" })],
				schema: "public",
				table: "DebtTransactionLink",
			}),
			rawSql({
				execute: [
					{
						description: "Create debt people from legacy debt names",
						sql: `INSERT INTO "public"."DebtPerson" (
  "id", "userId", "name", "normalizedName", "createdAt", "updatedAt"
)
SELECT
  cuid2(),
  "userId",
  min(regexp_replace(trim("personName"), '\\s+', ' ', 'g')),
  lower(regexp_replace(trim("personName"), '\\s+', ' ', 'g')),
  min("createdAt"),
  max("updatedAt")
FROM "public"."Debt"
GROUP BY "userId", lower(regexp_replace(trim("personName"), '\\s+', ' ', 'g'))`,
					},
					{
						description: "Convert legacy debts into debt origin events",
						sql: `INSERT INTO "public"."DebtEvent" (
  "id", "debtPersonId", "createdByUserId", "kind", "amount", "effect",
  "date", "dueDate", "description", "createdAt", "updatedAt"
)
SELECT
  debt."id",
  person."id",
  debt."userId",
  'ORIGIN'::"public"."DebtEventKind",
  debt."amount",
  CASE WHEN debt."isOwedToMe" THEN debt."amount" ELSE -debt."amount" END,
  debt."date",
  debt."dueDate",
  debt."description",
  debt."createdAt",
  debt."updatedAt"
FROM "public"."Debt" AS debt
INNER JOIN "public"."DebtPerson" AS person
  ON person."userId" = debt."userId"
 AND person."normalizedName" = lower(regexp_replace(trim(debt."personName"), '\\s+', ' ', 'g'))`,
					},
					{
						description: "Balance legacy settled debts with migrated settlement events",
						sql: `INSERT INTO "public"."DebtEvent" (
  "id", "debtPersonId", "createdByUserId", "kind", "amount", "effect",
  "date", "description", "createdAt", "updatedAt"
)
SELECT
  cuid2(),
  origin."debtPersonId",
  debt."userId",
  'MIGRATED_SETTLEMENT'::"public"."DebtEventKind",
  debt."amount",
  -origin."effect",
  COALESCE(debt."paidDate", debt."date"),
  'Quitação migrada',
  COALESCE(debt."paidDate"::timestamp, debt."updatedAt"),
  debt."updatedAt"
FROM "public"."Debt" AS debt
INNER JOIN "public"."DebtEvent" AS origin ON origin."id" = debt."id"
WHERE debt."isPaid" = true`,
					},
				],
				id: "DebtEvent.legacy.backfill",
				label: "Convert legacy debts to ledger events",
				operationClass: "additive",
				postcheck: [
					{
						description: "Every legacy debt has a corresponding origin event",
						sql: `SELECT NOT EXISTS (
  SELECT 1 FROM "public"."Debt" AS debt
  LEFT JOIN "public"."DebtEvent" AS event ON event."id" = debt."id"
  WHERE event."id" IS NULL
) AS ok`,
					},
				],
				precheck: [],
				target: { id: "postgres" },
			}),
			this.addUnique({
				columns: ["creditPurchaseId"],
				constraint: "DebtPurchaseLink_creditPurchaseId_key",
				schema: "public",
				table: "DebtPurchaseLink",
			}),
			this.addUnique({
				columns: ["transactionId"],
				constraint: "DebtTransactionLink_transactionId_key",
				schema: "public",
				table: "DebtTransactionLink",
			}),
			this.createIndex({
				columns: ["recipientId", "status"],
				index: "DebtConnection_recipientId_status_idx",
				schema: "public",
				table: "DebtConnection",
			}),
			this.createIndex({
				columns: ["requesterId", "recipientId"],
				extras: { unique: true },
				index: "DebtConnection_requesterId_recipientId_key",
				schema: "public",
				table: "DebtConnection",
			}),
			this.createIndex({
				columns: ["connectionId", "date"],
				index: "DebtEvent_connectionId_date_idx",
				schema: "public",
				table: "DebtEvent",
			}),
			this.createIndex({
				columns: ["createdByUserId"],
				index: "DebtEvent_createdByUserId_idx",
				schema: "public",
				table: "DebtEvent",
			}),
			this.createIndex({
				columns: ["debtPersonId", "date"],
				index: "DebtEvent_debtPersonId_date_idx",
				schema: "public",
				table: "DebtEvent",
			}),
			this.createIndex({
				columns: ["eventId", "userId"],
				extras: { unique: true },
				index: "DebtEventVisibility_eventId_userId_key",
				schema: "public",
				table: "DebtEventVisibility",
			}),
			this.createIndex({
				columns: ["userId", "hiddenAt"],
				index: "DebtEventVisibility_userId_hiddenAt_idx",
				schema: "public",
				table: "DebtEventVisibility",
			}),
			this.createIndex({
				columns: ["connectionId"],
				index: "DebtPerson_connectionId_idx",
				schema: "public",
				table: "DebtPerson",
			}),
			this.createIndex({
				columns: ["userId", "normalizedName"],
				extras: { unique: true },
				index: "DebtPerson_userId_normalizedName_key",
				schema: "public",
				table: "DebtPerson",
			}),
			this.createIndex({
				columns: ["eventId", "userId"],
				extras: { unique: true },
				index: "DebtPurchaseLink_eventId_userId_key",
				schema: "public",
				table: "DebtPurchaseLink",
			}),
			this.createIndex({
				columns: ["eventId", "userId"],
				extras: { unique: true },
				index: "DebtTransactionLink_eventId_userId_key",
				schema: "public",
				table: "DebtTransactionLink",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["requesterId"],
					name: "DebtConnection_requesterId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "DebtConnection",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["recipientId"],
					name: "DebtConnection_recipientId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "DebtConnection",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["debtPersonId"],
					name: "DebtEvent_debtPersonId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "DebtPerson" },
				},
				schema: "public",
				table: "DebtEvent",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["connectionId"],
					name: "DebtEvent_connectionId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "DebtConnection" },
				},
				schema: "public",
				table: "DebtEvent",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["createdByUserId"],
					name: "DebtEvent_createdByUserId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "DebtEvent",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["eventId"],
					name: "DebtEventVisibility_eventId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "DebtEvent" },
				},
				schema: "public",
				table: "DebtEventVisibility",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "DebtEventVisibility_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "DebtEventVisibility",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "DebtPerson_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "DebtPerson",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["connectionId"],
					name: "DebtPerson_connectionId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "DebtConnection" },
				},
				schema: "public",
				table: "DebtPerson",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["eventId"],
					name: "DebtPurchaseLink_eventId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "DebtEvent" },
				},
				schema: "public",
				table: "DebtPurchaseLink",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["creditPurchaseId"],
					name: "DebtPurchaseLink_creditPurchaseId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditPurchase" },
				},
				schema: "public",
				table: "DebtPurchaseLink",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "DebtPurchaseLink_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "DebtPurchaseLink",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["eventId"],
					name: "DebtTransactionLink_eventId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "DebtEvent" },
				},
				schema: "public",
				table: "DebtTransactionLink",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["transactionId"],
					name: "DebtTransactionLink_transactionId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Transaction" },
				},
				schema: "public",
				table: "DebtTransactionLink",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "DebtTransactionLink_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "DebtTransactionLink",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
