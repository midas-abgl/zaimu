#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import type { Contract as Start } from "../../snapshots/67e1778da9aece121e29e24f707246e8a1b4fdd5192954546a8fa5a2c2482dce/contract";
import startContract from "../../snapshots/67e1778da9aece121e29e24f707246e8a1b4fdd5192954546a8fa5a2c2482dce/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/703de2aa70e4011fac0264716923df2c348fb7c701d2c411b599d9a71ab1302c/contract";
import endContract from "../../snapshots/703de2aa70e4011fac0264716923df2c348fb7c701d2c411b599d9a71ab1302c/contract.json" with {
	type: "json",
};

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("financialAccountId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "RecurringPayment",
			}),
			this.addColumn({
				column: col("financialAccountId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "Subscription",
			}),
			this.createIndex({
				columns: ["financialAccountId"],
				index: "RecurringPayment_financialAccountId_idx",
				schema: "public",
				table: "RecurringPayment",
			}),
			this.createIndex({
				columns: ["financialAccountId"],
				index: "Subscription_financialAccountId_idx",
				schema: "public",
				table: "Subscription",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "RecurringPayment_financialAccountId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "RecurringPayment",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "Subscription_financialAccountId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "Subscription",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
