import { AddTransaction, DeleteTransaction, ListTransactionCategories } from "@zaimu/application";
import Elysia, { t } from "elysia";
import { KyselyAccountsRepository, KyselyTransactionsRepository, database } from "~/sql/kysely";

export const TransactionsController = new Elysia()
	.decorate({
		accountsRepository: new KyselyAccountsRepository(database),
		transactionsRepository: new KyselyTransactionsRepository(database),
	})
	.group("/transactions", app => {
		const { accountsRepository, transactionsRepository } = app.decorator;

		return app
			.decorate({
				addTransaction: new AddTransaction(accountsRepository, transactionsRepository),
				deleteTransaction: new DeleteTransaction(transactionsRepository),
			})
			.post("/", ({ body, addTransaction }) => addTransaction.execute(body), {
				detail: {
					tags: ["Transactions"],
				},
				body: t.Object({
					amount: t.Number({ minimum: 0 }),
					categories: t.Array(t.String({ maxLength: 50 })),
					date: t.Date(),
					description: t.Optional(t.String({ maxLength: 1000 })),
					destinationId: t.Optional(t.String({ format: "uuid" })),
					originId: t.Optional(t.String({ format: "uuid" })),
					recurrence: t.Optional(t.String({ maxLength: 26 })),
					repeatCount: t.Optional(t.Number({ min: 2 })),
				}),
				response: t.Object({
					id: t.String(),
					amount: t.Number(),
					date: t.Date(),
					description: t.Nullable(t.String()),
					categories: t.Array(t.String()),
					recurrence: t.Nullable(t.String()),
					repeatCount: t.Nullable(t.Number()),
					destinationId: t.Nullable(t.String()),
					originId: t.Nullable(t.String()),
					createdAt: t.Date(),
					updatedAt: t.Date(),
				}),
			})
			.delete("/", ({ query, deleteTransaction }) => deleteTransaction.execute(query), {
				detail: {
					tags: ["Transactions"],
				},
				query: t.Object({
					transactionId: t.String({ format: "uuid" }),
				}),
				response: t.Void(),
			})
			.group("/categories", app => {
				return app
					.decorate({
						listTransactionCategories: new ListTransactionCategories(transactionsRepository),
					})
					.get("/", ({ listTransactionCategories }) => listTransactionCategories.execute(), {
						detail: {
							tags: ["Transactions"],
						},
						response: t.Array(t.String()),
					});
			});
	});
