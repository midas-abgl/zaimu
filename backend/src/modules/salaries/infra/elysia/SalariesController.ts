import Elysia, { t } from "elysia";
import { assertBalanceAccountOwnership, assertDirectOwnership, requireUserId } from "~/modules/auth";
import { deleteLinkedTransactions } from "~/modules/transactions/application/delete-linked-transactions";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, numeric, param, queryFirst, queryRows } from "~/shared/infra/sql";

const salaryColumns = [
	"id",
	"userId",
	"financialAccountId",
	"source",
	"amount",
	"frequency",
	"payDay",
	"startDate",
	"autoGenerateFrom",
	"endDate",
	"isActive",
	"createdAt",
	"updatedAt",
] as const;
const RecurrenceFrequency = t.Union([
	t.Literal("DAILY"),
	t.Literal("WEEKLY"),
	t.Literal("BIWEEKLY"),
	t.Literal("MONTHLY"),
	t.Literal("YEARLY"),
]);

function dateWithDayOfMonth(date: Date, dayOfMonth: number): Date {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth();
	const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
	return new Date(Date.UTC(year, month, Math.min(dayOfMonth, lastDay)));
}

export const SalariesController = new Elysia({ prefix: "/salaries" })
	.get(
		"/",
		async ({ query, request }) => {
			const userId = await requireUserId(request);
			let queryBuilder = db.sql.public.Salary.select(...salaryColumns).where((fields, functions) =>
				functions.eq(fields.userId, userId),
			);
			if (query.isActive !== undefined) {
				queryBuilder = queryBuilder.where((fields, functions) =>
					functions.eq(fields.isActive, query.isActive!),
				);
			}

			const salaries = await queryRows(queryBuilder.orderBy("startDate", { direction: "desc" }).build());
			return salaries;
		},
		{
			detail: { tags: ["Salaries"] },
			query: t.Object({
				isActive: t.Optional(t.Boolean()),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Salary", params.id, userId);
			const salary = await queryFirst(
				db.sql.public.Salary.select(...salaryColumns)
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!salary) {
				throw new HttpException("Salary not found", 404);
			}

			return salary;
		},
		{
			detail: { tags: ["Salaries"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Salary", params.id, userId);
			const history = await queryRows(
				db.sql.public.SalaryHistory.select("id", "salaryId", "field", "oldValue", "newValue", "changedAt")
					.where((fields, functions) => functions.eq(fields.salaryId, params.id))
					.orderBy("changedAt", { direction: "desc" })
					.build(),
			);

			return history;
		},
		{
			detail: { tags: ["Salaries"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			await assertBalanceAccountOwnership(body.financialAccountId, userId);
			const salary = await queryFirst(
				db.sql.public.Salary.insert([
					{
						amount: String(body.amount),
						autoGenerateFrom: new Date(body.autoGenerateFrom ?? body.startDate),
						endDate: body.endDate ? new Date(body.endDate) : undefined,
						financialAccountId: body.financialAccountId,
						frequency: body.frequency ?? "MONTHLY",
						isActive: body.isActive ?? true,
						payDay: body.payDay,
						source: body.source,
						startDate: new Date(body.startDate),
						userId,
					},
				])
					.returning(...salaryColumns)
					.build(),
			);
			if (!salary) throw new HttpException("Salary not created", 500);

			return salary;
		},
		{
			body: t.Object({
				amount: t.Number({ exclusiveMinimum: 0 }),
				autoGenerateFrom: t.Optional(t.String()),
				endDate: t.Optional(t.String()),
				financialAccountId: t.String({ maxLength: 36, minLength: 1 }),
				frequency: t.Optional(RecurrenceFrequency),
				isActive: t.Optional(t.Boolean()),
				payDay: t.Number({ maximum: 31, minimum: 1 }),
				source: t.String({ maxLength: 100 }),
				startDate: t.String(),
			}),
			detail: { tags: ["Salaries"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Salary", params.id, userId);
			if (body.financialAccountId) await assertBalanceAccountOwnership(body.financialAccountId, userId);
			const existing = await queryFirst(
				db.sql.public.Salary.select(...salaryColumns)
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("Salary not found", 404);
			}

			// Record history
			const historyEntries: Array<{
				salaryId: string;
				field: string;
				oldValue: string | null;
				newValue: string | null;
			}> = [];
			if (body.amount !== undefined && body.amount !== Number(existing.amount)) {
				historyEntries.push({
					field: "amount",
					newValue: String(body.amount),
					oldValue: String(existing.amount),
					salaryId: params.id,
				});
			}

			if (body.isActive !== undefined && body.isActive !== existing.isActive) {
				historyEntries.push({
					field: "isActive",
					newValue: String(body.isActive),
					oldValue: String(existing.isActive),
					salaryId: params.id,
				});
			}

			if (historyEntries.length > 0) {
				await executeStatement(db.sql.public.SalaryHistory.insert(historyEntries as never).build());
			}

			const salary = await queryFirst(
				db.sql.public.Salary.update({
					...(body.source && { source: body.source }),
					...(body.financialAccountId && { financialAccountId: body.financialAccountId }),
					...(body.amount !== undefined && { amount: String(body.amount) }),
					...(body.frequency && { frequency: body.frequency }),
					...(body.payDay !== undefined && { payDay: body.payDay }),
					...(body.endDate !== undefined && {
						endDate: body.endDate ? new Date(body.endDate) : null,
					}),
					...(body.isActive !== undefined && { isActive: body.isActive }),
					updatedAt: new Date(),
				} as never)
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.returning(...salaryColumns)
					.build(),
			);
			if (!salary) throw new HttpException("Salary not found", 404);
			if (body.updateUneditedTransactions) {
				const transactions = await queryRows(
					db.sql.public.Transaction.select("id", "date", "destinationFinancialAccountId")
						.where((fields, functions) => functions.eq(fields.salaryId, salary.id))
						.build(),
				);
				const histories = transactions.length
					? await queryRows(
							db.sql.public.TransactionHistory.select("transactionId")
								.where((fields, functions) =>
									functions.in(
										fields.transactionId,
										transactions.map(transaction => transaction.id),
									),
								)
								.build(),
						)
					: [];
				const manuallyEditedIds = new Set(histories.map(history => history.transactionId));
				const automaticTransactions = transactions.filter(
					transaction => !manuallyEditedIds.has(transaction.id),
				);
				await Promise.all(
					automaticTransactions.map(transaction =>
						executeStatement(
							db.sql.public.Transaction.update({
								...(body.amount !== undefined && { amount: String(body.amount) }),
								...(body.source !== undefined && { description: body.source }),
								...(body.payDay !== undefined && {
									date: dateWithDayOfMonth(transaction.date, body.payDay),
									salaryOccurrenceDate: dateWithDayOfMonth(transaction.date, body.payDay),
								}),
								updatedAt: new Date(),
							} as never)
								.where((fields, functions) => functions.eq(fields.id, transaction.id))
								.build(),
						),
					),
				);
				if (body.amount !== undefined) {
					const difference = body.amount - Number(existing.amount);
					await Promise.all(
						automaticTransactions
							.filter(transaction => transaction.destinationFinancialAccountId)
							.map(transaction => {
								const amount = param(numeric<12, 2>(difference), { codecId: "pg/numeric@1" });
								return executeStatement(
									db.sql.public.FinancialAccount.update((fields, functions) => ({
										balance: functions.raw`${fields.balance} + ${amount}`.returns("pg/numeric@1"),
										updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
									}))
										.where((fields, functions) =>
											functions.eq(fields.id, transaction.destinationFinancialAccountId!),
										)
										.build(),
								);
							}),
					);
				}
			}

			return salary;
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number({ exclusiveMinimum: 0 })),
				endDate: t.Optional(t.Nullable(t.String())),
				financialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				frequency: t.Optional(RecurrenceFrequency),
				isActive: t.Optional(t.Boolean()),
				payDay: t.Optional(t.Number({ maximum: 31, minimum: 1 })),
				source: t.Optional(t.String({ maxLength: 100 })),
				updateUneditedTransactions: t.Optional(t.Boolean()),
			}),
			detail: { tags: ["Salaries"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, query, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Salary", params.id, userId);
			const existing = await queryFirst(
				db.sql.public.Salary.select("id")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("Salary not found", 404);
			}

			if (query.deleteTransactions) await deleteLinkedTransactions("salaryId", params.id);
			await executeStatement(
				db.sql.public.Salary.delete()
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.build(),
			);
			return { success: true };
		},
		{
			detail: { tags: ["Salaries"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
			query: t.Object({ deleteTransactions: t.Optional(t.Boolean()) }),
		},
	);
