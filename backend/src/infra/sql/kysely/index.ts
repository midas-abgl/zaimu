import { Kysely, PostgresDialect } from "kysely";
import { Pool, types } from "pg";
import { pgOptions } from "..";
import type { DB } from "./types";

export * from "./repositories";

types.setTypeParser(types.builtins.NUMERIC, val => Number(val));

const dialect = new PostgresDialect({
	pool: new Pool(pgOptions),
});

export const database = new Kysely<DB>({
	dialect,
});
