#!/usr/bin/env -S node
import { col, lit, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/3e2ed43519177f885c366616f7a402f0b79ac5fca5114f05053247ef9336a11d/contract";
import endContract from "../../snapshots/3e2ed43519177f885c366616f7a402f0b79ac5fca5114f05053247ef9336a11d/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/183f80d4a01b8630868125b78d0fd0545c9b798d885baa64ea390c4c766b108d/contract";
import startContract from "../../snapshots/183f80d4a01b8630868125b78d0fd0545c9b798d885baa64ea390c4c766b108d/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("isSettled", "bool", {
					codecRef: { codecId: "pg/bool@1" },
					default: lit(false),
					notNull: true,
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("refinancingFeeAmount", "numeric(12,2)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("settledByPurchaseId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.createIndex({
				columns: ["settledByPurchaseId"],
				index: "CreditPurchase_settledByPurchaseId_idx",
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["settledByPurchaseId"],
					name: "CreditPurchase_settledByPurchaseId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditPurchase" },
				},
				schema: "public",
				table: "CreditPurchase",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
