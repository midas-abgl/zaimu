#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import postgresStatic from "@prisma/orm-postgres/static";
import type { Contract as Start } from "../../snapshots/4e2906e6c991621a21440c189efe97eff9d14e71c4d654a43be490b6dd297f71/contract";
import startContract from "../../snapshots/4e2906e6c991621a21440c189efe97eff9d14e71c4d654a43be490b6dd297f71/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/409a4b6a8a9318466128458bc6f20fafc5000bda208028c4ef45fceafb162bdb/contract";
import endContract from "../../snapshots/409a4b6a8a9318466128458bc6f20fafc5000bda208028c4ef45fceafb162bdb/contract.json" with {
	type: "json",
};

const db = postgresStatic<End>({ contractJson: endContract });

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
				table: "Salary",
			}),
			this.addColumn({
				column: col("amount", "numeric(12,2)", {
					codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
				}),
				schema: "public",
				table: "Salary",
			}),
			this.dataTransform(endContract, "backfill-Salary-amount", {
				run: () => db.raw.sql`UPDATE "public"."Salary" SET "amount" = "netAmount"`.affectedCount(),
			}),
			this.setNotNull({ column: "amount", schema: "public", table: "Salary" }),
			this.dropColumn({ column: "grossAmount", schema: "public", table: "Salary" }),
			this.dropColumn({ column: "netAmount", schema: "public", table: "Salary" }),
			this.createIndex({
				columns: ["financialAccountId"],
				index: "Salary_financialAccountId_idx",
				schema: "public",
				table: "Salary",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "Salary_financialAccountId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "Salary",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
