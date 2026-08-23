import Elysia, { t } from "elysia";
import { assertDirectOwnership, assertTransactionOwnership, requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

const TransactionType = t.Union([t.Literal("INCOME"), t.Literal("EXPENSE"), t.Literal("TRANSFER")]);

export const TransactionsController = new Elysia({ prefix: "/transactions" })
	.get(
		"/",
		async ({ query, request }) => {
			const userId = await requireUserId(request);
			if (query.financialAccountId) {
				await assertDirectOwnership("FinancialAccount", query.financialAccountId, userId);
			}
			let queryBuilder = db
				.selectFrom("Transaction")
				.leftJoin("Category", "Category.id", "Transaction.categoryId")
				.leftJoin("FinancialAccount as origin", "origin.id", "Transaction.originFinancialAccountId")
				.leftJoin(
					"FinancialAccount as destination",
					"destination.id",
					"Transaction.destinationFinancialAccountId",
				)
				.leftJoin("RecurringPayment", "RecurringPayment.id", "Transaction.recurrenceId")
				.select([
					"Transaction.id",
					"Transaction.amount",
					"Transaction.date",
					"Transaction.description",
					"Transaction.type",
					"Transaction.originFinancialAccountId",
					"Transaction.destinationFinancialAccountId",
					"Transaction.createdAt",
					"Category.name as categoryName",
					"Category.color as categoryColor",
				])
				.where(eb =>
					eb.or([
						eb("origin.userId", "=", userId),
						eb("destination.userId", "=", userId),
						eb("RecurringPayment.userId", "=", userId),
					]),
				);

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
			if (query.financialAccountId) {
				queryBuilder = queryBuilder.where(eb =>
					eb.or([
						eb("Transaction.originFinancialAccountId", "=", query.financialAccountId!),
						eb("Transaction.destinationFinancialAccountId", "=", query.financialAccountId!),
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
				categoryId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				endDate: t.Optional(t.String()),
				financialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				limit: t.Optional(t.Number({ maximum: 500, minimum: 1 })),
				offset: t.Optional(t.Number({ minimum: 0 })),
				startDate: t.Optional(t.String()),
				type: t.Optional(TransactionType),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertTransactionOwnership(params.id, userId);
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
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertTransactionOwnership(params.id, userId);
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
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			if (body.originFinancialAccountId) {
				await assertDirectOwnership("FinancialAccount", body.originFinancialAccountId, userId);
			}
			if (body.destinationFinancialAccountId) {
				await assertDirectOwnership("FinancialAccount", body.destinationFinancialAccountId, userId);
			}
			if (body.categoryId) await assertDirectOwnership("Category", body.categoryId, userId);
			if (body.recurrenceId) await assertDirectOwnership("RecurringPayment", body.recurrenceId, userId);
			if (!body.originFinancialAccountId && !body.destinationFinancialAccountId && !body.recurrenceId) {
				throw new HttpException("Informe uma conta financeira ou recorrência", 400);
			}
			const transaction = await db
				.insertInto("Transaction")
				.values({
					amount: body.amount,
					categoryId: body.categoryId,
					date: new Date(body.date),
					description: body.description,
					destinationFinancialAccountId: body.destinationFinancialAccountId,
					originFinancialAccountId: body.originFinancialAccountId,
					recurrenceId: body.recurrenceId,
					type: body.type ?? "EXPENSE",
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Update account balances
			if (body.originFinancialAccountId) {
				await db
					.updateTable("FinancialAccount")
					.set(eb => ({
						balance: eb("balance", "-", body.amount),
						updatedAt: new Date(),
					}))
					.where("id", "=", body.originFinancialAccountId)
					.execute();
			}

			if (body.destinationFinancialAccountId) {
				await db
					.updateTable("FinancialAccount")
					.set(eb => ({
						balance: eb("balance", "+", body.amount),
						updatedAt: new Date(),
					}))
					.where("id", "=", body.destinationFinancialAccountId)
					.execute();
			}

			return transaction;
		},
		{
			body: t.Object({
				amount: t.Number(),
				categoryId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				date: t.String(),
				description: t.Optional(t.String({ maxLength: 1000 })),
				destinationFinancialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				originFinancialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				recurrenceId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				type: t.Optional(TransactionType),
			}),
			detail: { tags: ["Transactions"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertTransactionOwnership(params.id, userId);
			if (body.categoryId) await assertDirectOwnership("Category", body.categoryId, userId);
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
				categoryId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
				date: t.Optional(t.String()),
				description: t.Optional(t.String({ maxLength: 1000 })),
				type: t.Optional(TransactionType),
			}),
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertTransactionOwnership(params.id, userId);
			const existing = await db
				.selectFrom("Transaction")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Transaction not found", 404);
			}

			// Reverse account balance changes
			if (existing.originFinancialAccountId) {
				await db
					.updateTable("FinancialAccount")
					.set(eb => ({
						balance: eb("balance", "+", Number(existing.amount)),
						updatedAt: new Date(),
					}))
					.where("id", "=", existing.originFinancialAccountId)
					.execute();
			}

			if (existing.destinationFinancialAccountId) {
				await db
					.updateTable("FinancialAccount")
					.set(eb => ({
						balance: eb("balance", "-", Number(existing.amount)),
						updatedAt: new Date(),
					}))
					.where("id", "=", existing.destinationFinancialAccountId)
					.execute();
			}

			await db.deleteFrom("Transaction").where("id", "=", params.id).execute();
			return { success: true };
		},
		{
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	);
