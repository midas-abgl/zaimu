import { addMonths } from "date-fns";
import Elysia, { t } from "elysia";
import { assertCreditCardOwnership, assertDirectOwnership, requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, numeric, param, queryFirst, queryRows } from "~/shared/infra/sql";

const statementColumns = [
	"id",
	"creditCardId",
	"statementDate",
	"dueDate",
	"totalAmount",
	"paidAmount",
	"isPaid",
	"createdAt",
	"updatedAt",
] as const;
const purchaseColumns = [
	"id",
	"statementId",
	"description",
	"totalAmount",
	"installments",
	"currentInstallment",
	"installmentAmount",
	"purchaseDate",
	"categoryId",
	"parentId",
	"createdAt",
	"updatedAt",
] as const;
interface CreditPurchaseRow {
	id: string;
	statementId: string;
	description: string;
	totalAmount: number;
	installments: number;
	currentInstallment: number;
	installmentAmount: number;
	purchaseDate: Date;
	categoryId: string | null;
	parentId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export const CreditCardsController = new Elysia({ prefix: "/credit-cards" })
	.get(
		"/",
		async ({ request }) => {
			const userId = await requireUserId(request);
			const cards = await queryRows(
				db.sql.public.CreditCard.innerJoin(db.sql.public.FinancialAccount, (fields, functions) =>
					functions.eq(fields.CreditCard.financialAccountId, fields.FinancialAccount.id),
				)
					.select(fields => ({
						accountName: fields.FinancialAccount.name,
						createdAt: fields.CreditCard.createdAt,
						creditLimit: fields.CreditCard.creditLimit,
						dueDay: fields.CreditCard.dueDay,
						financialAccountId: fields.CreditCard.financialAccountId,
						id: fields.CreditCard.id,
						statementDay: fields.CreditCard.statementDay,
						workingDueDate: fields.CreditCard.workingDueDate,
					}))
					.where((fields, functions) => functions.eq(fields.FinancialAccount.userId, userId))
					.orderBy(fields => fields.FinancialAccount.name, { direction: "asc" })
					.build(),
			);
			return cards;
		},
		{
			detail: { tags: ["Credit Cards"] },
		},
	)
	.get(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const card = await queryFirst(
				db.sql.public.CreditCard.innerJoin(db.sql.public.FinancialAccount, (fields, functions) =>
					functions.eq(fields.CreditCard.financialAccountId, fields.FinancialAccount.id),
				)
					.select(fields => ({
						accountName: fields.FinancialAccount.name,
						createdAt: fields.CreditCard.createdAt,
						creditLimit: fields.CreditCard.creditLimit,
						dueDay: fields.CreditCard.dueDay,
						financialAccountId: fields.CreditCard.financialAccountId,
						id: fields.CreditCard.id,
						statementDay: fields.CreditCard.statementDay,
						workingDueDate: fields.CreditCard.workingDueDate,
					}))
					.where((fields, functions) => functions.eq(fields.CreditCard.id, params.id))
					.limit(1)
					.build(),
			);

			if (!card) {
				throw new HttpException("Credit card not found", 404);
			}

			return card;
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/statements",
		async ({ params, query, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			let queryBuilder = db.sql.public.CreditCardStatement.select(...statementColumns).where(
				(fields, functions) => functions.eq(fields.creditCardId, params.id),
			);

			if (query.isPaid !== undefined) {
				queryBuilder = queryBuilder.where((fields, functions) => functions.eq(fields.isPaid, query.isPaid!));
			}

			const statements = await queryRows(
				queryBuilder.orderBy("statementDate", { direction: "desc" }).build(),
			);
			return statements;
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
			query: t.Object({
				isPaid: t.Optional(t.Boolean()),
			}),
		},
	)
	.get(
		"/:id/statements/:statementId",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const statement = await queryFirst(
				db.sql.public.CreditCardStatement.select(...statementColumns)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.id, params.statementId),
							functions.eq(fields.creditCardId, params.id),
						),
					)
					.limit(1)
					.build(),
			);

			if (!statement) {
				throw new HttpException("Statement not found", 404);
			}

			const purchases = await queryRows(
				db.sql.public.CreditPurchase.outerLeftJoin(db.sql.public.Category, (fields, functions) =>
					functions.eq(fields.CreditPurchase.categoryId, fields.Category.id),
				)
					.select(fields => ({
						categoryColor: fields.Category.color,
						categoryName: fields.Category.name,
						createdAt: fields.CreditPurchase.createdAt,
						currentInstallment: fields.CreditPurchase.currentInstallment,
						description: fields.CreditPurchase.description,
						id: fields.CreditPurchase.id,
						installmentAmount: fields.CreditPurchase.installmentAmount,
						installments: fields.CreditPurchase.installments,
						purchaseDate: fields.CreditPurchase.purchaseDate,
						totalAmount: fields.CreditPurchase.totalAmount,
					}))
					.where((fields, functions) => functions.eq(fields.CreditPurchase.statementId, params.statementId))
					.orderBy(fields => fields.CreditPurchase.purchaseDate, { direction: "desc" })
					.build(),
			);

			return { ...statement, purchases };
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
				statementId: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/:id/purchases",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			if (body.categoryId) await assertDirectOwnership("Category", body.categoryId, userId);
			const card = await queryFirst(
				db.sql.public.CreditCard.select("id", "statementDay", "dueDay")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!card) {
				throw new HttpException("Credit card not found", 404);
			}

			const purchaseDate = new Date(body.purchaseDate);
			const installments = body.installments ?? 1;
			const installmentAmount = body.totalAmount / installments;

			// Create purchases for each installment
			const createdPurchases: CreditPurchaseRow[] = [];

			for (let i = 0; i < installments; i++) {
				// Calculate which statement this installment belongs to
				const installmentDate = addMonths(purchaseDate, i);
				let statementMonth = installmentDate;

				// If purchase is after statement day, it goes to next month's statement
				if (installmentDate.getDate() > card.statementDay) {
					statementMonth = addMonths(installmentDate, 1);
				}

				const statementDate = new Date(
					statementMonth.getFullYear(),
					statementMonth.getMonth(),
					card.statementDay,
				);

				const dueDate = new Date(statementMonth.getFullYear(), statementMonth.getMonth(), card.dueDay);

				// Adjust due date if it's before statement date
				if (dueDate <= statementDate) {
					dueDate.setMonth(dueDate.getMonth() + 1);
				}

				// Get or create statement
				let statement = await queryFirst(
					db.sql.public.CreditCardStatement.select(...statementColumns)
						.where((fields, functions) =>
							functions.and(
								functions.eq(fields.creditCardId, params.id),
								functions.eq(fields.statementDate, statementDate),
							),
						)
						.limit(1)
						.build(),
				);

				if (!statement) {
					statement = await queryFirst(
						db.sql.public.CreditCardStatement.insert([
							{
								creditCardId: params.id,
								dueDate,
								statementDate,
								totalAmount: "0",
							},
						])
							.returning(...statementColumns)
							.build(),
					);
					if (!statement) throw new HttpException("Statement not created", 500);
				}

				// Create purchase
				const purchase = await queryFirst(
					db.sql.public.CreditPurchase.insert([
						{
							categoryId: body.categoryId,
							currentInstallment: i + 1,
							description: body.description,
							installmentAmount: String(installmentAmount),
							installments,
							parentId: createdPurchases[0]?.id,
							purchaseDate,
							statementId: statement.id,
							totalAmount: String(body.totalAmount),
						},
					])
						.returning(...purchaseColumns)
						.build(),
				);
				if (!purchase) throw new HttpException("Purchase not created", 500);

				createdPurchases.push(purchase);

				// Update statement total
				const amount = param(numeric<12, 2>(installmentAmount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.CreditCardStatement.update((fields, functions) => ({
						totalAmount: functions.raw`${fields.totalAmount} + ${amount}`.returns("pg/numeric@1"),
						updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((fields, functions) => functions.eq(fields.id, statement.id))
						.build(),
				);
			}

			return createdPurchases;
		},
		{
			body: t.Object({
				categoryId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				description: t.String({ maxLength: 500 }),
				installments: t.Optional(t.Number({ maximum: 48, minimum: 1 })),
				purchaseDate: t.String(),
				totalAmount: t.Number(),
			}),
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/:id/statements/:statementId/pay",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			if (body.financialAccountId) {
				await assertDirectOwnership("FinancialAccount", body.financialAccountId, userId);
			}
			const statement = await queryFirst(
				db.sql.public.CreditCardStatement.select(...statementColumns)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.id, params.statementId),
							functions.eq(fields.creditCardId, params.id),
						),
					)
					.limit(1)
					.build(),
			);

			if (!statement) {
				throw new HttpException("Statement not found", 404);
			}

			const paymentAmount = body.amount ?? Number(statement.totalAmount) - Number(statement.paidAmount);

			const amount = param(numeric<12, 2>(paymentAmount), { codecId: "pg/numeric@1" });
			const isPaid = Number(statement.paidAmount) + paymentAmount >= Number(statement.totalAmount);
			const updatedStatement = await queryFirst(
				db.sql.public.CreditCardStatement.update((fields, functions) => ({
					isPaid: functions.raw`${isPaid}`.returns("pg/bool@1"),
					paidAmount: functions.raw`${fields.paidAmount} + ${amount}`.returns("pg/numeric@1"),
					updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
				}))
					.where((fields, functions) => functions.eq(fields.id, params.statementId))
					.returning(...statementColumns)
					.build(),
			);
			if (!updatedStatement) throw new HttpException("Statement not found", 404);

			// Deduct from account if provided
			if (body.financialAccountId) {
				await executeStatement(
					db.sql.public.FinancialAccount.update((fields, functions) => ({
						balance: functions.raw`${fields.balance} - ${amount}`.returns("pg/numeric@1"),
						updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((fields, functions) => functions.eq(fields.id, body.financialAccountId!))
						.build(),
				);
			}

			return updatedStatement;
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number()),
				financialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
			}),
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
				statementId: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const history = await queryRows(
				db.sql.public.CreditCardHistory.select(
					"id",
					"creditCardId",
					"field",
					"oldValue",
					"newValue",
					"changedAt",
				)
					.where((fields, functions) => functions.eq(fields.creditCardId, params.id))
					.orderBy("changedAt", { direction: "desc" })
					.build(),
			);

			return history;
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	);
