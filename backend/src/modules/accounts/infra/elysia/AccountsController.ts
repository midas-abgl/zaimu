import Elysia, { t } from "elysia";
import { assertDirectOwnership, requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, queryFirst, queryRows } from "~/shared/infra/sql";

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
			const accounts = await queryRows(
				db.sql.public.FinancialAccount.select(
					"id",
					"userId",
					"name",
					"type",
					"balance",
					"createdAt",
					"updatedAt",
				)
					.where((fields, functions) => functions.eq(fields.userId, userId))
					.orderBy("name", { direction: "asc" })
					.build(),
			);
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
			const account = await queryFirst(
				db.sql.public.FinancialAccount.select(
					"id",
					"userId",
					"name",
					"type",
					"balance",
					"createdAt",
					"updatedAt",
				)
					.where((fields, functions) =>
						functions.and(functions.eq(fields.id, params.id), functions.eq(fields.userId, userId)),
					)
					.limit(1)
					.build(),
			);

			if (!account) {
				throw new HttpException("FinancialAccount not found", 404);
			}

			// If it's a credit card, get the credit card details
			if (account.type === "CREDIT_CARD") {
				const creditCard = await queryFirst(
					db.sql.public.CreditCard.select(
						"id",
						"financialAccountId",
						"creditLimit",
						"statementDay",
						"dueDay",
						"workingDueDate",
						"createdAt",
						"updatedAt",
					)
						.where((fields, functions) => functions.eq(fields.financialAccountId, account.id))
						.limit(1)
						.build(),
				);

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
			const existing = await queryFirst(
				db.sql.public.FinancialAccount.select("id")
					.where((fields, functions) =>
						functions.and(functions.eq(fields.userId, userId), functions.eq(fields.name, body.name)),
					)
					.limit(1)
					.build(),
			);

			if (existing) {
				throw new HttpException("FinancialAccount with this name already exists", 409);
			}

			const account = await queryFirst(
				db.sql.public.FinancialAccount.insert([
					{
						balance: String(body.balance ?? 0),
						name: body.name,
						type: body.type ?? "CHECKING",
						userId,
					},
				])
					.returning("id", "userId", "name", "type", "balance", "createdAt", "updatedAt")
					.build(),
			);
			if (!account) throw new HttpException("FinancialAccount not created", 500);

			// If it's a credit card, create the credit card details
			if (body.type === "CREDIT_CARD" && body.creditCard) {
				const creditCard = await queryFirst(
					db.sql.public.CreditCard.insert([
						{
							creditLimit: String(body.creditCard.creditLimit),
							dueDay: body.creditCard.dueDay,
							financialAccountId: account.id,
							statementDay: body.creditCard.statementDay,
							workingDueDate: body.creditCard.workingDueDate ?? false,
						},
					])
						.returning(
							"id",
							"financialAccountId",
							"creditLimit",
							"statementDay",
							"dueDay",
							"workingDueDate",
							"createdAt",
							"updatedAt",
						)
						.build(),
				);
				if (!creditCard) throw new HttpException("CreditCard not created", 500);

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
			const existing = await queryFirst(
				db.sql.public.FinancialAccount.select("id", "type")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("FinancialAccount not found", 404);
			}

			const account = await queryFirst(
				db.sql.public.FinancialAccount.update({
					...(body.name && { name: body.name }),
					...(body.balance !== undefined && { balance: String(body.balance) }),
					updatedAt: new Date(),
				})
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.returning("id", "userId", "name", "type", "balance", "createdAt", "updatedAt")
					.build(),
			);
			if (!account) throw new HttpException("FinancialAccount not found", 404);

			// Update credit card if provided
			if (body.creditCard && existing.type === "CREDIT_CARD") {
				const creditCard = await queryFirst(
					db.sql.public.CreditCard.update({
						...(body.creditCard.creditLimit !== undefined && {
							creditLimit: String(body.creditCard.creditLimit),
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
						.where((fields, functions) => functions.eq(fields.financialAccountId, params.id))
						.returning(
							"id",
							"financialAccountId",
							"creditLimit",
							"statementDay",
							"dueDay",
							"workingDueDate",
							"createdAt",
							"updatedAt",
						)
						.build(),
				);
				if (!creditCard) throw new HttpException("CreditCard not found", 404);

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
			const existing = await queryFirst(
				db.sql.public.FinancialAccount.select("id")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("FinancialAccount not found", 404);
			}

			await executeStatement(
				db.sql.public.FinancialAccount.delete()
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.build(),
			);
			return { success: true };
		},
		{
			detail: { tags: ["Accounts"] },
			params: t.Object({
				id: Id,
			}),
		},
	);
