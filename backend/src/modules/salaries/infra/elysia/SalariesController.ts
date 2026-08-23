import Elysia, { t } from "elysia";
import { assertDirectOwnership, requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

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
			let queryBuilder = db.selectFrom("Salary").selectAll().where("userId", "=", userId);
			if (query.isActive !== undefined) {
				queryBuilder = queryBuilder.where("isActive", "=", query.isActive);
			}

			const salaries = await queryBuilder.orderBy("startDate", "desc").execute();
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
			const salary = await db.selectFrom("Salary").where("id", "=", params.id).selectAll().executeTakeFirst();

			if (!salary) {
				throw new HttpException("Salary not found", 404);
			}

			// Get payment history
			const payments = await db
				.selectFrom("SalaryPayment")
				.where("salaryId", "=", params.id)
				.selectAll()
				.orderBy("date", "desc")
				.execute();

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
			const history = await db
				.selectFrom("SalaryHistory")
				.where("salaryId", "=", params.id)
				.selectAll()
				.orderBy("changedAt", "desc")
				.execute();

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
			const salary = await db
				.insertInto("Salary")
				.values({
					endDate: body.endDate ? new Date(body.endDate) : undefined,
					frequency: body.frequency ?? "MONTHLY",
					grossAmount: body.grossAmount,
					isActive: body.isActive ?? true,
					netAmount: body.netAmount,
					payDay: body.payDay,
					source: body.source,
					startDate: new Date(body.startDate),
					userId,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

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
			await assertDirectOwnership("FinancialAccount", body.financialAccountId, userId);
			const salary = await db.selectFrom("Salary").where("id", "=", params.id).selectAll().executeTakeFirst();

			if (!salary) {
				throw new HttpException("Salary not found", 404);
			}

			const payment = await db
				.insertInto("SalaryPayment")
				.values({
					amount: body.amount,
					date: new Date(body.date),
					financialAccountId: body.financialAccountId,
					notes: body.notes,
					salaryId: params.id,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Update account balance
			await db
				.updateTable("FinancialAccount")
				.set(eb => ({
					balance: eb("balance", "+", body.amount),
					updatedAt: new Date(),
				}))
				.where("id", "=", body.financialAccountId)
				.execute();

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
			const existing = await db
				.selectFrom("Salary")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

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
				await db.insertInto("SalaryHistory").values(historyEntries).execute();
			}

			const salary = await db
				.updateTable("Salary")
				.set({
					...(body.source && { source: body.source }),
					...(body.grossAmount !== undefined && { grossAmount: body.grossAmount }),
					...(body.netAmount !== undefined && { netAmount: body.netAmount }),
					...(body.frequency && { frequency: body.frequency }),
					...(body.payDay !== undefined && { payDay: body.payDay }),
					...(body.endDate !== undefined && {
						endDate: body.endDate ? new Date(body.endDate) : null,
					}),
					...(body.isActive !== undefined && { isActive: body.isActive }),
					updatedAt: new Date(),
				})
				.where("id", "=", params.id)
				.returningAll()
				.executeTakeFirstOrThrow();

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
			const existing = await db
				.selectFrom("Salary")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Salary not found", 404);
			}

			await db.deleteFrom("Salary").where("id", "=", params.id).execute();
			return { success: true };
		},
		{
			detail: { tags: ["Salaries"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	);
