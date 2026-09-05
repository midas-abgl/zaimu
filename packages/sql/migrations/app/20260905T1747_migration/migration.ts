#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/68e56aa6e6b295b95651f49b19f546ff589aa3dc3db2942b313bbecee9c4b118/contract";
import startContract from "../../snapshots/68e56aa6e6b295b95651f49b19f546ff589aa3dc3db2942b313bbecee9c4b118/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/e28c0e217297c4f6a98a7572a06a59489a9e0ef22021ecd296c83f6e945e68d4/contract";
import endContract from "../../snapshots/e28c0e217297c4f6a98a7572a06a59489a9e0ef22021ecd296c83f6e945e68d4/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.dropNotNull({ column: "date", schema: "public", table: "Debt" }),
			this.dropNotNull({ column: "date", schema: "public", table: "DebtEvent" }),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
