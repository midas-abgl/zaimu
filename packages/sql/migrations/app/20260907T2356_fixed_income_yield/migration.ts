#!/usr/bin/env -S node
import { col, Migration, MigrationCLI, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/b55b671b2dc868399f2f0a050038a9b35b973d5d9d1561b1a4e5d0697f84b3b2/contract";
import startContract from "../../snapshots/b55b671b2dc868399f2f0a050038a9b35b973d5d9d1561b1a4e5d0697f84b3b2/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/f2ff31e2dad80265c33380302187c5736f25ddfe1a9c4abe4c3ab191f10f2968/contract";
import endContract from "../../snapshots/f2ff31e2dad80265c33380302187c5736f25ddfe1a9c4abe4c3ab191f10f2968/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("cashbackYieldReferencePercentage", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "CreditCard",
			}),
			this.addColumn({
				column: col("cashbackYieldReferenceRate", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "CreditCard",
			}),
			this.addColumn({
				column: col("cashbackYieldReferencePercentage", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("cashbackYieldReferenceRate", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("yieldFixedRate", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "FinancialAccount",
			}),
			this.addColumn({
				column: col("yieldReferencePercentage", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "FinancialAccount",
			}),
			this.addColumn({
				column: col("yieldReferenceRate", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "FinancialAccount",
			}),
			this.addColumn({
				column: col("yieldFixedRate", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "FinancialAccountYieldRateHistory",
			}),
			this.addColumn({
				column: col("yieldReferencePercentage", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "FinancialAccountYieldRateHistory",
			}),
			this.addColumn({
				column: col("yieldReferenceRate", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "FinancialAccountYieldRateHistory",
			}),
			rawSql({
				execute: [
					{
						description: "Preserve legacy account yields as fixed rates",
						sql: `UPDATE "public"."FinancialAccount"
SET "yieldFixedRate" = "yieldRate"
WHERE "yieldRate" IS NOT NULL;

UPDATE "public"."FinancialAccountYieldRateHistory"
SET "yieldFixedRate" = "yieldRate"
WHERE "yieldRate" IS NOT NULL`,
					},
					{
						description: "Preserve legacy cashback yields as reference rates at 100 percent",
						sql: `UPDATE "public"."CreditCard"
SET "cashbackYieldReferenceRate" = "cashbackYieldRate",
    "cashbackYieldReferencePercentage" = 100
WHERE "cashbackYieldRate" IS NOT NULL;

UPDATE "public"."CreditPurchase"
SET "cashbackYieldReferenceRate" = "cashbackYieldRate",
    "cashbackYieldReferencePercentage" = 100
WHERE "cashbackYieldRate" IS NOT NULL`,
					},
					{
						description: "Enforce complete positive fixed-income yield settings",
						sql: `ALTER TABLE "public"."FinancialAccount"
ADD CONSTRAINT "FinancialAccount_yield_settings_check" CHECK (
  ("yieldPeriod" IS NULL AND "yieldReferenceRate" IS NULL AND "yieldReferencePercentage" IS NULL AND "yieldFixedRate" IS NULL)
  OR
  ("yieldPeriod" IS NOT NULL
    AND ("yieldFixedRate" IS NULL OR "yieldFixedRate" > 0)
    AND ("yieldReferenceRate" IS NULL OR "yieldReferenceRate" > 0)
    AND ("yieldReferencePercentage" IS NULL OR "yieldReferencePercentage" > 0)
    AND (("yieldReferenceRate" IS NULL) = ("yieldReferencePercentage" IS NULL))
    AND ("yieldFixedRate" IS NOT NULL OR "yieldReferenceRate" IS NOT NULL))
);

ALTER TABLE "public"."FinancialAccountYieldRateHistory"
ADD CONSTRAINT "FinancialAccountYieldRateHistory_yield_settings_check" CHECK (
  ("yieldPeriod" IS NULL AND "yieldReferenceRate" IS NULL AND "yieldReferencePercentage" IS NULL AND "yieldFixedRate" IS NULL)
  OR
  ("yieldPeriod" IS NOT NULL
    AND ("yieldFixedRate" IS NULL OR "yieldFixedRate" > 0)
    AND ("yieldReferenceRate" IS NULL OR "yieldReferenceRate" > 0)
    AND ("yieldReferencePercentage" IS NULL OR "yieldReferencePercentage" > 0)
    AND (("yieldReferenceRate" IS NULL) = ("yieldReferencePercentage" IS NULL))
    AND ("yieldFixedRate" IS NOT NULL OR "yieldReferenceRate" IS NOT NULL))
);

ALTER TABLE "public"."CreditCard"
ADD CONSTRAINT "CreditCard_cashback_yield_settings_check" CHECK (
  ("cashbackYieldPeriod" IS NULL AND "cashbackYieldReferenceRate" IS NULL AND "cashbackYieldReferencePercentage" IS NULL)
  OR
  ("cashbackYieldPeriod" IS NOT NULL AND "cashbackYieldReferenceRate" > 0 AND "cashbackYieldReferencePercentage" > 0)
);

ALTER TABLE "public"."CreditPurchase"
ADD CONSTRAINT "CreditPurchase_cashback_yield_settings_check" CHECK (
  ("cashbackYieldPeriod" IS NULL AND "cashbackYieldReferenceRate" IS NULL AND "cashbackYieldReferencePercentage" IS NULL)
  OR
  ("cashbackYieldPeriod" IS NOT NULL AND "cashbackYieldReferenceRate" > 0 AND "cashbackYieldReferencePercentage" > 0)
)`,
					},
				],
				id: "fixedIncomeYield.backfillAndConstraints",
				label: "Backfill fixed-income yield settings and enforce invariants",
				operationClass: "data",
				postcheck: [
					{
						description: "Legacy yield rates were preserved",
						sql: `SELECT
  NOT EXISTS (
    SELECT 1 FROM "public"."FinancialAccount"
    WHERE "yieldRate" IS NOT NULL AND "yieldFixedRate" IS DISTINCT FROM "yieldRate"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "public"."FinancialAccountYieldRateHistory"
    WHERE "yieldRate" IS NOT NULL AND "yieldFixedRate" IS DISTINCT FROM "yieldRate"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "public"."CreditCard"
    WHERE "cashbackYieldRate" IS NOT NULL
      AND ("cashbackYieldReferenceRate" IS DISTINCT FROM "cashbackYieldRate"
        OR "cashbackYieldReferencePercentage" IS DISTINCT FROM 100)
  )
  AND NOT EXISTS (
    SELECT 1 FROM "public"."CreditPurchase"
    WHERE "cashbackYieldRate" IS NOT NULL
      AND ("cashbackYieldReferenceRate" IS DISTINCT FROM "cashbackYieldRate"
        OR "cashbackYieldReferencePercentage" IS DISTINCT FROM 100)
  ) AS ok`,
					},
					{
						description: "Fixed-income yield constraints exist",
						sql: `SELECT count(*) = 4 AS ok
FROM "pg_constraint" AS c
INNER JOIN "pg_namespace" AS n ON n."oid" = c."connamespace"
WHERE n."nspname" = 'public'
  AND c."conname" IN (
  'FinancialAccount_yield_settings_check',
  'FinancialAccountYieldRateHistory_yield_settings_check',
  'CreditCard_cashback_yield_settings_check',
  'CreditPurchase_cashback_yield_settings_check'
)`,
					},
				],
				precheck: [],
				target: { id: "postgres" },
			}),
			this.dropColumn({ column: "cashbackYieldRate", schema: "public", table: "CreditCard" }),
			this.dropColumn({ column: "cashbackYieldRate", schema: "public", table: "CreditPurchase" }),
			this.dropColumn({ column: "yieldRate", schema: "public", table: "FinancialAccount" }),
			this.dropColumn({
				column: "yieldRate",
				schema: "public",
				table: "FinancialAccountYieldRateHistory",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
