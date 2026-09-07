#!/usr/bin/env -S node
import { col, lit, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/18f3ea0e54ad7a8be8506e558a9ac920744e265afdf3f30dc5beab80f7ac25fa/contract";
import endContract from "../../snapshots/18f3ea0e54ad7a8be8506e558a9ac920744e265afdf3f30dc5beab80f7ac25fa/contract.json" with {
	type: "json",
};
import type { Contract as Start } from "../../snapshots/c7b6a0a86fa0ea1d315d0af29a41976ad2e628101acc6dc7ddc923968787f52c/contract";
import startContract from "../../snapshots/c7b6a0a86fa0ea1d315d0af29a41976ad2e628101acc6dc7ddc923968787f52c/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("feeAmount", "numeric(12,2)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("feeDescription", "character varying(100)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("isRefund", "bool", {
					codecRef: { codecId: "pg/bool@1" },
					default: lit(false),
					notNull: true,
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addColumn({
				column: col("refundOfPurchaseId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "CreditPurchase",
			}),
			this.createIndex({
				columns: ["refundOfPurchaseId"],
				index: "CreditPurchase_refundOfPurchaseId_idx",
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["refundOfPurchaseId"],
					name: "CreditPurchase_refundOfPurchaseId_fkey",
					onDelete: "cascade",
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
