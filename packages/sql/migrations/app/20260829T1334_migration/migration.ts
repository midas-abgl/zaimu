#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/42e18ee45bf28412987854d7edb6f92ca0d5b893cfaf877afa7fd658388e7f33/contract";
import startContract from "../../snapshots/42e18ee45bf28412987854d7edb6f92ca0d5b893cfaf877afa7fd658388e7f33/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/4651d8df8cda1b79cf7010e72347fcb38b471f04b19d0a98a5a9c6932526b64e/contract";
import endContract from "../../snapshots/4651d8df8cda1b79cf7010e72347fcb38b471f04b19d0a98a5a9c6932526b64e/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("subscriptionId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("subscriptionOccurrenceDate", "date", { codecRef: { codecId: "pg/date@1" } }),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.createIndex({
				columns: ["subscriptionId", "subscriptionOccurrenceDate"],
				extras: { unique: true },
				index: "CreditPurchase_subscriptionId_occurrenceDate_key",
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["subscriptionId"],
					name: "CreditPurchase_subscriptionId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Subscription" },
				},
				schema: "public",
				table: "CreditPurchase",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
