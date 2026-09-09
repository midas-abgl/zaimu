#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import postgresStatic from "@prisma/orm-postgres/static";
import type { Contract as Start } from "../../snapshots/0a9bff0be61eec811abe94d68bceebcc4d3879bb7ace6c6f503343230396cfa0/contract";
import startContract from "../../snapshots/0a9bff0be61eec811abe94d68bceebcc4d3879bb7ace6c6f503343230396cfa0/contract.json" with {
	type: "json",
};
import type { Contract as End } from "../../snapshots/8e959af4bc94c8641f3f300f99b6e1441900991972e1e98b62ab5e528f279928/contract";
import endContract from "../../snapshots/8e959af4bc94c8641f3f300f99b6e1441900991972e1e98b62ab5e528f279928/contract.json" with {
	type: "json",
};

const db = postgresStatic<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
	override readonly startContractJson = startContract;
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.createNativeEnumType({
				members: ["INCOME", "EXPENSE", "TRANSFER", "YIELD"],
				schema: "public",
				typeName: "TransactionImportItemType",
			}),
			this.dataTransform(endContract, "typechange-TransactionImportItem-type", {
				run: () =>
					db.raw.sql`
            ALTER TABLE "public"."TransactionImportItem"
            ALTER COLUMN "type" TYPE "TransactionImportItemType"
            USING "type"::text::"TransactionImportItemType"
          `.affectedCount(),
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
