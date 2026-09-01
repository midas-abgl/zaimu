#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/974b6310930b15450a88ebf6219eae928cdbde858dc290424dad3b977c110e22/contract";
import startContract from "../../snapshots/974b6310930b15450a88ebf6219eae928cdbde858dc290424dad3b977c110e22/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/f3e48e63cfeb48a9fb6e78bd58ba2dc77364ecd193dbaaace3721b0555997ec1/contract";
import endContract from "../../snapshots/f3e48e63cfeb48a9fb6e78bd58ba2dc77364ecd193dbaaace3721b0555997ec1/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.setDefault({
				column: "materializedThrough",
				defaultSql: "DEFAULT ((CURRENT_DATE - 1))",
				operationClass: "widening",
				schema: "public",
				table: "Salary",
			}),
			this.setDefault({
				column: "materializedThrough",
				defaultSql: "DEFAULT ((CURRENT_DATE - 1))",
				operationClass: "widening",
				schema: "public",
				table: "Subscription",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
