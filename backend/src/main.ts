import { AccountsController } from "@modules/accounts/infra/http/controllers/accounts";
import { TransactionsController } from "@modules/accounts/infra/http/controllers/transactions";
import { Elysia } from "elysia";
import { HttpException } from "shared/errors";

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
