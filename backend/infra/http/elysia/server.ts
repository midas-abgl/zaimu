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
	.use(AccountsController)
	.use(TransactionsController)
	.listen(process.env.PORT || 3333);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
