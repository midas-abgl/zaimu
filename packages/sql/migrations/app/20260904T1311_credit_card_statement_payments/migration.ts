#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/3e2ed43519177f885c366616f7a402f0b79ac5fca5114f05053247ef9336a11d/contract";
import startContract from "../../snapshots/3e2ed43519177f885c366616f7a402f0b79ac5fca5114f05053247ef9336a11d/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/8757fdcf3406da7455fd8acb13792736a15226a9fda736aac3ff4ce43406f30c/contract";
import endContract from "../../snapshots/8757fdcf3406da7455fd8acb13792736a15226a9fda736aac3ff4ce43406f30c/contract.json" with {
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
				table: "Transaction",
			}),
			this.createIndex({
				columns: ["creditCardStatementId"],
				index: "Transaction_creditCardStatementId_idx",
				schema: "public",
				table: "Transaction",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["creditCardStatementId"],
					name: "Transaction_creditCardStatementId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditCardStatement" },
				},
				schema: "public",
				table: "Transaction",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
