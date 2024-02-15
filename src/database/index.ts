import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { DB as Database } from "./types";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

const dialect = new PostgresDialect({
	pool,
});

export const db = new Kysely<Database>({
	dialect,
});
