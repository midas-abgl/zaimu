#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI, primaryKey, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/6c342289482fdae92553f3e210981e93d761174a0a9b16ca83866120d3b394ab/contract";
import startContract from "../../snapshots/6c342289482fdae92553f3e210981e93d761174a0a9b16ca83866120d3b394ab/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/aa53cc0f4fc05e1a69da4cb94795f6483af843e9bc64bdbd635ce1bb73201671/contract";
import endContract from "../../snapshots/aa53cc0f4fc05e1a69da4cb94795f6483af843e9bc64bdbd635ce1bb73201671/contract.json" with {
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
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("name", "character varying(200)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
						notNull: true,
					}),
					col("normalizedName", "character varying(200)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
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
				constraints: [primaryKey(["id"], { name: "Store_pkey" })],
				schema: "public",
				table: "Store",
			}),
			rawSql({
				execute: [
					{
						description: "Import store names from transactions and credit purchases",
						sql: `WITH legacy_stores AS (
  SELECT
    COALESCE(origin."userId", destination."userId", recurring."userId", salary."userId", subscription."userId") AS "userId",
    regexp_replace(trim(transaction."storeName"), '\\s+', ' ', 'g') AS "name"
  FROM "public"."Transaction" AS transaction
  LEFT JOIN "public"."FinancialAccount" AS origin ON origin."id" = transaction."originFinancialAccountId"
  LEFT JOIN "public"."FinancialAccount" AS destination ON destination."id" = transaction."destinationFinancialAccountId"
  LEFT JOIN "public"."RecurringPayment" AS recurring ON recurring."id" = transaction."recurrenceId"
  LEFT JOIN "public"."Salary" AS salary ON salary."id" = transaction."salaryId"
  LEFT JOIN "public"."Subscription" AS subscription ON subscription."id" = transaction."subscriptionId"
  WHERE transaction."storeName" IS NOT NULL

  UNION ALL

  SELECT
    account."userId",
    regexp_replace(trim(purchase."storeName"), '\\s+', ' ', 'g')
  FROM "public"."CreditPurchase" AS purchase
  INNER JOIN "public"."CreditCardStatement" AS statement ON statement."id" = purchase."statementId"
  INNER JOIN "public"."CreditCard" AS card ON card."id" = statement."creditCardId"
  INNER JOIN "public"."FinancialAccount" AS account ON account."id" = card."financialAccountId"
  WHERE purchase."storeName" IS NOT NULL
), normalized_stores AS (
  SELECT
    "userId",
    lower("name") AS "normalizedName",
    min("name") AS "name"
  FROM legacy_stores
  WHERE "userId" IS NOT NULL AND "name" <> ''
  GROUP BY "userId", lower("name")
)
INSERT INTO "public"."Store" (
  "id", "userId", "name", "normalizedName", "createdAt", "updatedAt"
)
SELECT cuid2(), "userId", "name", "normalizedName", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM normalized_stores`,
					},
				],
				id: "Store.backfill",
				label: "Import existing store names",
				operationClass: "additive",
				postcheck: [
					{
						description: "Every legacy store name was imported",
						sql: `WITH legacy_stores AS (
  SELECT
    COALESCE(origin."userId", destination."userId", recurring."userId", salary."userId", subscription."userId") AS "userId",
    regexp_replace(trim(transaction."storeName"), '\\s+', ' ', 'g') AS "name"
  FROM "public"."Transaction" AS transaction
  LEFT JOIN "public"."FinancialAccount" AS origin ON origin."id" = transaction."originFinancialAccountId"
  LEFT JOIN "public"."FinancialAccount" AS destination ON destination."id" = transaction."destinationFinancialAccountId"
  LEFT JOIN "public"."RecurringPayment" AS recurring ON recurring."id" = transaction."recurrenceId"
  LEFT JOIN "public"."Salary" AS salary ON salary."id" = transaction."salaryId"
  LEFT JOIN "public"."Subscription" AS subscription ON subscription."id" = transaction."subscriptionId"
  WHERE transaction."storeName" IS NOT NULL

  UNION ALL

  SELECT
    account."userId",
    regexp_replace(trim(purchase."storeName"), '\\s+', ' ', 'g')
  FROM "public"."CreditPurchase" AS purchase
  INNER JOIN "public"."CreditCardStatement" AS statement ON statement."id" = purchase."statementId"
  INNER JOIN "public"."CreditCard" AS card ON card."id" = statement."creditCardId"
  INNER JOIN "public"."FinancialAccount" AS account ON account."id" = card."financialAccountId"
  WHERE purchase."storeName" IS NOT NULL
)
SELECT NOT EXISTS (
  SELECT 1
  FROM legacy_stores
  WHERE "userId" IS NOT NULL
    AND "name" <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."Store"
      WHERE "Store"."userId" = legacy_stores."userId"
        AND "Store"."normalizedName" = lower(legacy_stores."name")
    )
) AS ok`,
					},
				],
				precheck: [],
				target: { id: "postgres" },
			}),
			this.createIndex({
				columns: ["userId", "normalizedName"],
				extras: { unique: true },
				index: "Store_userId_normalizedName_key",
				schema: "public",
				table: "Store",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "Store_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "Store",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
