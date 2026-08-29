import Elysia, { t } from "elysia";
import { inferMissingFinancialInstitutions } from "~/modules/accounts/application/infer-missing-financial-institutions";
import { resolveFinancialInstitution } from "~/modules/accounts/application/resolve-financial-institution";
import { assertCreditCardBillingDays } from "~/modules/accounts/domain/assert-credit-card-billing-days";
import { assertDirectOwnership, requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, nullableNumeric, queryFirst, queryRows } from "~/shared/infra/sql";

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
			await inferMissingFinancialInstitutions(userId);
			const accounts = await queryRows(
				db.sql.public.FinancialAccount.select(
					"id",
					"userId",
					"name",
					"type",
					"balance",
					"institutionId",
					"createdAt",
					"updatedAt",
				)
					.where((fields, functions) => functions.eq(fields.userId, userId))
					.orderBy("name", { direction: "asc" })
					.build(),
			);
			const institutions = await queryRows(
				db.sql.public.FinancialInstitution.select("id", "name")
					.where((fields, functions) => functions.eq(fields.userId, userId))
					.build(),
			);
			const creditCards = accounts.length
				? await queryRows(
						db.sql.public.CreditCard.select(
							"id",
							"financialAccountId",
							"creditLimit",
							"securityDeposit",
							"excludeFromTotals",
							"statementDay",
							"dueDay",
							"workingDueDate",
							"createdAt",
							"updatedAt",
						)
							.where((fields, functions) =>
								functions.in(
									fields.financialAccountId,
									accounts.map(account => account.id),
								),
							)
							.build(),
					)
				: [];
			const institutionsById = new Map(institutions.map(institution => [institution.id, institution]));
			const creditCardsByAccountId = new Map(
				creditCards.map(creditCard => [creditCard.financialAccountId, creditCard]),
			);
			return accounts.map(account => ({
				...account,
				...(account.type === "CREDIT_CARD" && {
					creditCard: creditCardsByAccountId.get(account.id) ?? null,
				}),
				institution: account.institutionId ? (institutionsById.get(account.institutionId) ?? null) : null,
			}));
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
					"institutionId",
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

			const institution = account.institutionId
				? await queryFirst(
						db.sql.public.FinancialInstitution.select("id", "name")
							.where((fields, functions) =>
								functions.and(
									functions.eq(fields.id, account.institutionId!),
									functions.eq(fields.userId, userId),
								),
							)
							.limit(1)
							.build(),
					)
				: null;

			// If it's a credit card, get the credit card details
			if (account.type === "CREDIT_CARD") {
				const creditCard = await queryFirst(
					db.sql.public.CreditCard.select(
						"id",
						"financialAccountId",
						"creditLimit",
						"securityDeposit",
						"excludeFromTotals",
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

				return { ...account, creditCard, institution };
			}

			return { ...account, institution };
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
			const type = body.type ?? "CHECKING";
			const name = body.name?.trim() || null;
			if (type === "CREDIT_CARD" && !body.creditCard)
				throw new HttpException("Informe os dados do cartão de crédito", 400);
			if (type !== "CREDIT_CARD" && body.creditCard)
				throw new HttpException("Dados de cartão exigem uma conta do tipo cartão de crédito", 400);
			if (body.creditCard) {
				assertCreditCardBillingDays(body.creditCard.statementDay, body.creditCard.dueDay);
			}
			const institution = await resolveFinancialInstitution(userId, body.institutionName);
			const existing = await queryFirst(
				db.sql.public.FinancialAccount.select("id")
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.userId, userId),
							name === null
								? functions.raw`${fields.name} IS NULL`.returns("pg/bool@1")
								: functions.eq(fields.name, name),
							functions.eq(fields.type, type),
							institution
								? functions.eq(fields.institutionId, institution.id)
								: functions.raw`${fields.institutionId} IS NULL`.returns("pg/bool@1"),
						),
					)
					.limit(1)
					.build(),
			);

			if (existing) {
				throw new HttpException("Já existe uma conta desse tipo com este nome", 409);
			}

			const account = await queryFirst(
				db.sql.public.FinancialAccount.insert([
					{
						balance: nullableNumeric<12, 2>(type === "CREDIT_CARD" ? null : (body.balance ?? 0)),
						institutionId: institution?.id,
						// Prisma 8 currently omits null from nullable varchar write types.
						name: name as never,
						type,
						userId,
					},
				])
					.returning("id", "userId", "name", "type", "balance", "institutionId", "createdAt", "updatedAt")
					.build(),
			);
			if (!account) throw new HttpException("FinancialAccount not created", 500);

			// If it's a credit card, create the credit card details
			if (type === "CREDIT_CARD" && body.creditCard) {
				const creditCard = await queryFirst(
					db.sql.public.CreditCard.insert([
						{
							creditLimit: String(body.creditCard.creditLimit),
							dueDay: body.creditCard.dueDay,
							excludeFromTotals: body.creditCard.excludeFromTotals ?? false,
							financialAccountId: account.id,
							...(body.creditCard.securityDeposit !== undefined && {
								securityDeposit: String(body.creditCard.securityDeposit),
							}),
							statementDay: body.creditCard.statementDay,
							workingDueDate: body.creditCard.workingDueDate ?? false,
						},
					])
						.returning(
							"id",
							"financialAccountId",
							"creditLimit",
							"securityDeposit",
							"excludeFromTotals",
							"statementDay",
							"dueDay",
							"workingDueDate",
							"createdAt",
							"updatedAt",
						)
						.build(),
				);
				if (!creditCard) throw new HttpException("CreditCard not created", 500);

				return { ...account, creditCard, institution };
			}

			return { ...account, institution };
		},
		{
			body: t.Object({
				balance: t.Optional(t.Number()),
				creditCard: t.Optional(
					t.Object({
						creditLimit: t.Number({ minimum: 0 }),
						dueDay: t.Number({ maximum: 31, minimum: 1 }),
						excludeFromTotals: t.Optional(t.Boolean()),
						securityDeposit: t.Optional(t.Number({ minimum: 0 })),
						statementDay: t.Number({ maximum: 31, minimum: 1 }),
						workingDueDate: t.Optional(t.Boolean()),
					}),
				),
				institutionName: t.Optional(t.String({ maxLength: 100 })),
				name: t.Optional(t.Union([t.String({ maxLength: 70 }), t.Null()])),
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
				db.sql.public.FinancialAccount.select("id", "institutionId", "name", "type", "userId")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("FinancialAccount not found", 404);
			}
			const institution =
				body.institutionName === undefined
					? existing.institutionId
						? await queryFirst(
								db.sql.public.FinancialInstitution.select("id", "name")
									.where((fields, functions) =>
										functions.and(
											functions.eq(fields.id, existing.institutionId!),
											functions.eq(fields.userId, userId),
										),
									)
									.limit(1)
									.build(),
							)
						: null
					: await resolveFinancialInstitution(userId, body.institutionName);
			const name = body.name === undefined ? existing.name : body.name?.trim() || null;
			if (body.name !== undefined || body.institutionName !== undefined) {
				const duplicate = await queryFirst(
					db.sql.public.FinancialAccount.select("id")
						.where((fields, functions) =>
							functions.and(
								functions.eq(fields.userId, existing.userId),
								name === null
									? functions.raw`${fields.name} IS NULL`.returns("pg/bool@1")
									: functions.eq(fields.name, name),
								functions.eq(fields.type, existing.type),
								institution
									? functions.eq(fields.institutionId, institution.id)
									: functions.raw`${fields.institutionId} IS NULL`.returns("pg/bool@1"),
								functions.raw`${fields.id} <> ${params.id}`.returns("pg/bool@1"),
							),
						)
						.limit(1)
						.build(),
				);
				if (duplicate) throw new HttpException("Já existe uma conta desse tipo com este nome", 409);
			}

			const account = await queryFirst(
				db.sql.public.FinancialAccount.update({
					...(body.institutionName !== undefined && {
						institutionId: (institution?.id ?? null) as never,
					}),
					// Prisma 8 currently omits null from nullable varchar write types.
					...(body.name !== undefined && { name: name as never }),
					...(body.balance !== undefined &&
						existing.type !== "CREDIT_CARD" && {
							balance: String(body.balance),
						}),
					updatedAt: new Date(),
				})
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.returning("id", "userId", "name", "type", "balance", "institutionId", "createdAt", "updatedAt")
					.build(),
			);
			if (!account) throw new HttpException("FinancialAccount not found", 404);

			// Update credit card if provided
			if (body.creditCard && existing.type === "CREDIT_CARD") {
				const existingCreditCard = await queryFirst(
					db.sql.public.CreditCard.select("statementDay", "dueDay")
						.where((fields, functions) => functions.eq(fields.financialAccountId, params.id))
						.limit(1)
						.build(),
				);
				if (!existingCreditCard) throw new HttpException("CreditCard not found", 404);
				assertCreditCardBillingDays(
					body.creditCard.statementDay ?? existingCreditCard.statementDay,
					body.creditCard.dueDay ?? existingCreditCard.dueDay,
				);
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
						...(body.creditCard.excludeFromTotals !== undefined && {
							excludeFromTotals: body.creditCard.excludeFromTotals,
						}),
						...(body.creditCard.workingDueDate !== undefined && {
							workingDueDate: body.creditCard.workingDueDate,
						}),
						...(body.creditCard.securityDeposit !== undefined && {
							securityDeposit: String(body.creditCard.securityDeposit),
						}),
						updatedAt: new Date(),
					})
						.where((fields, functions) => functions.eq(fields.financialAccountId, params.id))
						.returning(
							"id",
							"financialAccountId",
							"creditLimit",
							"securityDeposit",
							"excludeFromTotals",
							"statementDay",
							"dueDay",
							"workingDueDate",
							"createdAt",
							"updatedAt",
						)
						.build(),
				);
				if (!creditCard) throw new HttpException("CreditCard not found", 404);

				return { ...account, creditCard, institution };
			}

			return { ...account, institution };
		},
		{
			body: t.Object({
				balance: t.Optional(t.Number()),
				creditCard: t.Optional(
					t.Object({
						creditLimit: t.Optional(t.Number({ minimum: 0 })),
						dueDay: t.Optional(t.Number({ maximum: 31, minimum: 1 })),
						excludeFromTotals: t.Optional(t.Boolean()),
						securityDeposit: t.Optional(t.Number({ minimum: 0 })),
						statementDay: t.Optional(t.Number({ maximum: 31, minimum: 1 })),
						workingDueDate: t.Optional(t.Boolean()),
					}),
				),
				institutionName: t.Optional(t.String({ maxLength: 100 })),
				name: t.Optional(t.Union([t.String({ maxLength: 70 }), t.Null()])),
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
