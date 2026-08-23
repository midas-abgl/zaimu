import Elysia, { t } from "elysia";
import { assertDirectOwnership, requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

const Id = t.String({ maxLength: 36, minLength: 1 });
const FinancialAccountType = t.Union([
	t.Literal("CHECKING"),
	t.Literal("SAVINGS"),
	t.Literal("INVESTMENT"),
	t.Literal("CASH"),
	t.Literal("CREDIT_CARD"),
]);

export const AccountsController = new Elysia({ prefix: "/financial-accounts" })
	.get(
		"/",
		async ({ request }) => {
			const userId = await requireUserId(request);
			const accounts = await db
				.selectFrom("FinancialAccount")
				.selectAll()
				.where("userId", "=", userId)
				.orderBy("name", "asc")
				.execute();
			return accounts;
		},
		{
			detail: { tags: ["Accounts"] },
		},
	)
	.get(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			const account = await db
				.selectFrom("FinancialAccount")
				.where("id", "=", params.id)
				.where("userId", "=", userId)
				.selectAll()
				.executeTakeFirst();

			if (!account) {
				throw new HttpException("FinancialAccount not found", 404);
			}

			// If it's a credit card, get the credit card details
			if (account.type === "CREDIT_CARD") {
				const creditCard = await db
					.selectFrom("CreditCard")
					.where("financialAccountId", "=", account.id)
					.selectAll()
					.executeTakeFirst();

				return { ...account, creditCard };
			}

			return account;
		},
		{
			detail: { tags: ["Accounts"] },
			params: t.Object({
				id: Id,
			}),
		},
	)
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			const existing = await db
				.selectFrom("FinancialAccount")
				.where("userId", "=", userId)
				.where("name", "=", body.name)
				.selectAll()
				.executeTakeFirst();

			if (existing) {
				throw new HttpException("FinancialAccount with this name already exists", 409);
			}

			const account = await db
				.insertInto("FinancialAccount")
				.values({
					balance: body.balance ?? 0,
					name: body.name,
					type: body.type ?? "CHECKING",
					userId,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// If it's a credit card, create the credit card details
			if (body.type === "CREDIT_CARD" && body.creditCard) {
				const creditCard = await db
					.insertInto("CreditCard")
					.values({
						creditLimit: body.creditCard.creditLimit,
						dueDay: body.creditCard.dueDay,
						financialAccountId: account.id,
						statementDay: body.creditCard.statementDay,
						workingDueDate: body.creditCard.workingDueDate ?? false,
					})
					.returningAll()
					.executeTakeFirstOrThrow();

				return { ...account, creditCard };
			}

			return account;
		},
		{
			body: t.Object({
				balance: t.Optional(t.Number()),
				creditCard: t.Optional(
					t.Object({
						creditLimit: t.Number(),
						dueDay: t.Number({ maximum: 31, minimum: 1 }),
						statementDay: t.Number({ maximum: 31, minimum: 1 }),
						workingDueDate: t.Optional(t.Boolean()),
					}),
				),
				name: t.String({ maxLength: 70 }),
				type: t.Optional(FinancialAccountType),
			}),
			detail: { tags: ["Accounts"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("FinancialAccount", params.id, userId);
			const existing = await db
				.selectFrom("FinancialAccount")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("FinancialAccount not found", 404);
			}

			const account = await db
				.updateTable("FinancialAccount")
				.set({
					...(body.name && { name: body.name }),
					...(body.balance !== undefined && { balance: body.balance }),
					updatedAt: new Date(),
				})
				.where("id", "=", params.id)
				.returningAll()
				.executeTakeFirstOrThrow();

			// Update credit card if provided
			if (body.creditCard && existing.type === "CREDIT_CARD") {
				const creditCard = await db
					.updateTable("CreditCard")
					.set({
						...(body.creditCard.creditLimit !== undefined && {
							creditLimit: body.creditCard.creditLimit,
						}),
						...(body.creditCard.statementDay !== undefined && {
							statementDay: body.creditCard.statementDay,
						}),
						...(body.creditCard.dueDay !== undefined && {
							dueDay: body.creditCard.dueDay,
						}),
						...(body.creditCard.workingDueDate !== undefined && {
							workingDueDate: body.creditCard.workingDueDate,
						}),
						updatedAt: new Date(),
					})
					.where("financialAccountId", "=", params.id)
					.returningAll()
					.executeTakeFirstOrThrow();

				return { ...account, creditCard };
			}

			return account;
		},
		{
			body: t.Object({
				balance: t.Optional(t.Number()),
				creditCard: t.Optional(
					t.Object({
						creditLimit: t.Optional(t.Number()),
						dueDay: t.Optional(t.Number({ maximum: 31, minimum: 1 })),
						statementDay: t.Optional(t.Number({ maximum: 31, minimum: 1 })),
						workingDueDate: t.Optional(t.Boolean()),
					}),
				),
				name: t.Optional(t.String({ maxLength: 70 })),
			}),
			detail: { tags: ["Accounts"] },
			params: t.Object({
				id: Id,
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("FinancialAccount", params.id, userId);
			const existing = await db
				.selectFrom("FinancialAccount")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("FinancialAccount not found", 404);
			}

			await db.deleteFrom("FinancialAccount").where("id", "=", params.id).execute();
			return { success: true };
		},
		{
			detail: { tags: ["Accounts"] },
			params: t.Object({
				id: Id,
			}),
		},
	);
