#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI, primaryKey, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/6ac3b92b6d368eae70728fb838176e0c7b2da4d521ca2b1853c52256368c9f81/contract";
import endContract from "../../snapshots/6ac3b92b6d368eae70728fb838176e0c7b2da4d521ca2b1853c52256368c9f81/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/ac6107d43c12bc582b920bf22a16ba4ba27dbf0c69aa011cf7f72e2b22917cf5/contract";
import startContract from "../../snapshots/ac6107d43c12bc582b920bf22a16ba4ba27dbf0c69aa011cf7f72e2b22917cf5/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.createTable({
				columns: [
					col("categoryId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("entityId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("entityType", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
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
				],
				constraints: [primaryKey(["id"], { name: "TagAssignment_pkey" })],
				schema: "public",
				table: "TagAssignment",
			}),
			this.createIndex({
				columns: ["categoryId", "entityType", "entityId"],
				extras: { unique: true },
				index: "TagAssignment_categoryId_entityType_entityId_key",
				schema: "public",
				table: "TagAssignment",
			}),
			this.createIndex({
				columns: ["entityType", "entityId"],
				index: "TagAssignment_entityType_entityId_idx",
				schema: "public",
				table: "TagAssignment",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["categoryId"],
					name: "TagAssignment_categoryId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Category" },
				},
				schema: "public",
				table: "TagAssignment",
			}),
			rawSql({
				execute: [
					{
						description: "Convert existing category links into generic tag assignments",
						sql: `INSERT INTO "public"."TagAssignment" ("id", "categoryId", "entityType", "entityId", "createdAt", "updatedAt")
SELECT cuid2(), "categoryId", 'CREDIT_PURCHASE', "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "public"."CreditPurchase" WHERE "categoryId" IS NOT NULL
ON CONFLICT ("categoryId", "entityType", "entityId") DO NOTHING;

INSERT INTO "public"."TagAssignment" ("id", "categoryId", "entityType", "entityId", "createdAt", "updatedAt")
SELECT cuid2(), "categoryId", 'RECURRING_PAYMENT', "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "public"."RecurringPayment" WHERE "categoryId" IS NOT NULL
ON CONFLICT ("categoryId", "entityType", "entityId") DO NOTHING;

INSERT INTO "public"."TagAssignment" ("id", "categoryId", "entityType", "entityId", "createdAt", "updatedAt")
SELECT cuid2(), "categoryId", 'TRANSACTION', "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "public"."Transaction" WHERE "categoryId" IS NOT NULL
ON CONFLICT ("categoryId", "entityType", "entityId") DO NOTHING`,
					},
				],
				id: "TagAssignment.legacyCategories.backfill",
				label: "Backfill generic tag assignments",
				operationClass: "additive",
				postcheck: [
					{
						description: "Every legacy category link has a matching tag assignment",
						sql: `SELECT NOT EXISTS (
  SELECT 1 FROM (
    SELECT "id", "categoryId", 'CREDIT_PURCHASE' AS "entityType" FROM "public"."CreditPurchase" WHERE "categoryId" IS NOT NULL
    UNION ALL
    SELECT "id", "categoryId", 'RECURRING_PAYMENT' AS "entityType" FROM "public"."RecurringPayment" WHERE "categoryId" IS NOT NULL
    UNION ALL
    SELECT "id", "categoryId", 'TRANSACTION' AS "entityType" FROM "public"."Transaction" WHERE "categoryId" IS NOT NULL
  ) AS legacy
  LEFT JOIN "public"."TagAssignment" AS assignment
    ON assignment."categoryId" = legacy."categoryId"
   AND assignment."entityType" = legacy."entityType"
   AND assignment."entityId" = legacy."id"
  WHERE assignment."id" IS NULL
) AS ok`,
					},
				],
				precheck: [],
				target: { id: "postgres" },
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
