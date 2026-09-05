#!/usr/bin/env -S node
import { col, lit, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/68e56aa6e6b295b95651f49b19f546ff589aa3dc3db2942b313bbecee9c4b118/contract";
import endContract from "../../snapshots/68e56aa6e6b295b95651f49b19f546ff589aa3dc3db2942b313bbecee9c4b118/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/8757fdcf3406da7455fd8acb13792736a15226a9fda736aac3ff4ce43406f30c/contract";
import startContract from "../../snapshots/8757fdcf3406da7455fd8acb13792736a15226a9fda736aac3ff4ce43406f30c/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("isHidden", "bool", {
					codecRef: { codecId: "pg/bool@1" },
					default: lit(false),
					notNull: true,
				}),
				schema: "public",
				table: "Transaction",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
