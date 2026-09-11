#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/0ac79b146a732b7d9a630f5ecda91211c467859725a172806b51684940c07d9b/contract";
import startContract from "../../snapshots/0ac79b146a732b7d9a630f5ecda91211c467859725a172806b51684940c07d9b/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/f4d372bea28ba11bf40f9a9da457a092b30eb84a8dcb96a95c1adf42d5bdbe8d/contract";
import endContract from "../../snapshots/f4d372bea28ba11bf40f9a9da457a092b30eb84a8dcb96a95c1adf42d5bdbe8d/contract.json" with {
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
				value: "BANCO_DO_BRASIL",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
