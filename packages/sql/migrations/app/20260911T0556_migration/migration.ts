#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/0ac79b146a732b7d9a630f5ecda91211c467859725a172806b51684940c07d9b/contract";
import endContract from "../../snapshots/0ac79b146a732b7d9a630f5ecda91211c467859725a172806b51684940c07d9b/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/8f48af4b7391ff84c189a3ace2dd55d7810fe05a37e60a1a29cacda9b333d8a0/contract";
import startContract from "../../snapshots/8f48af4b7391ff84c189a3ace2dd55d7810fe05a37e60a1a29cacda9b333d8a0/contract.json" with {
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
				value: "NUBANK",
			}),
			this.addNativeEnumValue({
				schema: "public",
				typeName: "TransactionImportProvider",
				value: "GENERIC",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
