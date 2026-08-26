#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/4e2906e6c991621a21440c189efe97eff9d14e71c4d654a43be490b6dd297f71/contract";
import endContract from "../../snapshots/4e2906e6c991621a21440c189efe97eff9d14e71c4d654a43be490b6dd297f71/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/6ac3b92b6d368eae70728fb838176e0c7b2da4d521ca2b1853c52256368c9f81/contract";
import startContract from "../../snapshots/6ac3b92b6d368eae70728fb838176e0c7b2da4d521ca2b1853c52256368c9f81/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [this.dropNotNull({ column: "name", schema: "public", table: "FinancialAccount" })];
	}
}

MigrationCLI.run(import.meta.url, M);
