import "dotenv/config";
import path from "node:path";
import { prisma } from ".";

async function main() {
	const functionsSql = await Bun.file(path.resolve(__dirname, "./functions.sql")).text();
	await prisma.$executeRawUnsafe(functionsSql);
}

try {
	await main();

	await prisma.$disconnect();
} catch (e) {
	console.error(e);
	await prisma.$disconnect();
	process.exit(1);
}
