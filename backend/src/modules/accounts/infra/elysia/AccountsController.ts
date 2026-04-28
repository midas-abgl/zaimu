import Elysia, { t } from "elysia";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

const AccountType = t.Union([
	t.Literal("CHECKING"),
	t.Literal("SAVINGS"),
	t.Literal("INVESTMENT"),
	t.Literal("CASH"),
	t.Literal("CREDIT_CARD"),
]);

export const AccountsController = new Elysia({ prefix: "/accounts" })
	.get(
		"/",
		async ({ query }) => {
			let queryBuilder = db.selectFrom("Account").selectAll();

			if (query.userId) {
				queryBuilder = queryBuilder.where("userId", "=", query.userId);
			}

			const accounts = await queryBuilder.orderBy("name", "asc").execute();
			return accounts;
		},
		{
			detail: { tags: ["Accounts"] },
			query: t.Object({
				userId: t.Optional(t.String({ format: "uuid" })),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const account = await db
				.selectFrom("Account")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!account) {
				throw new HttpException("Account not found", 404);
			}

			// If it's a credit card, get the credit card details
			if (account.type === "CREDIT_CARD") {
				const creditCard = await db
					.selectFrom("CreditCard")
					.where("accountId", "=", account.id)
					.selectAll()
					.executeTakeFirst();

				return { ...account, creditCard };
			}

			return account;
		},
		{
			detail: { tags: ["Accounts"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.post(
		"/",
		async ({ body }) => {
			const existing = await db
				.selectFrom("Account")
				.where("userId", "=", body.userId)
				.where("name", "=", body.name)
				.selectAll()
				.executeTakeFirst();

			if (existing) {
				throw new HttpException("Account with this name already exists", 409);
			}

			const account = await db
				.insertInto("Account")
				.values({
					balance: body.balance ?? 0,
					name: body.name,
					type: body.type ?? "CHECKING",
					userId: body.userId,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// If it's a credit card, create the credit card details
			if (body.type === "CREDIT_CARD" && body.creditCard) {
				const creditCard = await db
					.insertInto("CreditCard")
					.values({
						accountId: account.id,
						creditLimit: body.creditCard.creditLimit,
						dueDay: body.creditCard.dueDay,
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
				type: t.Optional(AccountType),
				userId: t.String({ format: "uuid" }),
			}),
			detail: { tags: ["Accounts"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const existing = await db
				.selectFrom("Account")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Account not found", 404);
			}

			const account = await db
				.updateTable("Account")
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
					.where("accountId", "=", params.id)
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
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const existing = await db
				.selectFrom("Account")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Account not found", 404);
			}

			await db.deleteFrom("Account").where("id", "=", params.id).execute();
			return { success: true };
		},
		{
			detail: { tags: ["Accounts"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	);
