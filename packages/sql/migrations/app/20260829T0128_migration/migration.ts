#!/usr/bin/env -S node
import { col, lit, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/1f5cc97966ad3d35c1d007e081c16f6e8851734e2c59e8e1b9bfdbd9574b65b3/contract";
import endContract from "../../snapshots/1f5cc97966ad3d35c1d007e081c16f6e8851734e2c59e8e1b9bfdbd9574b65b3/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/409a4b6a8a9318466128458bc6f20fafc5000bda208028c4ef45fceafb162bdb/contract";
import startContract from "../../snapshots/409a4b6a8a9318466128458bc6f20fafc5000bda208028c4ef45fceafb162bdb/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("excludeFromTotals", "bool", {
					codecRef: { codecId: "pg/bool@1" },
					default: lit(false),
					notNull: true,
				}),
				schema: "public",
				table: "CreditCard",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
