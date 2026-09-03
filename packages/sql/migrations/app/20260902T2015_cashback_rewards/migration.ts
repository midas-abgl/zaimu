#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI, primaryKey } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/183f80d4a01b8630868125b78d0fd0545c9b798d885baa64ea390c4c766b108d/contract";
import endContract from "../../snapshots/183f80d4a01b8630868125b78d0fd0545c9b798d885baa64ea390c4c766b108d/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/bdfe3bb8d0ff8bebb6da6759be133510c12e52cf816ecbfbadae540ea8398246/contract";
import startContract from "../../snapshots/bdfe3bb8d0ff8bebb6da6759be133510c12e52cf816ecbfbadae540ea8398246/contract.json" with {
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
				typeName: "CashbackYieldPeriod",
			}),
			this.addNativeEnumValue({
				schema: "public",
				typeName: "FinancialAccountType",
				value: "REWARDS",
			}),
			this.createNativeEnumType({
				members: ["POINTS", "CASHBACK"],
				schema: "public",
				typeName: "RewardsAccountKind",
			}),
			this.createTable({
				columns: [
					col("conversionAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
					}),
					col("conversionPoints", "numeric(18,4)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 18, scale: 4 } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("financialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("initialBalance", "numeric(18,4)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 18, scale: 4 } },
						notNull: true,
					}),
					col("kind", '"RewardsAccountKind"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "RewardsAccountKind" } },
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "RewardsAccount_pkey" })],
				schema: "public",
				table: "RewardsAccount",
			}),
			this.addColumn({
				column: col("cashbackAccountId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "CreditCard",
			}),
			this.addColumn({
				column: col("cashbackRate", "numeric(5,2)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 5, scale: 2 } },
				}),
				schema: "public",
				table: "CreditCard",
			}),
			this.addColumn({
				column: col("cashbackYieldPeriod", '"CashbackYieldPeriod"', {
					codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "CashbackYieldPeriod" } },
				}),
				schema: "public",
				table: "CreditCard",
			}),
			this.addColumn({
				column: col("cashbackYieldRate", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "CreditCard",
			}),
			this.addColumn({
				column: col("cashbackAccountId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("cashbackAmount", "numeric(18,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 18, scale: 4 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("cashbackYieldPeriod", '"CashbackYieldPeriod"', {
					codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "CashbackYieldPeriod" } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("cashbackYieldRate", "numeric(7,4)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 7, scale: 4 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addUnique({
				columns: ["financialAccountId"],
				constraint: "RewardsAccount_financialAccountId_key",
				schema: "public",
				table: "RewardsAccount",
			}),
			this.createIndex({
				columns: ["cashbackAccountId"],
				index: "CreditCard_cashbackAccountId_idx",
				schema: "public",
				table: "CreditCard",
			}),
			this.createIndex({
				columns: ["cashbackAccountId"],
				index: "CreditPurchase_cashbackAccountId_idx",
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["cashbackAccountId"],
					name: "CreditCard_cashbackAccountId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "CreditCard",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["cashbackAccountId"],
					name: "CreditPurchase_cashbackAccountId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "RewardsAccount_financialAccountId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "RewardsAccount",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
