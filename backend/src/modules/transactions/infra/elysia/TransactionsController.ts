import Elysia, { t } from "elysia";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

const TransactionType = t.Union([t.Literal("INCOME"), t.Literal("EXPENSE"), t.Literal("TRANSFER")]);

export const TransactionsController = new Elysia({ prefix: "/transactions" })
	.get(
		"/",
		async ({ query }) => {
			let queryBuilder = db
				.selectFrom("Transaction")
				.leftJoin("Category", "Category.id", "Transaction.categoryId")
				.select([
					"Transaction.id",
					"Transaction.amount",
					"Transaction.date",
					"Transaction.description",
					"Transaction.type",
					"Transaction.originId",
					"Transaction.destinationId",
					"Transaction.createdAt",
					"Category.name as categoryName",
					"Category.color as categoryColor",
				]);

			if (query.startDate) {
				queryBuilder = queryBuilder.where("Transaction.date", ">=", new Date(query.startDate));
			}
			if (query.endDate) {
				queryBuilder = queryBuilder.where("Transaction.date", "<=", new Date(query.endDate));
			}
			if (query.type) {
				queryBuilder = queryBuilder.where("Transaction.type", "=", query.type);
			}
			if (query.categoryId) {
				queryBuilder = queryBuilder.where("Transaction.categoryId", "=", query.categoryId);
			}
			if (query.accountId) {
				queryBuilder = queryBuilder.where(eb =>
					eb.or([
						eb("Transaction.originId", "=", query.accountId!),
						eb("Transaction.destinationId", "=", query.accountId!),
					]),
				);
			}

			const transactions = await queryBuilder
				.orderBy("Transaction.date", "desc")
				.orderBy("Transaction.createdAt", "desc")
				.limit(query.limit ?? 100)
				.offset(query.offset ?? 0)
				.execute();

			return transactions;
		},
		{
			detail: { tags: ["Transactions"] },
			query: t.Object({
				accountId: t.Optional(t.String({ format: "uuid" })),
				categoryId: t.Optional(t.String({ format: "uuid" })),
				endDate: t.Optional(t.String()),
				limit: t.Optional(t.Number({ maximum: 500, minimum: 1 })),
				offset: t.Optional(t.Number({ minimum: 0 })),
				startDate: t.Optional(t.String()),
				type: t.Optional(TransactionType),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const transaction = await db
				.selectFrom("Transaction")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!transaction) {
				throw new HttpException("Transaction not found", 404);
			}

			return transaction;
		},
		{
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params }) => {
			const history = await db
				.selectFrom("TransactionHistory")
				.where("transactionId", "=", params.id)
				.selectAll()
				.orderBy("changedAt", "desc")
				.execute();

			return history;
		},
		{
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.post(
		"/",
		async ({ body }) => {
			const transaction = await db
				.insertInto("Transaction")
				.values({
					amount: body.amount,
					categoryId: body.categoryId,
					date: new Date(body.date),
					description: body.description,
					destinationId: body.destinationId,
					originId: body.originId,
					recurrenceId: body.recurrenceId,
					type: body.type ?? "EXPENSE",
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Update account balances
			if (body.originId) {
				await db
					.updateTable("Account")
					.set(eb => ({
						balance: eb("balance", "-", body.amount),
						updatedAt: new Date(),
					}))
					.where("id", "=", body.originId)
					.execute();
			}

			if (body.destinationId) {
				await db
					.updateTable("Account")
					.set(eb => ({
						balance: eb("balance", "+", body.amount),
						updatedAt: new Date(),
					}))
					.where("id", "=", body.destinationId)
					.execute();
			}

			return transaction;
		},
		{
			body: t.Object({
				amount: t.Number(),
				categoryId: t.Optional(t.String({ format: "uuid" })),
				date: t.String(),
				description: t.Optional(t.String({ maxLength: 1000 })),
				destinationId: t.Optional(t.String({ format: "uuid" })),
				originId: t.Optional(t.String({ format: "uuid" })),
				recurrenceId: t.Optional(t.String({ format: "uuid" })),
				type: t.Optional(TransactionType),
			}),
			detail: { tags: ["Transactions"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const existing = await db
				.selectFrom("Transaction")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Transaction not found", 404);
			}

			// Record history for changed fields
			const historyEntries: Array<{
				transactionId: string;
				field: string;
				oldValue: string | null;
				newValue: string | null;
			}> = [];

			if (body.amount !== undefined && body.amount !== Number(existing.amount)) {
				historyEntries.push({
					field: "amount",
					newValue: String(body.amount),
					oldValue: String(existing.amount),
					transactionId: params.id,
				});
			}
			if (body.description !== undefined && body.description !== existing.description) {
				historyEntries.push({
					field: "description",
					newValue: body.description,
					oldValue: existing.description,
					transactionId: params.id,
				});
			}

			if (historyEntries.length > 0) {
				await db.insertInto("TransactionHistory").values(historyEntries).execute();
			}

			const transaction = await db
				.updateTable("Transaction")
				.set({
					...(body.amount !== undefined && { amount: body.amount }),
					...(body.date && { date: new Date(body.date) }),
					...(body.description !== undefined && { description: body.description }),
					...(body.type && { type: body.type }),
					...(body.categoryId !== undefined && { categoryId: body.categoryId }),
					updatedAt: new Date(),
				})
				.where("id", "=", params.id)
				.returningAll()
				.executeTakeFirstOrThrow();

			return transaction;
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number()),
				categoryId: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
				date: t.Optional(t.String()),
				description: t.Optional(t.String({ maxLength: 1000 })),
				type: t.Optional(TransactionType),
			}),
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const existing = await db
				.selectFrom("Transaction")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Transaction not found", 404);
			}

			// Reverse account balance changes
			if (existing.originId) {
				await db
					.updateTable("Account")
					.set(eb => ({
						balance: eb("balance", "+", Number(existing.amount)),
						updatedAt: new Date(),
					}))
					.where("id", "=", existing.originId)
					.execute();
			}

			if (existing.destinationId) {
				await db
					.updateTable("Account")
					.set(eb => ({
						balance: eb("balance", "-", Number(existing.amount)),
						updatedAt: new Date(),
					}))
					.where("id", "=", existing.destinationId)
					.execute();
			}

			await db.deleteFrom("Transaction").where("id", "=", params.id).execute();
			return { success: true };
		},
		{
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	);
