import path from "node:path";
import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
	datasource: {
		url: process.env.DATABASE_URL!,
	},
	migrations: {
		path: "./src/migrations",
		seed: `bun ${path.resolve(__dirname, "./src/seed/index.ts")}`,
	},
	schema: "./src",
});
