#!/usr/bin/env -S node
import { col, fn, lit, Migration, MigrationCLI, primaryKey } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/b55b671b2dc868399f2f0a050038a9b35b973d5d9d1561b1a4e5d0697f84b3b2/contract";
import endContract from "../../snapshots/b55b671b2dc868399f2f0a050038a9b35b973d5d9d1561b1a4e5d0697f84b3b2/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/b982081c32d465513c6d11572c860e32991065ec2cb289fb740fd410adc2d92f/contract";
import startContract from "../../snapshots/b982081c32d465513c6d11572c860e32991065ec2cb289fb740fd410adc2d92f/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.createNativeEnumType({
				members: ["AUTOMATIC", "MANUAL"],
				schema: "public",
				typeName: "FinancialAccountYieldKind",
			}),
			this.createTable({
				columns: [
					col("amount", "numeric(12,4)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 4 } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("date", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("financialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("isExcluded", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
						notNull: true,
					}),
					col("kind", '"FinancialAccountYieldKind"', {
						codecRef: {
							codecId: "pg/enum@1",
							typeParams: { typeName: "FinancialAccountYieldKind" },
						},
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "FinancialAccountYield_pkey" })],
				schema: "public",
				table: "FinancialAccountYield",
			}),
			this.createIndex({
				columns: ["financialAccountId", "date", "kind"],
				extras: { unique: true },
				index: "FinancialAccountYield_accountId_date_kind_key",
				schema: "public",
				table: "FinancialAccountYield",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "FinancialAccountYield_financialAccountId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "FinancialAccountYield",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
