#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/7683f8dfe36d0a99ce485f3cf72ceae776b0cae53c71b5675d878db493ff5582/contract";
import endContract from "../../snapshots/7683f8dfe36d0a99ce485f3cf72ceae776b0cae53c71b5675d878db493ff5582/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/b2275258b2be173db3f172e886b920e881bbaff613045d0edec4539c6bcacd1d/contract";
import startContract from "../../snapshots/b2275258b2be173db3f172e886b920e881bbaff613045d0edec4539c6bcacd1d/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("reconciledImportItemId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.addColumn({
				column: col("reconciledTransactionId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.createIndex({
				columns: ["reconciledImportItemId"],
				index: "TransactionImportItem_reconciledImportItemId_idx",
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.createIndex({
				columns: ["reconciledTransactionId"],
				index: "TransactionImportItem_reconciledTransactionId_idx",
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["reconciledImportItemId"],
					name: "TransactionImportItem_reconciledImportItemId_fkey",
					onDelete: "restrict",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "TransactionImportItem" },
				},
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["reconciledTransactionId"],
					name: "TransactionImportItem_reconciledTransactionId_fkey",
					onDelete: "restrict",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Transaction" },
				},
				schema: "public",
				table: "TransactionImportItem",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
