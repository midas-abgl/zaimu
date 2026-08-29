#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/6c342289482fdae92553f3e210981e93d761174a0a9b16ca83866120d3b394ab/contract";
import endContract from "../../snapshots/6c342289482fdae92553f3e210981e93d761174a0a9b16ca83866120d3b394ab/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/4651d8df8cda1b79cf7010e72347fcb38b471f04b19d0a98a5a9c6932526b64e/contract";
import startContract from "../../snapshots/4651d8df8cda1b79cf7010e72347fcb38b471f04b19d0a98a5a9c6932526b64e/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("storeName", "character varying(200)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("storeName", "character varying(200)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
				}),
				schema: "public",
				table: "Transaction",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
