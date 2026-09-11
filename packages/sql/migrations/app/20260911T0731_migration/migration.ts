#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/0091806f888d6a8256f2c2441bdda1873bf8a84604145b15caae554e234cd3be/contract";
import startContract from "../../snapshots/0091806f888d6a8256f2c2441bdda1873bf8a84604145b15caae554e234cd3be/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/aeab111d4f5988b7f3ec25d14e9fdcf6ca9c4acc3b850badce399ac242d548d4/contract";
import endContract from "../../snapshots/aeab111d4f5988b7f3ec25d14e9fdcf6ca9c4acc3b850badce399ac242d548d4/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addNativeEnumValue({
				schema: "public",
				typeName: "TransactionImportProvider",
				value: "INTER",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
