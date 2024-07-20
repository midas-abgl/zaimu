import { CreateAccount, DeleteAccount, EditAccount, ListAccounts } from "@zaimu/application";
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
				editAccount: new EditAccount(accountsRepository),
				listAccounts: new ListAccounts(accountsRepository),
			})
			.get("/", ({ listAccounts }) => listAccounts.execute(), {
				detail: {
					tags: ["Accounts"],
				},
				response: t.Array(
					t.Object({
						id: t.String(),
						company: t.String(),
						userEmail: t.String(),
						createdAt: t.Date(),
						updatedAt: t.Date(),
					}),
				),
			})
			.post("/", ({ body, createAccount }) => createAccount.execute(body), {
				detail: {
					tags: ["Accounts"],
				},
				body: t.Object({
					company: t.String({ maxLength: 70 }),
					income: t.Object({
						amount: t.Number({ minimum: 0 }),
						frequency: t.String({ maxLength: 7 }),
					}),
					userEmail: t.String({ format: "email" }),
				}),
				response: t.Object({
					id: t.String(),
					company: t.String(),
					income: t.Nullable(
						t.Object({
							amount: t.Number(),
							frequency: t.String(),
						}),
					),
					userEmail: t.String(),
					createdAt: t.Date(),
					updatedAt: t.Date(),
				}),
			})
			.patch(
				"/:id",
				({ body, editAccount, params: { id: accountId } }) => editAccount.execute({ accountId, ...body }),
				{
					detail: {
						tags: ["Accounts"],
					},
					body: t.Object({
						company: t.Optional(t.String({ maxLength: 70 })),
					}),
					response: t.Object({
						id: t.String(),
						company: t.String(),
						userEmail: t.String(),
						createdAt: t.Date(),
						updatedAt: t.Date(),
					}),
				},
			)
			.delete("/", ({ deleteAccount, query }) => deleteAccount.execute(query), {
				detail: {
					tags: ["Accounts"],
				},
				query: t.Object({
					accountId: t.String({ format: "uuid" }),
				}),
			});
	});
