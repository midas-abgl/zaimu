import Elysia, { t } from "elysia";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

const RecurrenceFrequency = t.Union([
	t.Literal("DAILY"),
	t.Literal("WEEKLY"),
	t.Literal("BIWEEKLY"),
	t.Literal("MONTHLY"),
	t.Literal("YEARLY"),
]);

const PaymentMethod = t.Union([
	t.Literal("DEBIT"),
	t.Literal("CREDIT"),
	t.Literal("PIX"),
	t.Literal("CASH"),
	t.Literal("TRANSFER"),
	t.Literal("BOLETO"),
]);

export const RecurringController = new Elysia({ prefix: "/recurring" })
	.get(
		"/",
		async ({ query }) => {
			let queryBuilder = db.selectFrom("RecurringPayment").selectAll();

			if (query.userId) {
				queryBuilder = queryBuilder.where("userId", "=", query.userId);
			}
			if (query.isActive !== undefined) {
				queryBuilder = queryBuilder.where("isActive", "=", query.isActive);
			}

			const payments = await queryBuilder.orderBy("name", "asc").execute();
			return payments;
		},
		{
			detail: { tags: ["Recurring Payments"] },
			query: t.Object({
				isActive: t.Optional(t.Boolean()),
				userId: t.Optional(t.String({ format: "uuid" })),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const payment = await db
				.selectFrom("RecurringPayment")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!payment) {
				throw new HttpException("Recurring payment not found", 404);
			}

			return payment;
		},
		{
			detail: { tags: ["Recurring Payments"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params }) => {
			const history = await db
				.selectFrom("RecurringPaymentHistory")
				.where("recurringPaymentId", "=", params.id)
				.selectAll()
				.orderBy("changedAt", "desc")
				.execute();

			return history;
		},
		{
			detail: { tags: ["Recurring Payments"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.post(
		"/",
		async ({ body }) => {
			const payment = await db
				.insertInto("RecurringPayment")
				.values({
					amount: body.amount,
					categoryId: body.categoryId,
					dayOfMonth: body.dayOfMonth,
					dayOfWeek: body.dayOfWeek,
					endDate: body.endDate ? new Date(body.endDate) : undefined,
					frequency: body.frequency,
					isActive: body.isActive ?? true,
					name: body.name,
					paymentMethod: body.paymentMethod ?? "DEBIT",
					startDate: new Date(body.startDate),
					userId: body.userId,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			return payment;
		},
		{
			body: t.Object({
				amount: t.Number(),
				categoryId: t.Optional(t.String({ format: "uuid" })),
				dayOfMonth: t.Optional(t.Number({ maximum: 31, minimum: 1 })),
				dayOfWeek: t.Optional(t.Number({ maximum: 6, minimum: 0 })),
				endDate: t.Optional(t.String()),
				frequency: RecurrenceFrequency,
				isActive: t.Optional(t.Boolean()),
				name: t.String({ maxLength: 100 }),
				paymentMethod: t.Optional(PaymentMethod),
				startDate: t.String(),
				userId: t.String({ format: "uuid" }),
			}),
			detail: { tags: ["Recurring Payments"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const existing = await db
				.selectFrom("RecurringPayment")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Recurring payment not found", 404);
			}

			// Record history
			const historyEntries: Array<{
				recurringPaymentId: string;
				field: string;
				oldValue: string | null;
				newValue: string | null;
			}> = [];

			if (body.amount !== undefined && body.amount !== Number(existing.amount)) {
				historyEntries.push({
					field: "amount",
					newValue: String(body.amount),
					oldValue: String(existing.amount),
					recurringPaymentId: params.id,
				});
			}
			if (body.isActive !== undefined && body.isActive !== existing.isActive) {
				historyEntries.push({
					field: "isActive",
					newValue: String(body.isActive),
					oldValue: String(existing.isActive),
					recurringPaymentId: params.id,
				});
			}

			if (historyEntries.length > 0) {
				await db.insertInto("RecurringPaymentHistory").values(historyEntries).execute();
			}

			const payment = await db
				.updateTable("RecurringPayment")
				.set({
					...(body.name && { name: body.name }),
					...(body.amount !== undefined && { amount: body.amount }),
					...(body.frequency && { frequency: body.frequency }),
					...(body.dayOfMonth !== undefined && { dayOfMonth: body.dayOfMonth }),
					...(body.dayOfWeek !== undefined && { dayOfWeek: body.dayOfWeek }),
					...(body.endDate !== undefined && {
						endDate: body.endDate ? new Date(body.endDate) : null,
					}),
					...(body.categoryId !== undefined && { categoryId: body.categoryId }),
					...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
					...(body.isActive !== undefined && { isActive: body.isActive }),
					updatedAt: new Date(),
				})
				.where("id", "=", params.id)
				.returningAll()
				.executeTakeFirstOrThrow();

			return payment;
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number()),
				categoryId: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
				dayOfMonth: t.Optional(t.Nullable(t.Number({ maximum: 31, minimum: 1 }))),
				dayOfWeek: t.Optional(t.Nullable(t.Number({ maximum: 6, minimum: 0 }))),
				endDate: t.Optional(t.Nullable(t.String())),
				frequency: t.Optional(RecurrenceFrequency),
				isActive: t.Optional(t.Boolean()),
				name: t.Optional(t.String({ maxLength: 100 })),
				paymentMethod: t.Optional(PaymentMethod),
			}),
			detail: { tags: ["Recurring Payments"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const existing = await db
				.selectFrom("RecurringPayment")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Recurring payment not found", 404);
			}

			await db.deleteFrom("RecurringPayment").where("id", "=", params.id).execute();
			return { success: true };
		},
		{
			detail: { tags: ["Recurring Payments"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	);
