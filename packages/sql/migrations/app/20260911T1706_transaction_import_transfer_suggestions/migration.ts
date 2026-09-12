#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI, primaryKey } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/7683f8dfe36d0a99ce485f3cf72ceae776b0cae53c71b5675d878db493ff5582/contract";
import startContract from "../../snapshots/7683f8dfe36d0a99ce485f3cf72ceae776b0cae53c71b5675d878db493ff5582/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/70221dab7e68b3dadba6f2c94b9d28480c606d93906f1b746543c3976f7420bc/contract";
import endContract from "../../snapshots/70221dab7e68b3dadba6f2c94b9d28480c606d93906f1b746543c3976f7420bc/contract.json" with {
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
					col("incomingExternalId", "character varying(200)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
						notNull: true,
					}),
					col("incomingFinancialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("outgoingExternalId", "character varying(200)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
						notNull: true,
					}),
					col("outgoingFinancialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
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
				constraints: [
					primaryKey(["id"], { name: "TransactionImportTransferSuggestionRejection_pkey" }),
				],
				schema: "public",
				table: "TransactionImportTransferSuggestionRejection",
			}),
			this.addColumn({
				column: col("transferCounterpartExternalId", "character varying(200)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
				}),
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.createIndex({
				columns: [
					"userId",
					"outgoingFinancialAccountId",
					"outgoingExternalId",
					"incomingFinancialAccountId",
					"incomingExternalId",
				],
				extras: { unique: true },
				index: "TransactionImportTransferSuggestionRejection_pair_key",
				schema: "public",
				table: "TransactionImportTransferSuggestionRejection",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "TransactionImportTransferSuggestionRejection_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "TransactionImportTransferSuggestionRejection",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["outgoingFinancialAccountId"],
					name: "TransactionImportTransferRejection_outgoing_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "TransactionImportTransferSuggestionRejection",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["incomingFinancialAccountId"],
					name: "TransactionImportTransferRejection_incoming_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "TransactionImportTransferSuggestionRejection",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
