import { PrismaClient } from "@generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";

export const pgOptions: PoolConfig = {
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
	max: 25,
};

const adapter = new PrismaPg(pgOptions);
export const prisma = new PrismaClient({
	adapter,
});
