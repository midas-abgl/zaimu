#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI, primaryKey } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/1b756b145a060f4806532babe298e22734ac3a15a9debef9c85f8743303bb846/contract";
import endContract from "../../snapshots/1b756b145a060f4806532babe298e22734ac3a15a9debef9c85f8743303bb846/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/18f3ea0e54ad7a8be8506e558a9ac920744e265afdf3f30dc5beab80f7ac25fa/contract";
import startContract from "../../snapshots/18f3ea0e54ad7a8be8506e558a9ac920744e265afdf3f30dc5beab80f7ac25fa/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.createNativeEnumType({
				members: ["MONTHLY", "YEARLY"],
				schema: "public",
				typeName: "FinancialAccountYieldPeriod",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("date", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
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
				constraints: [primaryKey(["id"], { name: "FinancialAccountYieldHoliday_pkey" })],
				schema: "public",
				table: "FinancialAccountYieldHoliday",
			}),
			this.addColumn({
				column: col("yieldPeriod", '"FinancialAccountYieldPeriod"', {
					codecRef: {
						codecId: "pg/enum@1",
						typeParams: { typeName: "FinancialAccountYieldPeriod" },
					},
				}),
				schema: "public",
				table: "FinancialAccount",
			}),
			this.addColumn({
				column: col("yieldRate", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "FinancialAccount",
			}),
			this.createIndex({
				columns: ["userId", "date"],
				extras: { unique: true },
				index: "FinancialAccountYieldHoliday_userId_date_key",
				schema: "public",
				table: "FinancialAccountYieldHoliday",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "FinancialAccountYieldHoliday_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "FinancialAccountYieldHoliday",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
