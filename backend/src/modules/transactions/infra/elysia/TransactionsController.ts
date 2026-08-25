import Elysia, { t } from "elysia";
import {
	assertBalanceAccountOwnership,
	assertDirectOwnership,
	assertTransactionOwnership,
	requireUserId,
} from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, numeric, param, queryFirst, queryRows } from "~/shared/infra/sql";

const transactionColumns = [
	"id",
	"amount",
	"date",
	"description",
	"type",
	"categoryId",
	"recurrenceId",
	"originFinancialAccountId",
	"destinationFinancialAccountId",
	"createdAt",
	"updatedAt",
] as const;

const TransactionType = t.Union([t.Literal("INCOME"), t.Literal("EXPENSE"), t.Literal("TRANSFER")]);

export const TransactionsController = new Elysia({ prefix: "/transactions" })
	.get(
		"/",
		async ({ query, request }) => {
			const userId = await requireUserId(request);
			if (query.financialAccountId) {
				await assertDirectOwnership("FinancialAccount", query.financialAccountId, userId);
			}
			const origin = db.sql.public.FinancialAccount.select("id", "userId").as("origin");
			const destination = db.sql.public.FinancialAccount.select("id", "userId").as("destination");
			let queryBuilder = db.sql.public.Transaction.outerLeftJoin(db.sql.public.Category, (f, fn) =>
				fn.eq(f.Transaction.categoryId, f.Category.id),
			)
				.outerLeftJoin(origin, (f, fn) => fn.eq(f.Transaction.originFinancialAccountId, f.origin.id))
				.outerLeftJoin(destination, (f, fn) =>
					fn.eq(f.Transaction.destinationFinancialAccountId, f.destination.id),
				)
				.outerLeftJoin(db.sql.public.RecurringPayment, (f, fn) =>
					fn.eq(f.Transaction.recurrenceId, f.RecurringPayment.id),
				)
				.select(f => ({
					amount: f.Transaction.amount,
					categoryColor: f.Category.color,
					categoryName: f.Category.name,
					createdAt: f.Transaction.createdAt,
					date: f.Transaction.date,
					description: f.Transaction.description,
					destinationFinancialAccountId: f.Transaction.destinationFinancialAccountId,
					id: f.Transaction.id,
					originFinancialAccountId: f.Transaction.originFinancialAccountId,
					type: f.Transaction.type,
				}))
				.where((f, fn) =>
					fn.or(
						fn.eq(f.origin.userId, userId),
						fn.eq(f.destination.userId, userId),
						fn.eq(f.RecurringPayment.userId, userId),
					),
				);

			if (query.startDate) {
				queryBuilder = queryBuilder.where((f, fn) => fn.gte(f.Transaction.date, new Date(query.startDate!)));
			}
			if (query.endDate) {
				queryBuilder = queryBuilder.where((f, fn) => fn.lte(f.Transaction.date, new Date(query.endDate!)));
			}
			if (query.type) {
				queryBuilder = queryBuilder.where((f, fn) => fn.eq(f.Transaction.type, query.type!));
			}
			if (query.categoryId) {
				queryBuilder = queryBuilder.where((f, fn) => fn.eq(f.Transaction.categoryId, query.categoryId!));
			}
			if (query.financialAccountId) {
				queryBuilder = queryBuilder.where((f, fn) =>
					fn.or(
						fn.eq(f.Transaction.originFinancialAccountId, query.financialAccountId!),
						fn.eq(f.Transaction.destinationFinancialAccountId, query.financialAccountId!),
					),
				);
			}

			const transactions = await queryRows(
				queryBuilder
					.orderBy(f => f.Transaction.date, { direction: "desc" })
					.orderBy(f => f.Transaction.createdAt, { direction: "desc" })
					.limit(query.limit ?? 100)
					.offset(query.offset ?? 0)
					.build(),
			);

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
			const transaction = await queryFirst(
				db.sql.public.Transaction.select(...transactionColumns)
					.where((f, fn) => fn.eq(f.id, params.id))
					.limit(1)
					.build(),
			);

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
			const history = await queryRows(
				db.sql.public.TransactionHistory.select(
					"id",
					"transactionId",
					"field",
					"oldValue",
					"newValue",
					"changedAt",
				)
					.where((f, fn) => fn.eq(f.transactionId, params.id))
					.orderBy("changedAt", { direction: "desc" })
					.build(),
			);

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
				await assertBalanceAccountOwnership(body.originFinancialAccountId, userId);
			}
			if (body.destinationFinancialAccountId) {
				await assertBalanceAccountOwnership(body.destinationFinancialAccountId, userId);
			}
			if (body.categoryId) await assertDirectOwnership("Category", body.categoryId, userId);
			if (body.recurrenceId) await assertDirectOwnership("RecurringPayment", body.recurrenceId, userId);
			if (!body.originFinancialAccountId && !body.destinationFinancialAccountId && !body.recurrenceId) {
				throw new HttpException("Informe uma conta financeira ou recorrência", 400);
			}
			const transaction = await queryFirst(
				db.sql.public.Transaction.insert([
					{
						amount: String(body.amount),
						categoryId: body.categoryId,
						date: new Date(body.date),
						description: body.description,
						destinationFinancialAccountId: body.destinationFinancialAccountId,
						originFinancialAccountId: body.originFinancialAccountId,
						recurrenceId: body.recurrenceId,
						type: body.type ?? "EXPENSE",
					},
				])
					.returning(...transactionColumns)
					.build(),
			);
			if (!transaction) throw new HttpException("Transaction not created", 500);

			// Update account balances
			if (body.originFinancialAccountId) {
				const amount = param(numeric<12, 2>(body.amount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.FinancialAccount.update((f, fn) => ({
						balance: fn.raw`${f.balance} - ${amount}`.returns("pg/numeric@1"),
						updatedAt: fn.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((f, fn) => fn.eq(f.id, body.originFinancialAccountId!))
						.build(),
				);
			}

			if (body.destinationFinancialAccountId) {
				const amount = param(numeric<12, 2>(body.amount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.FinancialAccount.update((f, fn) => ({
						balance: fn.raw`${f.balance} + ${amount}`.returns("pg/numeric@1"),
						updatedAt: fn.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((f, fn) => fn.eq(f.id, body.destinationFinancialAccountId!))
						.build(),
				);
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
			const existing = await queryFirst(
				db.sql.public.Transaction.select(...transactionColumns)
					.where((f, fn) => fn.eq(f.id, params.id))
					.limit(1)
					.build(),
			);

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
				await executeStatement(db.sql.public.TransactionHistory.insert(historyEntries as never).build());
			}

			const transaction = await queryFirst(
				db.sql.public.Transaction.update({
					...(body.amount !== undefined && { amount: String(body.amount) }),
					...(body.date && { date: new Date(body.date) }),
					...(body.description !== undefined && { description: body.description }),
					...(body.type && { type: body.type }),
					...(body.categoryId !== undefined && { categoryId: body.categoryId }),
					updatedAt: new Date(),
				} as never)
					.where((f, fn) => fn.eq(f.id, params.id))
					.returning(...transactionColumns)
					.build(),
			);
			if (!transaction) throw new HttpException("Transaction not found", 404);

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
			const existing = await queryFirst(
				db.sql.public.Transaction.select(...transactionColumns)
					.where((f, fn) => fn.eq(f.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("Transaction not found", 404);
			}

			// Reverse account balance changes
			if (existing.originFinancialAccountId) {
				const amount = param(numeric<12, 2>(existing.amount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.FinancialAccount.update((f, fn) => ({
						balance: fn.raw`${f.balance} + ${amount}`.returns("pg/numeric@1"),
						updatedAt: fn.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((f, fn) => fn.eq(f.id, existing.originFinancialAccountId!))
						.build(),
				);
			}

			if (existing.destinationFinancialAccountId) {
				const amount = param(numeric<12, 2>(existing.amount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.FinancialAccount.update((f, fn) => ({
						balance: fn.raw`${f.balance} - ${amount}`.returns("pg/numeric@1"),
						updatedAt: fn.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((f, fn) => fn.eq(f.id, existing.destinationFinancialAccountId!))
						.build(),
				);
			}

			await executeStatement(
				db.sql.public.Transaction.delete()
					.where((f, fn) => fn.eq(f.id, params.id))
					.build(),
			);
			return { success: true };
		},
		{
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	);
