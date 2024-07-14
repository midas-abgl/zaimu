import { watch } from "node:fs";
import { app } from "./http/elysia/server";
export * from "./sql/kysely/entities";

function startServer() {
	console.clear();

	app.listen(process.env.PORT || 3333);

	console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}

startServer();

if (process.env.NODE_ENV === "development") {
	watch("../", { recursive: true }, startServer);
}
