#!/usr/bin/env -S node
import { col, lit, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/8e959af4bc94c8641f3f300f99b6e1441900991972e1e98b62ab5e528f279928/contract";
import startContract from "../../snapshots/8e959af4bc94c8641f3f300f99b6e1441900991972e1e98b62ab5e528f279928/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/907255d9cd9093170f0c49add7d706f100572c60cc62787bc48795d2fc886bed/contract";
import endContract from "../../snapshots/907255d9cd9093170f0c49add7d706f100572c60cc62787bc48795d2fc886bed/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("isReconciled", "bool", {
					codecRef: { codecId: "pg/bool@1" },
					default: lit(false),
					notNull: true,
				}),
				schema: "public",
				table: "TransactionImportItem",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
