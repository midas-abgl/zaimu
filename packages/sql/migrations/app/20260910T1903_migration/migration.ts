#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/6d76a884d165f5390366321457f61d2a0eaaaa098b841f84d2e38d273af1f7d0/contract";
import startContract from "../../snapshots/6d76a884d165f5390366321457f61d2a0eaaaa098b841f84d2e38d273af1f7d0/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/8f48af4b7391ff84c189a3ace2dd55d7810fe05a37e60a1a29cacda9b333d8a0/contract";
import endContract from "../../snapshots/8f48af4b7391ff84c189a3ace2dd55d7810fe05a37e60a1a29cacda9b333d8a0/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("creditCardStatementId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.createIndex({
				columns: ["creditCardStatementId"],
				index: "TransactionImportItem_creditCardStatementId_idx",
				schema: "public",
				table: "TransactionImportItem",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["creditCardStatementId"],
					name: "TransactionImportItem_creditCardStatementId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditCardStatement" },
				},
				schema: "public",
				table: "TransactionImportItem",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
