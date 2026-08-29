#!/usr/bin/env -S node
import { col, fn, Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import postgresStatic from "@prisma/orm-postgres/static";
import type { Contract as Start } from "../../snapshots/1f5cc97966ad3d35c1d007e081c16f6e8851734e2c59e8e1b9bfdbd9574b65b3/contract";
import startContract from "../../snapshots/1f5cc97966ad3d35c1d007e081c16f6e8851734e2c59e8e1b9bfdbd9574b65b3/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/67e1778da9aece121e29e24f707246e8a1b4fdd5192954546a8fa5a2c2482dce/contract";
import endContract from "../../snapshots/67e1778da9aece121e29e24f707246e8a1b4fdd5192954546a8fa5a2c2482dce/contract.json" with {
	type: "json",
};

const db = postgresStatic<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.addColumn({
				column: col("autoGenerateFrom", "date", {
					codecRef: { codecId: "pg/date@1" },
					default: fn("CURRENT_DATE"),
					notNull: true,
				}),
				schema: "public",
				table: "Salary",
			}),
			this.addColumn({
				column: col("salaryId", "character varying(36)", {
					codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
				}),
				schema: "public",
				table: "Transaction",
			}),
			this.addColumn({
				column: col("salaryOccurrenceDate", "date", { codecRef: { codecId: "pg/date@1" } }),
				schema: "public",
				table: "Transaction",
			}),
			this.dataTransform(endContract, "migrate-SalaryPayment-to-Transaction", {
				run: () =>
					db.raw.sql`
          INSERT INTO "public"."Transaction" (
            "amount",
            "date",
            "description",
            "destinationFinancialAccountId",
            "salaryId",
            "salaryOccurrenceDate",
            "type"
          )
          SELECT
            "SalaryPayment"."amount",
            "SalaryPayment"."date",
            "Salary"."source",
            "SalaryPayment"."financialAccountId",
            "SalaryPayment"."salaryId",
            "SalaryPayment"."date",
            'INCOME'::"public"."TransactionType"
          FROM "public"."SalaryPayment"
          INNER JOIN "public"."Salary" ON "Salary"."id" = "SalaryPayment"."salaryId"
        `.affectedCount(),
			}),
			this.createIndex({
				columns: ["salaryId", "salaryOccurrenceDate"],
				extras: { unique: true },
				index: "Transaction_salaryId_occurrenceDate_key",
				schema: "public",
				table: "Transaction",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["salaryId"],
					name: "Transaction_salaryId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Salary" },
				},
				schema: "public",
				table: "Transaction",
			}),
			this.dropTable({ schema: "public", table: "SalaryPayment" }),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
