import "dotenv/config";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import type { SqlOrmPlan } from "@prisma/orm-postgres/relational-core";
import { param } from "@prisma/orm-postgres/relational-core/expression";
import postgres from "@prisma/orm-postgres/runtime";

export { and, or } from "@prisma/orm-postgres/orm-client";

import type { Numeric, Timestamp, Timestamptz } from "@prisma/orm-postgres/target/codec-types";
import { Pool, types } from "pg";
import type { Contract } from "./prisma/contract";
import contractJson from "./prisma/contract.json" with { type: "json" };

type NormalizeDatabaseValue<T> =
	T extends Numeric<infer _Precision, infer _Scale>
		? number
		: T extends Timestamp<infer _Precision> | Timestamptz<infer _Precision>
			? Date
			: T extends Date
				? Date
				: T extends string
					? string
					: T extends readonly (infer Item)[]
						? NormalizeDatabaseValue<Item>[]
						: T extends object
							? { [Key in keyof T]: NormalizeDatabaseValue<T[Key]> }
							: T;

types.setTypeParser(types.builtins.NUMERIC, value => Number(value));

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	idleTimeoutMillis: Number(process.env.PRISMA_POOL_IDLE_TIMEOUT_MS ?? 30_000),
	max: Number(process.env.PRISMA_POOL_MAX ?? 20),
	min: Number(process.env.PRISMA_POOL_MIN ?? 0),
});

export const db = postgres<Contract>({ contractJson, pg: pool });

type QueryPlan = SqlOrmPlan<unknown>;
type StatementPlan = Parameters<ReturnType<typeof db.runtime>["execute"]>[0];
interface ProjectedPlan {
	ast?: {
		projection?: readonly {
			alias?: string;
			codec?: { codecId?: string };
		}[];
		returning?: readonly {
			alias?: string;
			codec?: { codecId?: string };
		}[];
	};
}

const normalizeNumericColumns = <Row>(plan: QueryPlan, rows: Row[]) => {
	const numericColumns = new Set(
		((plan as ProjectedPlan).ast?.projection ?? (plan as ProjectedPlan).ast?.returning ?? [])
			.filter(item => item.codec?.codecId === "pg/numeric@1")
			.flatMap(item => (item.alias ? [item.alias] : [])),
	);
	if (numericColumns.size === 0) return rows;
	return rows.map(row => {
		if (!row || typeof row !== "object") return row;
		const normalized = { ...row } as Record<string, unknown>;
		for (const column of numericColumns) {
			const value = normalized[column];
			if (typeof value === "string") normalized[column] = Number(value);
		}
		return normalized as Row;
	});
};

export const queryRows = async <Plan extends QueryPlan>(plan: Plan) => {
	const rows = await db.runtime().query<ResultType<Plan>>(plan as unknown as SqlOrmPlan<ResultType<Plan>>);
	return normalizeNumericColumns(plan, rows) as NormalizeDatabaseValue<ResultType<Plan>>[];
};

export const queryFirst = async <Plan extends QueryPlan>(plan: Plan) => (await queryRows(plan))[0];

export const executeStatement = (plan: StatementPlan) => db.runtime().execute(plan);

export const numeric = <Precision extends number, Scale extends number | undefined>(value: number | string) =>
	String(value) as Numeric<Precision, Scale>;

export const closeDatabase = async () => {
	await db.close();
	await pool.end();
};

export type { Contract } from "./prisma/contract";
export { param };
