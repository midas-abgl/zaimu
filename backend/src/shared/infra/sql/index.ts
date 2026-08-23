import { Kysely, PostgresDialect } from "kysely";
import { Pool, types } from "pg";

// Parse numeric types as numbers
types.setTypeParser(types.builtins.NUMERIC, val => Number(val));

export const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

import type { DB } from "../../../../db/types";

export const db = new Kysely<DB>({
	dialect: new PostgresDialect({ pool }),
});

export type { DB };
