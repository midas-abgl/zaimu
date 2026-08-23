import "dotenv/config";
import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as definePostgresConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
	orm: definePostgresConfig({
		contract: "./src/prisma/contract.prisma",
		db: {
			connection: process.env.DATABASE_URL!,
		},
	}),
});
