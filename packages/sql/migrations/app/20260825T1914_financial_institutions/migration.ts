#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI, primaryKey, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/ac6107d43c12bc582b920bf22a16ba4ba27dbf0c69aa011cf7f72e2b22917cf5/contract";
import endContract from "../../snapshots/ac6107d43c12bc582b920bf22a16ba4ba27dbf0c69aa011cf7f72e2b22917cf5/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/b1bc2da8ff152b901f53357bec2d3325644f57361ae04c6b41a5c77af7ea3b16/contract";
import startContract from "../../snapshots/b1bc2da8ff152b901f53357bec2d3325644f57361ae04c6b41a5c77af7ea3b16/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.dropIndex({
				index: "FinancialAccount_userId_name_type_key",
				schema: "public",
				table: "FinancialAccount",
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
				constraints: [primaryKey(["id"], { name: "FinancialInstitution_pkey" })],
				schema: "public",
				table: "FinancialInstitution",
			}),
			this.addColumn({
				column: col("institutionId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "FinancialAccount",
			}),
			rawSql({
				execute: [
					{
						description: "Group legacy accounts that shared an institution-like name",
						sql: `WITH normalized_accounts AS (
  SELECT
    "userId",
    lower(regexp_replace(trim("name"), '\\s+', ' ', 'g')) AS "normalizedName",
    min(regexp_replace(trim("name"), '\\s+', ' ', 'g')) AS "displayName",
    count(*) AS "accountCount"
  FROM "public"."FinancialAccount"
  WHERE "type" <> 'CASH'
  GROUP BY "userId", lower(regexp_replace(trim("name"), '\\s+', ' ', 'g'))
), inserted_institutions AS (
  INSERT INTO "public"."FinancialInstitution" (
    "id", "userId", "name", "normalizedName", "createdAt", "updatedAt"
  )
  SELECT cuid2(), "userId", "displayName", "normalizedName", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM normalized_accounts
  WHERE "accountCount" > 1
  RETURNING "id", "userId", "normalizedName"
)
UPDATE "public"."FinancialAccount" AS account
SET "institutionId" = institution."id"
FROM inserted_institutions AS institution
WHERE account."userId" = institution."userId"
  AND lower(regexp_replace(trim(account."name"), '\\s+', ' ', 'g')) = institution."normalizedName"`,
					},
				],
				id: "FinancialAccount.institutionId.backfill",
				label: "Group legacy accounts by repeated institution name",
				operationClass: "additive",
				postcheck: [
					{
						description: "Every repeated non-cash account name is assigned to an institution",
						sql: `SELECT NOT EXISTS (
  SELECT 1
  FROM "public"."FinancialAccount"
  WHERE "type" <> 'CASH' AND "institutionId" IS NULL
  GROUP BY "userId", lower(regexp_replace(trim("name"), '\\s+', ' ', 'g'))
  HAVING count(*) > 1
) AS ok`,
					},
				],
				precheck: [],
				target: { id: "postgres" },
			}),
			this.createIndex({
				columns: ["institutionId"],
				index: "FinancialAccount_institutionId_idx",
				schema: "public",
				table: "FinancialAccount",
			}),
			this.createIndex({
				columns: ["userId", "institutionId", "name", "type"],
				extras: { unique: true },
				index: "FinancialAccount_userId_institutionId_name_type_key",
				schema: "public",
				table: "FinancialAccount",
			}),
			this.createIndex({
				columns: ["userId", "normalizedName"],
				extras: { unique: true },
				index: "FinancialInstitution_userId_normalizedName_key",
				schema: "public",
				table: "FinancialInstitution",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "FinancialInstitution_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "FinancialInstitution",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["institutionId"],
					name: "FinancialAccount_institutionId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialInstitution" },
				},
				schema: "public",
				table: "FinancialAccount",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
