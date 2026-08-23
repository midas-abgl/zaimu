#!/usr/bin/env -S node
import { col, Migration, MigrationCLI, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/7ba8ce9bb6a6d0056a2ed6d434753d6a5b01af68f510a6e41e2ca1f5be22116f/contract";
import startContract from "../../snapshots/7ba8ce9bb6a6d0056a2ed6d434753d6a5b01af68f510a6e41e2ca1f5be22116f/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/7e10bdadb0733ef1799bba084f3d689d6b4e7b6763223924f604ebb2dc78915e/contract";
import endContract from "../../snapshots/7e10bdadb0733ef1799bba084f3d689d6b4e7b6763223924f604ebb2dc78915e/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("issuer", "character varying(320)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 320 } },
				}),
				schema: "public",
				table: "account",
			}),
			rawSql({
				execute: [
					{
						description: "Backfill stable Better Auth account issuers",
						sql: `UPDATE public.account
SET issuer = CASE
  WHEN "providerId" = 'credential' THEN 'local:credential'
  ELSE 'local:oauth:' || "providerId"
END
WHERE issuer IS NULL`,
					},
				],
				id: "account.issuer.backfill",
				label: 'Backfill "account.issuer"',
				operationClass: "widening",
				postcheck: [
					{
						description: "Every account has an issuer",
						sql: "SELECT NOT EXISTS (SELECT 1 FROM public.account WHERE issuer IS NULL) AS ok",
					},
				],
				precheck: [
					{
						description: "Legacy provider IDs are safe URI components",
						sql: `SELECT NOT EXISTS (
  SELECT 1 FROM public.account
  WHERE "providerId" !~ '^[A-Za-z0-9._~-]+$'
) AS ok`,
					},
				],
				target: { id: "postgres" },
			}),
			this.setNotNull({ column: "issuer", schema: "public", table: "account" }),
			this.createIndex({
				columns: ["issuer", "accountId"],
				extras: { unique: true },
				index: "account_issuer_accountId_key",
				schema: "public",
				table: "account",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
