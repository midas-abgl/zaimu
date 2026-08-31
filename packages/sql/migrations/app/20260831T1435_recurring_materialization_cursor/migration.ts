#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/974b6310930b15450a88ebf6219eae928cdbde858dc290424dad3b977c110e22/contract";
import endContract from "../../snapshots/974b6310930b15450a88ebf6219eae928cdbde858dc290424dad3b977c110e22/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/fe3bd00089dd9a11a76a33a630c0dd2d769aea8fb8d293eb35c601ce9c098f2a/contract";
import startContract from "../../snapshots/fe3bd00089dd9a11a76a33a630c0dd2d769aea8fb8d293eb35c601ce9c098f2a/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("materializedThrough", "date", {
					codecRef: { codecId: "pg/date@1" },
					default: fn("CURRENT_DATE - 1"),
					notNull: true,
				}),
				schema: "public",
				table: "Salary",
			}),
			this.addColumn({
				column: col("materializedThrough", "date", {
					codecRef: { codecId: "pg/date@1" },
					default: fn("CURRENT_DATE - 1"),
					notNull: true,
				}),
				schema: "public",
				table: "Subscription",
			}),
			this.addColumn({
				column: col("recurrenceOccurrenceDate", "date", { codecRef: { codecId: "pg/date@1" } }),
				schema: "public",
				table: "Transaction",
			}),
			this.createIndex({
				columns: ["recurrenceId", "recurrenceOccurrenceDate"],
				extras: { unique: true },
				index: "Transaction_recurrenceId_occurrenceDate_key",
				schema: "public",
				table: "Transaction",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
