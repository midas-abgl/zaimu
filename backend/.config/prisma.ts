import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const basePath = path.join(__dirname, "..", "prisma");

export default defineConfig({
	schema: basePath,
});
