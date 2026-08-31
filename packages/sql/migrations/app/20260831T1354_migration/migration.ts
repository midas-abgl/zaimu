#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/e6f31bcc3867cfd3f2174cfb567a96882bc284c0b73c272493e818624cc49fb2/contract";
import startContract from "../../snapshots/e6f31bcc3867cfd3f2174cfb567a96882bc284c0b73c272493e818624cc49fb2/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/fe3bd00089dd9a11a76a33a630c0dd2d769aea8fb8d293eb35c601ce9c098f2a/contract";
import endContract from "../../snapshots/fe3bd00089dd9a11a76a33a630c0dd2d769aea8fb8d293eb35c601ce9c098f2a/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("time", "time(3)", {
					codecRef: { codecId: "pg/time@1", typeParams: { precision: 3 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("time", "time(3)", {
					codecRef: { codecId: "pg/time@1", typeParams: { precision: 3 } },
				}),
				schema: "public",
				table: "Transaction",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
