import { CreateAccount } from "@zaimu/application";
import Elysia, { t } from "elysia";
import { database } from "~/sql/kysely";
import { KyselyAccountsRepository } from "~/sql/kysely/repositories/KyselyAccountsRepository";

export const AccountsController = new Elysia()
	.decorate({
		accountsRepository: new KyselyAccountsRepository(database),
	})
	.group("/accounts", app => {
		const { accountsRepository } = app.decorator;

		return app
			.decorate({
				createAccount: new CreateAccount(accountsRepository),
			})
			.post("/", ({ body, createAccount }) => createAccount.execute(body), {
				body: t.Object({
					company: t.String({ maxLength: 70 }),
					type: t.String({ maxLength: 30 }),
				}),
				response: t.Object({
					id: t.String(),
					company: t.String(),
					type: t.String(),
					createdAt: t.Date(),
					updatedAt: t.Date(),
				}),
			});
	});
