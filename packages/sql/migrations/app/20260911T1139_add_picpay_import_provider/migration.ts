#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/aeab111d4f5988b7f3ec25d14e9fdcf6ca9c4acc3b850badce399ac242d548d4/contract";
import startContract from "../../snapshots/aeab111d4f5988b7f3ec25d14e9fdcf6ca9c4acc3b850badce399ac242d548d4/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/b2275258b2be173db3f172e886b920e881bbaff613045d0edec4539c6bcacd1d/contract";
import endContract from "../../snapshots/b2275258b2be173db3f172e886b920e881bbaff613045d0edec4539c6bcacd1d/contract.json" with {
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
				value: "PICPAY",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
