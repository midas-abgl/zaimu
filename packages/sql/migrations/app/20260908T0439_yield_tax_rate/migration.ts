#!/usr/bin/env -S node
import { col, Migration, MigrationCLI, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/846ad3bf0f9bb8b61e0353f7d95972ad19fdbf4ac71ca41235cc249876dfa77b/contract";
import endContract from "../../snapshots/846ad3bf0f9bb8b61e0353f7d95972ad19fdbf4ac71ca41235cc249876dfa77b/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/f2ff31e2dad80265c33380302187c5736f25ddfe1a9c4abe4c3ab191f10f2968/contract";
import startContract from "../../snapshots/f2ff31e2dad80265c33380302187c5736f25ddfe1a9c4abe4c3ab191f10f2968/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("yieldTaxRate", "numeric(5,2)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 5, scale: 2 } },
				}),
				schema: "public",
				table: "FinancialAccount",
			}),
			this.addColumn({
				column: col("yieldTaxRate", "numeric(5,2)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 5, scale: 2 } },
				}),
				schema: "public",
				table: "FinancialAccountYieldRateHistory",
			}),
			rawSql({
				execute: [
					{
						description: "Enforce complete fixed-income settings with optional yield tax rates",
						sql: `ALTER TABLE "public"."FinancialAccount"
DROP CONSTRAINT "FinancialAccount_yield_settings_check";

ALTER TABLE "public"."FinancialAccount"
ADD CONSTRAINT "FinancialAccount_yield_settings_check" CHECK (
  ("yieldPeriod" IS NULL
    AND "yieldReferenceRate" IS NULL
    AND "yieldReferencePercentage" IS NULL
    AND "yieldFixedRate" IS NULL
    AND "yieldTaxRate" IS NULL)
  OR
  ("yieldPeriod" IS NOT NULL
    AND ("yieldFixedRate" IS NULL OR "yieldFixedRate" > 0)
    AND ("yieldReferenceRate" IS NULL OR "yieldReferenceRate" > 0)
    AND ("yieldReferencePercentage" IS NULL OR "yieldReferencePercentage" > 0)
    AND (("yieldReferenceRate" IS NULL) = ("yieldReferencePercentage" IS NULL))
    AND ("yieldFixedRate" IS NOT NULL OR "yieldReferenceRate" IS NOT NULL)
    AND ("yieldTaxRate" IS NULL OR ("yieldTaxRate" >= 0 AND "yieldTaxRate" <= 100))
  )
);

ALTER TABLE "public"."FinancialAccountYieldRateHistory"
DROP CONSTRAINT "FinancialAccountYieldRateHistory_yield_settings_check";

ALTER TABLE "public"."FinancialAccountYieldRateHistory"
ADD CONSTRAINT "FinancialAccountYieldRateHistory_yield_settings_check" CHECK (
  ("yieldPeriod" IS NULL
    AND "yieldReferenceRate" IS NULL
    AND "yieldReferencePercentage" IS NULL
    AND "yieldFixedRate" IS NULL
    AND "yieldTaxRate" IS NULL)
  OR
  ("yieldPeriod" IS NOT NULL
    AND ("yieldFixedRate" IS NULL OR "yieldFixedRate" > 0)
    AND ("yieldReferenceRate" IS NULL OR "yieldReferenceRate" > 0)
    AND ("yieldReferencePercentage" IS NULL OR "yieldReferencePercentage" > 0)
    AND (("yieldReferenceRate" IS NULL) = ("yieldReferencePercentage" IS NULL))
    AND ("yieldFixedRate" IS NOT NULL OR "yieldReferenceRate" IS NOT NULL)
    AND ("yieldTaxRate" IS NULL OR ("yieldTaxRate" >= 0 AND "yieldTaxRate" <= 100))
  )
);

ALTER TABLE "public"."FinancialAccount"
ADD CONSTRAINT "FinancialAccount_yield_tax_rate_check"
CHECK ("yieldTaxRate" IS NULL OR ("yieldTaxRate" >= 0 AND "yieldTaxRate" <= 100));

ALTER TABLE "public"."FinancialAccountYieldRateHistory"
ADD CONSTRAINT "FinancialAccountYieldRateHistory_yield_tax_rate_check"
CHECK ("yieldTaxRate" IS NULL OR ("yieldTaxRate" >= 0 AND "yieldTaxRate" <= 100))`,
					},
				],
				id: "yieldTaxRate.constraints",
				label: "Enforce valid fixed-income yield tax rates",
				operationClass: "additive",
				postcheck: [
					{
						description: "Fixed-income tax constraints exist",
						sql: `SELECT count(*) = 4 AS ok
FROM "pg_constraint" AS c
INNER JOIN "pg_namespace" AS n ON n."oid" = c."connamespace"
WHERE n."nspname" = 'public'
  AND c."conname" IN (
    'FinancialAccount_yield_tax_rate_check',
    'FinancialAccountYieldRateHistory_yield_tax_rate_check',
    'FinancialAccount_yield_settings_check',
    'FinancialAccountYieldRateHistory_yield_settings_check'
  )`,
					},
				],
				precheck: [],
				target: { id: "postgres" },
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
