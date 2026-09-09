#!/usr/bin/env -S node
import { col, fn, lit, Migration, MigrationCLI, primaryKey } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/0a9bff0be61eec811abe94d68bceebcc4d3879bb7ace6c6f503343230396cfa0/contract";
import endContract from "../../snapshots/0a9bff0be61eec811abe94d68bceebcc4d3879bb7ace6c6f503343230396cfa0/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/846ad3bf0f9bb8b61e0353f7d95972ad19fdbf4ac71ca41235cc249876dfa77b/contract";
import startContract from "../../snapshots/846ad3bf0f9bb8b61e0353f7d95972ad19fdbf4ac71ca41235cc249876dfa77b/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.createNativeEnumType({
				members: ["MERCADO_PAGO"],
				schema: "public",
				typeName: "TransactionImportProvider",
			}),
			this.createNativeEnumType({
				members: ["PENDING", "APPROVED"],
				schema: "public",
				typeName: "TransactionImportStatus",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("fileName", "character varying(255)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 255 } },
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
					col("periodEnd", "date", { codecRef: { codecId: "pg/date@1" } }),
					col("periodStart", "date", { codecRef: { codecId: "pg/date@1" } }),
					col("provider", '"TransactionImportProvider"', {
						codecRef: {
							codecId: "pg/enum@1",
							typeParams: { typeName: "TransactionImportProvider" },
						},
						notNull: true,
					}),
					col("status", '"TransactionImportStatus"', {
						codecRef: {
							codecId: "pg/enum@1",
							typeParams: { typeName: "TransactionImportStatus" },
						},
						default: lit("PENDING"),
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
				constraints: [primaryKey(["id"], { name: "TransactionImport_pkey" })],
				schema: "public",
				table: "TransactionImport",
			}),
			this.createTable({
				columns: [
					col("amount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("balanceAfter", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
					}),
					col("categoryId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("date", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("description", "character varying(1000)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 1000 } },
					}),
					col("destinationFinancialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("externalId", "character varying(200)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("isHidden", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
						notNull: true,
					}),
					col("isSelected", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(true),
						notNull: true,
					}),
					col("originFinancialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("storeName", "character varying(200)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
					}),
					col("time", "time(3)", {
						codecRef: { codecId: "pg/time@1", typeParams: { precision: 3 } },
					}),
					col("transactionImportId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("type", '"TransactionType"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "TransactionType" } },
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "TransactionImportItem_pkey" })],
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.addColumn({
				column: col("externalId", "character varying(200)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
				}),
				schema: "public",
				table: "Transaction",
			}),
			this.createIndex({
				columns: ["externalId"],
				index: "Transaction_externalId_idx",
				schema: "public",
				table: "Transaction",
			}),
			this.createIndex({
				columns: ["financialAccountId"],
				index: "TransactionImport_financialAccountId_idx",
				schema: "public",
				table: "TransactionImport",
			}),
			this.createIndex({
				columns: ["userId", "status", "createdAt"],
				index: "TransactionImport_userId_status_createdAt_idx",
				schema: "public",
				table: "TransactionImport",
			}),
			this.createIndex({
				columns: ["destinationFinancialAccountId"],
				index: "TransactionImportItem_destinationId_idx",
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.createIndex({
				columns: ["externalId"],
				index: "TransactionImportItem_externalId_idx",
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.createIndex({
				columns: ["transactionImportId", "date"],
				index: "TransactionImportItem_importId_date_idx",
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.createIndex({
				columns: ["originFinancialAccountId"],
				index: "TransactionImportItem_originId_idx",
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "TransactionImport_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "TransactionImport",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "TransactionImport_financialAccountId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "TransactionImport",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["transactionImportId"],
					name: "TransactionImportItem_importId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "TransactionImport" },
				},
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["categoryId"],
					name: "TransactionImportItem_categoryId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Category" },
				},
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["originFinancialAccountId"],
					name: "TransactionImportItem_originId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["destinationFinancialAccountId"],
					name: "TransactionImportItem_destinationId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "TransactionImportItem",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
