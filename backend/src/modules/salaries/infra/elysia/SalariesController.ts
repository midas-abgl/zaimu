import Elysia, { t } from "elysia";
import { assertBalanceAccountOwnership, assertDirectOwnership, requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, numeric, param, queryFirst, queryRows } from "~/shared/infra/sql";

const salaryColumns = [
	"id",
	"userId",
	"source",
	"grossAmount",
	"netAmount",
	"frequency",
	"payDay",
	"startDate",
	"endDate",
	"isActive",
	"createdAt",
	"updatedAt",
] as const;
const salaryPaymentColumns = [
	"id",
	"salaryId",
	"financialAccountId",
	"amount",
	"date",
	"notes",
	"createdAt",
] as const;

const RecurrenceFrequency = t.Union([
	t.Literal("DAILY"),
	t.Literal("WEEKLY"),
	t.Literal("BIWEEKLY"),
	t.Literal("MONTHLY"),
	t.Literal("YEARLY"),
]);

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

			// Get payment history
			const payments = await queryRows(
				db.sql.public.SalaryPayment.select(...salaryPaymentColumns)
					.where((fields, functions) => functions.eq(fields.salaryId, params.id))
					.orderBy("date", { direction: "desc" })
					.build(),
			);

			return { ...salary, payments };
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
			const salary = await queryFirst(
				db.sql.public.Salary.insert([
					{
						endDate: body.endDate ? new Date(body.endDate) : undefined,
						frequency: body.frequency ?? "MONTHLY",
						grossAmount: String(body.grossAmount),
						isActive: body.isActive ?? true,
						netAmount: String(body.netAmount),
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
				endDate: t.Optional(t.String()),
				frequency: t.Optional(RecurrenceFrequency),
				grossAmount: t.Number(),
				isActive: t.Optional(t.Boolean()),
				netAmount: t.Number(),
				payDay: t.Number({ maximum: 31, minimum: 1 }),
				source: t.String({ maxLength: 100 }),
				startDate: t.String(),
			}),
			detail: { tags: ["Salaries"] },
		},
	)
	.post(
		"/:id/payments",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Salary", params.id, userId);
			await assertBalanceAccountOwnership(body.financialAccountId, userId);
			const salary = await queryFirst(
				db.sql.public.Salary.select("id")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!salary) {
				throw new HttpException("Salary not found", 404);
			}

			const payment = await queryFirst(
				db.sql.public.SalaryPayment.insert([
					{
						amount: String(body.amount),
						date: new Date(body.date),
						financialAccountId: body.financialAccountId,
						notes: body.notes,
						salaryId: params.id,
					},
				])
					.returning(...salaryPaymentColumns)
					.build(),
			);
			if (!payment) throw new HttpException("Salary payment not created", 500);

			// Update account balance
			const amount = param(numeric<12, 2>(body.amount), { codecId: "pg/numeric@1" });
			await executeStatement(
				db.sql.public.FinancialAccount.update((fields, functions) => ({
					balance: functions.raw`${fields.balance} + ${amount}`.returns("pg/numeric@1"),
					updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
				}))
					.where((fields, functions) => functions.eq(fields.id, body.financialAccountId))
					.build(),
			);

			return payment;
		},
		{
			body: t.Object({
				amount: t.Number(),
				date: t.String(),
				financialAccountId: t.String({ maxLength: 36, minLength: 1 }),
				notes: t.Optional(t.String({ maxLength: 500 })),
			}),
			detail: { tags: ["Salaries"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.patch(
		"/:id",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Salary", params.id, userId);
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

			if (body.grossAmount !== undefined && body.grossAmount !== Number(existing.grossAmount)) {
				historyEntries.push({
					field: "grossAmount",
					newValue: String(body.grossAmount),
					oldValue: String(existing.grossAmount),
					salaryId: params.id,
				});
			}
			if (body.netAmount !== undefined && body.netAmount !== Number(existing.netAmount)) {
				historyEntries.push({
					field: "netAmount",
					newValue: String(body.netAmount),
					oldValue: String(existing.netAmount),
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
					...(body.grossAmount !== undefined && { grossAmount: String(body.grossAmount) }),
					...(body.netAmount !== undefined && { netAmount: String(body.netAmount) }),
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

			return salary;
		},
		{
			body: t.Object({
				endDate: t.Optional(t.Nullable(t.String())),
				frequency: t.Optional(RecurrenceFrequency),
				grossAmount: t.Optional(t.Number()),
				isActive: t.Optional(t.Boolean()),
				netAmount: t.Optional(t.Number()),
				payDay: t.Optional(t.Number({ maximum: 31, minimum: 1 })),
				source: t.Optional(t.String({ maxLength: 100 })),
			}),
			detail: { tags: ["Salaries"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, request }) => {
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
		},
	);
