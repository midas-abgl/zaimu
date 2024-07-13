import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { HttpException } from "@zaimu/domain";
import { Elysia } from "elysia";
import { AccountsController, TransactionsController } from "./controllers";

const app = new Elysia()
	.error({ HttpException })
	.onError(({ code, error, set }) => {
		switch (code) {
			case "HttpException":
				set.status = error.statusCode;
				return error.message;
		}
	})
	.use(cors())
	.use(
		swagger({
			documentation: {
				info: {
					title: "Zaimu API",
					description: "",
					version: "1.0.0",
					contact: {
						email: "zaimu@midas-abgl.com",
						name: "Midas Group",
						url: "https://midas-abgl.com",
					},
				},
				tags: [
					{
						name: "Accounts",
						description: "Anything sends/receives transactions.",
					},
					{
						name: "Transactions",
						description: "Money transfers between different accounts.",
					},
				],
			},
			path: "/docs",
			exclude: ["/docs", "/docs/json"],
		}),
	)
	.use(AccountsController)
	.use(TransactionsController)
	.listen(process.env.PORT || 3333);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
