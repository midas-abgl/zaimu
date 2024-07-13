import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "./types";
export * from "./repositories";

const dialect = new PostgresDialect({
	pool: new Pool({
		connectionString: process.env.DATABASE_URL,
		max: 25,
	}),
});

export const database = new Kysely<DB>({
	dialect,
});
