import { CreateAccount, DeleteAccount } from "@zaimu/application";
import Elysia, { t } from "elysia";
import { KyselyAccountsRepository, database } from "~/sql/kysely";

export const AccountsController = new Elysia()
	.decorate({
		accountsRepository: new KyselyAccountsRepository(database),
	})
	.group("/accounts", app => {
		const { accountsRepository } = app.decorator;

		return app
			.decorate({
				createAccount: new CreateAccount(accountsRepository),
				deleteAccount: new DeleteAccount(accountsRepository),
			})
			.post("/", ({ body, createAccount }) => createAccount.execute(body), {
				detail: {
					tags: ["Accounts"],
				},
				body: t.Object({
					company: t.String({ maxLength: 70 }),
				}),
				response: t.Object({
					company: t.String(),
					createdAt: t.Date(),
					updatedAt: t.Date(),
				}),
			})
			.delete("/", ({ body, deleteAccount }) => deleteAccount.execute(body), {
				detail: {
					tags: ["Accounts"],
				},
				body: t.Object({
					company: t.String({ maxLength: 70 }),
				}),
			});
	});
