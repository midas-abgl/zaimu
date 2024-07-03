import { AddTransaction } from "@zaimu/application";
import Elysia, { t } from "elysia";
import { database } from "~/sql/kysely";
import { KyselyAccountsRepository } from "~/sql/kysely/repositories/KyselyAccountsRepository";
import { uuidRegex } from "~/utils";

export const TransactionsController = new Elysia()
	.decorate({
		accountsRepository: new KyselyAccountsRepository(database),
	})
	.group("/transactions", app => {
		const { accountsRepository } = app.decorator;

		return app
			.decorate({
				addTransaction: new AddTransaction(accountsRepository),
			})
			.post("/", ({ body, addTransaction }) => addTransaction.execute(body), {
				body: t.Object({
					amount: t.Number({ minimum: 0 }),
					date: t.Date(),
					description: t.Optional(t.String({ maxLength: 1000 })),
					categories: t.Optional(t.Array(t.String({ maxLength: 50 }))),
					destinationId: t.Optional(t.String({ pattern: uuidRegex.source })),
					originId: t.Optional(t.String({ pattern: uuidRegex.source })),
				}),
				response: t.Object({
					id: t.String(),
					amount: t.Number(),
					date: t.Date(),
					description: t.Nullable(t.String()),
					categories: t.Array(t.String()),
					destinationId: t.Nullable(t.String()),
					originId: t.Nullable(t.String()),
					createdAt: t.Date(),
					updatedAt: t.Date(),
				}),
			});
	});
