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

const PaymentMethod = t.Union([
	t.Literal("DEBIT"),
	t.Literal("CREDIT"),
	t.Literal("PIX"),
	t.Literal("CASH"),
	t.Literal("TRANSFER"),
	t.Literal("BOLETO"),
]);

export const SubscriptionsController = new Elysia({ prefix: "/subscriptions" })
	.get(
		"/",
		async ({ query, request }) => {
			const userId = await requireUserId(request);
			let queryBuilder = db.selectFrom("Subscription").selectAll().where("userId", "=", userId);
			if (query.isActive !== undefined) {
				queryBuilder = queryBuilder.where("isActive", "=", query.isActive);
			}

			const subscriptions = await queryBuilder.orderBy("name", "asc").execute();

			// Calculate total monthly cost
			const totalMonthlyCost = subscriptions
				.filter(s => s.isActive)
				.reduce((sum, s) => {
					const amount = Number(s.amount);
					switch (s.frequency) {
						case "DAILY":
							return sum + amount * 30;
						case "WEEKLY":
							return sum + amount * 4;
						case "BIWEEKLY":
							return sum + amount * 2;
						case "MONTHLY":
							return sum + amount;
						case "YEARLY":
							return sum + amount / 12;
						default:
							return sum + amount;
					}
				}, 0);

			return { subscriptions, totalMonthlyCost };
		},
		{
			detail: { tags: ["Subscriptions"] },
			query: t.Object({
				isActive: t.Optional(t.Boolean()),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Subscription", params.id, userId);
			const subscription = await db
				.selectFrom("Subscription")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!subscription) {
				throw new HttpException("Subscription not found", 404);
			}

			return subscription;
		},
		{
			detail: { tags: ["Subscriptions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Subscription", params.id, userId);
			const history = await db
				.selectFrom("SubscriptionHistory")
				.where("subscriptionId", "=", params.id)
				.selectAll()
				.orderBy("changedAt", "desc")
				.execute();

			return history;
		},
		{
			detail: { tags: ["Subscriptions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			const subscription = await db
				.insertInto("Subscription")
				.values({
					amount: body.amount,
					billingDay: body.billingDay,
					endDate: body.endDate ? new Date(body.endDate) : undefined,
					frequency: body.frequency ?? "MONTHLY",
					isActive: body.isActive ?? true,
					name: body.name,
					paymentMethod: body.paymentMethod ?? "CREDIT",
					startDate: new Date(body.startDate),
					userId,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			return subscription;
		},
		{
			body: t.Object({
				amount: t.Number(),
				billingDay: t.Number({ maximum: 31, minimum: 1 }),
				endDate: t.Optional(t.String()),
				frequency: t.Optional(RecurrenceFrequency),
				isActive: t.Optional(t.Boolean()),
				name: t.String({ maxLength: 100 }),
				paymentMethod: t.Optional(PaymentMethod),
				startDate: t.String(),
			}),
			detail: { tags: ["Subscriptions"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Subscription", params.id, userId);
			const existing = await db
				.selectFrom("Subscription")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Subscription not found", 404);
			}

			// Record history
			const historyEntries: Array<{
				subscriptionId: string;
				field: string;
				oldValue: string | null;
				newValue: string | null;
			}> = [];

			if (body.amount !== undefined && body.amount !== Number(existing.amount)) {
				historyEntries.push({
					field: "amount",
					newValue: String(body.amount),
					oldValue: String(existing.amount),
					subscriptionId: params.id,
				});
			}
			if (body.isActive !== undefined && body.isActive !== existing.isActive) {
				historyEntries.push({
					field: "isActive",
					newValue: String(body.isActive),
					oldValue: String(existing.isActive),
					subscriptionId: params.id,
				});
			}

			if (historyEntries.length > 0) {
				await db.insertInto("SubscriptionHistory").values(historyEntries).execute();
			}

			const subscription = await db
				.updateTable("Subscription")
				.set({
					...(body.name && { name: body.name }),
					...(body.amount !== undefined && { amount: body.amount }),
					...(body.billingDay !== undefined && { billingDay: body.billingDay }),
					...(body.frequency && { frequency: body.frequency }),
					...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
					...(body.endDate !== undefined && {
						endDate: body.endDate ? new Date(body.endDate) : null,
					}),
					...(body.isActive !== undefined && { isActive: body.isActive }),
					updatedAt: new Date(),
				})
				.where("id", "=", params.id)
				.returningAll()
				.executeTakeFirstOrThrow();

			return subscription;
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number()),
				billingDay: t.Optional(t.Number({ maximum: 31, minimum: 1 })),
				endDate: t.Optional(t.Nullable(t.String())),
				frequency: t.Optional(RecurrenceFrequency),
				isActive: t.Optional(t.Boolean()),
				name: t.Optional(t.String({ maxLength: 100 })),
				paymentMethod: t.Optional(PaymentMethod),
			}),
			detail: { tags: ["Subscriptions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Subscription", params.id, userId);
			const existing = await db
				.selectFrom("Subscription")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Subscription not found", 404);
			}

			await db.deleteFrom("Subscription").where("id", "=", params.id).execute();
			return { success: true };
		},
		{
			detail: { tags: ["Subscriptions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	);
