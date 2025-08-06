import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const basePath = path.join(__dirname, "..", "src", "infra", "sql");

export default defineConfig({
	migrations: {
		seed: `bun run ${path.join(basePath, "seed.ts")}`,
	},
	schema: basePath,
});
