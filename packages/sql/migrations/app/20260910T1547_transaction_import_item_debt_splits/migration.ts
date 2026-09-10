#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/6d76a884d165f5390366321457f61d2a0eaaaa098b841f84d2e38d273af1f7d0/contract";
import endContract from "../../snapshots/6d76a884d165f5390366321457f61d2a0eaaaa098b841f84d2e38d273af1f7d0/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/efcad1aff8cc1fbed4b19772acbb87b5f0a4cdb86ecf111cdff5e8088307b3f0/contract";
import startContract from "../../snapshots/efcad1aff8cc1fbed4b19772acbb87b5f0a4cdb86ecf111cdff5e8088307b3f0/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("transactionImportItemId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "DebtSplit",
			}),
			this.addUnique({
				columns: ["transactionImportItemId"],
				constraint: "DebtSplit_transactionImportItemId_key",
				schema: "public",
				table: "DebtSplit",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["transactionImportItemId"],
					name: "DebtSplit_transactionImportItemId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "TransactionImportItem" },
				},
				schema: "public",
				table: "DebtSplit",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
