#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/aa53cc0f4fc05e1a69da4cb94795f6483af843e9bc64bdbd635ce1bb73201671/contract";
import startContract from "../../snapshots/aa53cc0f4fc05e1a69da4cb94795f6483af843e9bc64bdbd635ce1bb73201671/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/e6f31bcc3867cfd3f2174cfb567a96882bc284c0b73c272493e818624cc49fb2/contract";
import endContract from "../../snapshots/e6f31bcc3867cfd3f2174cfb567a96882bc284c0b73c272493e818624cc49fb2/contract.json" with {
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
				table: "RecurringPayment",
			}),
			this.addColumn({
				column: col("storeName", "character varying(200)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 200 } },
				}),
				schema: "public",
				table: "Subscription",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
