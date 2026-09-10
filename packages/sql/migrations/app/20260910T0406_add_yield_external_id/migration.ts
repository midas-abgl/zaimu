#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/907255d9cd9093170f0c49add7d706f100572c60cc62787bc48795d2fc886bed/contract";
import startContract from "../../snapshots/907255d9cd9093170f0c49add7d706f100572c60cc62787bc48795d2fc886bed/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/efcad1aff8cc1fbed4b19772acbb87b5f0a4cdb86ecf111cdff5e8088307b3f0/contract";
import endContract from "../../snapshots/efcad1aff8cc1fbed4b19772acbb87b5f0a4cdb86ecf111cdff5e8088307b3f0/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("externalId", "character varying(200)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
				}),
				schema: "public",
				table: "FinancialAccountYield",
			}),
			this.createIndex({
				columns: ["externalId"],
				index: "FinancialAccountYield_externalId_idx",
				schema: "public",
				table: "FinancialAccountYield",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
