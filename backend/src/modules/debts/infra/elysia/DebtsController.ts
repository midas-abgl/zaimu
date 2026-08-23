import Elysia, { t } from "elysia";
import { assertDirectOwnership, requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, queryFirst, queryRows } from "~/shared/infra/sql";

const debtColumns = [
	"id",
	"userId",
	"personName",
	"amount",
	"description",
	"isOwedToMe",
	"date",
	"dueDate",
	"isPaid",
	"paidDate",
	"createdAt",
	"updatedAt",
] as const;

export const DebtsController = new Elysia({ prefix: "/debts" })
	.get(
		"/",
		async ({ query, request }) => {
			const userId = await requireUserId(request);
			let queryBuilder = db.sql.public.Debt.select(...debtColumns).where((fields, functions) =>
				functions.eq(fields.userId, userId),
			);
			if (query.isOwedToMe !== undefined) {
				queryBuilder = queryBuilder.where((fields, functions) =>
					functions.eq(fields.isOwedToMe, query.isOwedToMe!),
				);
			}
			if (query.isPaid !== undefined) {
				queryBuilder = queryBuilder.where((fields, functions) => functions.eq(fields.isPaid, query.isPaid!));
			}
			if (query.personName) {
				queryBuilder = queryBuilder.where((fields, functions) =>
					functions.ilike(fields.personName, `%${query.personName}%`),
				);
			}

			const debts = await queryRows(queryBuilder.orderBy("date", { direction: "desc" }).build());

			// Calculate totals
			const totals = debts.reduce(
				(acc, debt) => {
					const amount = Number(debt.amount);
					if (debt.isPaid) {
						return acc;
					}
					if (debt.isOwedToMe) {
						acc.owedToMe += amount;
					} else {
						acc.iOwe += amount;
					}
					return acc;
				},
				{ iOwe: 0, owedToMe: 0 },
			);

			return {
				debts,
				totals: {
					...totals,
					net: totals.owedToMe - totals.iOwe,
				},
			};
		},
		{
			detail: { tags: ["Debts"] },
			query: t.Object({
				isOwedToMe: t.Optional(t.Boolean()),
				isPaid: t.Optional(t.Boolean()),
				personName: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/summary",
		async ({ request }) => {
			const userId = await requireUserId(request);

			// Group debts by person
			const debts = await queryRows(
				db.sql.public.Debt.select(...debtColumns)
					.where((fields, functions) =>
						functions.and(functions.eq(fields.userId, userId), functions.eq(fields.isPaid, false)),
					)
					.build(),
			);

			const byPerson = debts.reduce(
				(acc, debt) => {
					const person = debt.personName;
					if (!acc[person]) {
						acc[person] = { debts: [], iOwe: 0, owedToMe: 0 };
					}

					const amount = Number(debt.amount);
					if (debt.isOwedToMe) {
						acc[person].owedToMe += amount;
					} else {
						acc[person].iOwe += amount;
					}
					acc[person].debts.push(debt);

					return acc;
				},
				{} as Record<string, { owedToMe: number; iOwe: number; debts: typeof debts }>,
			);

			// Calculate net balance per person
			const summary = Object.entries(byPerson).map(([person, data]) => ({
				debtCount: data.debts.length,
				iOwe: data.iOwe,
				netBalance: data.owedToMe - data.iOwe,
				owedToMe: data.owedToMe,
				person,
			}));

			return summary.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
		},
		{
			detail: { tags: ["Debts"] },
			query: t.Object({}),
		},
	)
	.get(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Debt", params.id, userId);
			const debt = await queryFirst(
				db.sql.public.Debt.select(...debtColumns)
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!debt) {
				throw new HttpException("Debt not found", 404);
			}

			return debt;
		},
		{
			detail: { tags: ["Debts"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Debt", params.id, userId);
			const history = await queryRows(
				db.sql.public.DebtHistory.select("id", "debtId", "field", "oldValue", "newValue", "changedAt")
					.where((fields, functions) => functions.eq(fields.debtId, params.id))
					.orderBy("changedAt", { direction: "desc" })
					.build(),
			);

			return history;
		},
		{
			detail: { tags: ["Debts"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			const debt = await queryFirst(
				db.sql.public.Debt.insert([
					{
						amount: String(body.amount),
						date: new Date(body.date),
						description: body.description,
						dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
						isOwedToMe: body.isOwedToMe ?? true,
						personName: body.personName,
						userId,
					},
				])
					.returning(...debtColumns)
					.build(),
			);
			if (!debt) throw new HttpException("Debt not created", 500);

			return debt;
		},
		{
			body: t.Object({
				amount: t.Number(),
				date: t.String(),
				description: t.Optional(t.String({ maxLength: 500 })),
				dueDate: t.Optional(t.String()),
				isOwedToMe: t.Optional(t.Boolean()),
				personName: t.String({ maxLength: 100 }),
			}),
			detail: { tags: ["Debts"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Debt", params.id, userId);
			const existing = await queryFirst(
				db.sql.public.Debt.select(...debtColumns)
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("Debt not found", 404);
			}

			// Record history for changed fields
			const historyEntries: Array<{
				debtId: string;
				field: string;
				oldValue: string | null;
				newValue: string | null;
			}> = [];

			if (body.amount !== undefined && body.amount !== Number(existing.amount)) {
				historyEntries.push({
					debtId: params.id,
					field: "amount",
					newValue: String(body.amount),
					oldValue: String(existing.amount),
				});
			}
			if (body.isPaid !== undefined && body.isPaid !== existing.isPaid) {
				historyEntries.push({
					debtId: params.id,
					field: "isPaid",
					newValue: String(body.isPaid),
					oldValue: String(existing.isPaid),
				});
			}

			if (historyEntries.length > 0) {
				await executeStatement(db.sql.public.DebtHistory.insert(historyEntries).build());
			}

			const debt = await queryFirst(
				db.sql.public.Debt.update({
					...(body.personName && { personName: body.personName }),
					...(body.amount !== undefined && { amount: String(body.amount) }),
					...(body.description !== undefined && { description: body.description }),
					...(body.isOwedToMe !== undefined && { isOwedToMe: body.isOwedToMe }),
					...(body.dueDate !== undefined && {
						dueDate: body.dueDate ? new Date(body.dueDate) : null,
					}),
					...(body.isPaid !== undefined && { isPaid: body.isPaid }),
					...(body.isPaid && { paidDate: new Date() }),
					updatedAt: new Date(),
				})
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.returning(...debtColumns)
					.build(),
			);
			if (!debt) throw new HttpException("Debt not found", 404);

			return debt;
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number()),
				description: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
				dueDate: t.Optional(t.Nullable(t.String())),
				isOwedToMe: t.Optional(t.Boolean()),
				isPaid: t.Optional(t.Boolean()),
				personName: t.Optional(t.String({ maxLength: 100 })),
			}),
			detail: { tags: ["Debts"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Debt", params.id, userId);
			const existing = await queryFirst(
				db.sql.public.Debt.select("id")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("Debt not found", 404);
			}

			await executeStatement(
				db.sql.public.Debt.delete()
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.build(),
			);
			return { success: true };
		},
		{
			detail: { tags: ["Debts"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	);
