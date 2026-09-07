#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI, primaryKey } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/1b756b145a060f4806532babe298e22734ac3a15a9debef9c85f8743303bb846/contract";
import startContract from "../../snapshots/1b756b145a060f4806532babe298e22734ac3a15a9debef9c85f8743303bb846/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/b982081c32d465513c6d11572c860e32991065ec2cb289fb740fd410adc2d92f/contract";
import endContract from "../../snapshots/b982081c32d465513c6d11572c860e32991065ec2cb289fb740fd410adc2d92f/contract.json" with {
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
					col("effectiveDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("financialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
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
					col("yieldPeriod", '"FinancialAccountYieldPeriod"', {
						codecRef: {
							codecId: "pg/enum@1",
							typeParams: { typeName: "FinancialAccountYieldPeriod" },
						},
					}),
					col("yieldRate", "numeric(7,4)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
					}),
				],
				constraints: [primaryKey(["id"], { name: "FinancialAccountYieldRateHistory_pkey" })],
				schema: "public",
				table: "FinancialAccountYieldRateHistory",
			}),
			this.createIndex({
				columns: ["financialAccountId", "effectiveDate"],
				extras: { unique: true },
				index: "FinancialAccountYieldRateHistory_accountId_effectiveDate_key",
				schema: "public",
				table: "FinancialAccountYieldRateHistory",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "FinancialAccountYieldRateHistory_financialAccountId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "FinancialAccountYieldRateHistory",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
