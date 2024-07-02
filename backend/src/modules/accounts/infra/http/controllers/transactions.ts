import { database } from "@database";
import { AddTransaction } from "@modules/accounts/services/AddTransaction.service";
import { uuidRegex } from "@shared/utils";
import Elysia, { t } from "elysia";
import { KyselyAccountsRepository } from "../../kysely/repositories/KyselyAccountsRepository";

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
					destinationId: t.String({ pattern: uuidRegex.source }),
					originId: t.String({ pattern: uuidRegex.source }),
				}),
				response: t.Object({
					id: t.String(),
					amount: t.Number(),
					date: t.Date(),
					description: t.Nullable(t.String()),
					destinationId: t.String(),
					originId: t.String(),
					createdAt: t.Date(),
					updatedAt: t.Date(),
				}),
			});
	});
